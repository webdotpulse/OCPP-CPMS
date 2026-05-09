import { WebSocket, WebSocketServer } from "ws";
import { config } from "../config/index.js";
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";
import { chargerRegistry } from "./chargerRegistry.js";
import { handleOcppMessage } from "./messageHandlers.js";
import { triggerMessage } from "./remoteControl.js";
import { redisPublisher } from "../config/redis.js";
import { pendingRequests } from "./remoteControl.js";
import { proxyRouter } from "./proxyRouter.js";

class OcppServer {
  private wss: WebSocketServer | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  start(): void {
    this.wss = new WebSocketServer({
      port: config.ocppPort,
      handleProtocols: (protocols, request) => {
        if (protocols.has("ocpp2.1")) return "ocpp2.1";
        if (protocols.has("ocpp2.0.1")) return "ocpp2.0.1";
        if (protocols.has("ocpp1.6")) return "ocpp1.6";
        // If the client didn't send a protocol or sent an empty string, fallback to ocpp1.6
        // Returning false would reject the connection for clients not sending the header.
        if (protocols.size === 0) return "ocpp1.6";
        return false;
      },
    });

    this.wss.on("listening", () => {
      logger.info(`OCPP server listening on port ${config.ocppPort}`);
    });

    this.wss.on("connection", this.handleConnection.bind(this));

    this.wss.on("error", (error) => {
      logger.error(`OCPP WebSocket error: ${error}`);
    });

    this.wss.on("close", () => {
      logger.info("OCPP WebSocket server closed");
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
    });

    // Start Ping/Pong interval
    this.pingInterval = setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((ws: WebSocket) => {
        const extWs = ws as WebSocket & { isAlive: boolean };
        if (extWs.isAlive === false) {
          logger.warn("Terminating dead WebSocket connection");
          return ws.terminate();
        }
        extWs.isAlive = false;
        ws.ping();
      });
    }, config.websocketPingInterval * 1000);
  }

  private async handleConnection(ws: WebSocket, request: any): Promise<void> {
    try {
      const extWs = ws as WebSocket & { isAlive: boolean };
      extWs.isAlive = true;

      ws.on("pong", () => {
        extWs.isAlive = true;
      });

      // Extract charger ID from URL path: /{chargerId}
      const pathParts = request.url?.split("?")[0].split("/").filter(Boolean);
      const chargerIdStr = pathParts?.[pathParts.length - 1];

      if (!chargerIdStr) {
        logger.error("No charger ID in connection path");
        ws.close();
        return;
      }

      const chargerIdNum = Number(chargerIdStr);
      const isNumericId = Number.isInteger(chargerIdNum) && chargerIdStr.trim() !== "";

      // Verify charger exists in database by numeric ID or name
      const charger = await prisma.charger.findUnique({
        where: isNumericId ? { charger_id: chargerIdNum } : { name: chargerIdStr },
      });

      if (!charger) {
        logger.error(`Charger ${chargerIdStr} not found in database`);
        // Log unrecognized connection
        await prisma.unrecognizedConnection.create({
          data: {
            chargePointId: chargerIdStr,
            ipAddress: request.socket.remoteAddress || "Unknown",
            reason: "Charger not found in database",
          },
        }).catch((err: any) => logger.error(`Failed to log unrecognized connection: ${err}`));

        ws.close();
        return;
      }

      const chargerId = charger.charger_id;
      if (charger.status === "disabled") {
        logger.error(`Charger ${chargerId} is disabled`);
        // Log unrecognized connection
        await prisma.unrecognizedConnection.create({
          data: {
            chargePointId: chargerIdStr,
            ipAddress: request.socket.remoteAddress || "Unknown",
            reason: "Charger is disabled",
          },
        }).catch((err: any) => logger.error(`Failed to log unrecognized connection: ${err}`));

        ws.close();
        return;
      }

      logger.info(`New connection from charger ${charger.name} (ID: ${chargerId})`);

      // Update charger status to active in database
      await prisma.charger.update({
        where: { charger_id: chargerId },
        data: { status: "active", last_heartbeat: new Date() },
      });

      // Trigger BootNotification if hardware details are missing
      if (charger.firmware_version === "Unknown" || !charger.manufacturer || !charger.model) {
        logger.info(`Charger ${chargerId} is missing hardware details. Triggering BootNotification in 5s...`);
        setTimeout(async () => {
          try {
            await triggerMessage(chargerId, "BootNotification");
          } catch (e) {
            logger.error(`Failed to trigger BootNotification for charger ${chargerId}: ${e}`);
          }
        }, 5000);
      }

      // Register charger connection
      chargerRegistry.register(chargerId, charger.name, ws);

      if (charger.thirdPartyBackendUrl) {
        let thirdPartyUrl = charger.thirdPartyBackendUrl;
        if (thirdPartyUrl && !thirdPartyUrl.endsWith(charger.name)) {
            thirdPartyUrl = thirdPartyUrl.endsWith('/') ? thirdPartyUrl + charger.name : thirdPartyUrl + '/' + charger.name;
        }
        proxyRouter.setupProxy(chargerId, thirdPartyUrl, ws.protocol);
      }

      ws.on("message", async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          // Log incoming message
          logger.info(`📩 [OCPP IN] Charger ${chargerId} [${ws.protocol}]: ${JSON.stringify(message)}`);

          if (proxyRouter.hasProxy(chargerId)) {
            await proxyRouter.handleMessageFromCharger(chargerId, message, ws.protocol);
          } else {
            await this.handleOcppMessage(chargerId, message, ws.protocol);
          }
        } catch (error) {
          logger.error(`Error parsing OCPP message: ${error}`);
        }
      });

      ws.on("close", () => {
        // Prevent race condition: if the active connection in the registry isn't this closing websocket,
        // it means the charger quickly reconnected with a new socket. Do not mark as offline.
        const currentConnection = chargerRegistry.getConnection(chargerId);
        if (currentConnection && currentConnection.ws !== ws) {
          logger.info(`Charger ${charger.name} (ID: ${chargerId}) disconnected (stale connection ignored)`);
          return;
        }

        proxyRouter.removeProxy(chargerId);
        logger.info(`Charger ${charger.name} (ID: ${chargerId}) disconnected`);
        chargerRegistry.unregister(chargerId).then(async () => {
          // Verify it is truly offline before marking offline in DB (might have reconnected elsewhere)
          if (!(await chargerRegistry.isConnectedGlobally(chargerId))) {
            // Update charger status to offline and all its connectors to Unavailable
            Promise.all([
              prisma.charger.update({
                where: { charger_id: chargerId },
                data: { status: "offline" },
              }),
              prisma.connector.updateMany({
                where: { evse: { charger_id: chargerId } },
                data: { status: "Unavailable", updatedAt: new Date() },
              })
            ]).catch((err) => logger.error(`Error updating charger/connector status on disconnect: ${err}`));

            redisPublisher.publish("charger_status_updates", JSON.stringify({ chargerId }));
          }
        }).catch(err => logger.error(`Error during unregister: ${err}`));
      });

      ws.on("error", (error) => {
        logger.error(`WebSocket error for charger ${chargerId}: ${error}`);
      });
    } catch (error) {
      logger.error(`Error handling connection: ${error}`);
      ws.close();
    }
  }

  private async handleOcppMessage(
    chargerId: number,
    message: any,
    protocol: string
  ): Promise<void> {
    // OCPP 1.6 message formats:
    //   CALL:       [2, messageId, actionName, payload]
    //   CALLRESULT: [3, messageId, payload]
    //   CALLERROR:  [4, messageId, errorCode, errorDescription, errorDetails]
    const messageType = message[0];
    const messageId = message[1];

    // Handle CALLRESULT (type 3) - response from charger to our requests
    if (messageType === 3) {
      const responsePayload = message[2];
      logger.info(
        `🔌 [OCPP] Received CALLRESULT from charger ${chargerId}, MessageID: ${messageId}: ${JSON.stringify(responsePayload)}`
      );

      // Check local pending requests first
      const pending = pendingRequests.get(messageId);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.resolve(responsePayload);
        pendingRequests.delete(messageId);
      } else {
        // Publish to Redis for cross-cluster resolution
        redisPublisher.publish("ocpp_callresults", JSON.stringify({ messageId, payload: responsePayload }));
      }
      return;
    }

    // Handle CALLERROR (type 4) - error response from charger
    if (messageType === 4) {
      const [, , errorCode, errorDescription, errorDetails] = message;

      let subCodeInfo = "";
      if (errorDetails && typeof errorDetails === 'object' && errorDetails.SubCode) {
        subCodeInfo = ` (SubCode: ${errorDetails.SubCode})`;
      }

      logger.error(
        `🔌 [OCPP] Received CALLERROR from charger ${chargerId}, MessageID: ${messageId}: ${errorCode}${subCodeInfo} - ${errorDescription}`
      );

      const pending = pendingRequests.get(messageId);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.reject(new Error(`[${errorCode}${subCodeInfo}] ${errorDescription} - ${JSON.stringify(errorDetails || {})}`));
        pendingRequests.delete(messageId);
      }
      return;
    }

    // Handle CALL (type 2) - request from charger
    const actionName = message[2];
    const payload = message[3];

    const actionDisplayName = actionName || "Unknown";
    logger.info(
      `🔌 [OCPP] Received ${actionDisplayName} from charger ${chargerId}, MessageID: ${messageId}`
    );

    try {
      const responsePayload = await handleOcppMessage(
        chargerId,
        messageType,
        messageId,
        actionName,
        payload,
        protocol
      );

      // Send CALLRESULT: [3, messageId, responsePayload]
      const response = [3, messageId, responsePayload];

      // Log outgoing response
      logger.info(`📤 [OCPP OUT] ${actionName}Response to charger ${chargerId}, MessageID: ${messageId}: ${JSON.stringify(response)}`);

      const connection = chargerRegistry.getConnection(chargerId);
      if (connection?.ws) {
        connection.ws.send(JSON.stringify(response));
      }
    } catch (error) {
      logger.error(`Error handling OCPP message: ${error}`);
    }
  }

  stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      logger.info("OCPP server stopped");
    }
  }
}

// Singleton instance
export const ocppServer = new OcppServer();
