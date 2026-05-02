import { WebSocket, WebSocketServer } from "ws";
import { config } from "../config/index.js";
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";
import { chargerRegistry } from "./chargerRegistry.js";
import { handleOcppMessage } from "./messageHandlers.js";
import { triggerMessage } from "./remoteControl.js";
import { redisPublisher } from "../config/redis.js";
import { pendingRequests } from "./remoteControl.js";

class OcppServer {
  private wss: WebSocketServer | null = null;

  start(): void {
    this.wss = new WebSocketServer({
      port: config.ocppPort,
      handleProtocols: (protocols, request) => {
        if (protocols.has("ocpp2.1")) return "ocpp2.1";
        if (protocols.has("ocpp2.0.1")) return "ocpp2.0.1";
        if (protocols.has("ocpp1.6")) return "ocpp1.6";
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
    });
  }

  private async handleConnection(ws: WebSocket, request: any): Promise<void> {
    try {
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
        ws.close();
        return;
      }

      const chargerId = charger.charger_id;
      if (charger.status === "disabled") {
        logger.error(`Charger ${chargerId} is disabled`);
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

      ws.on("message", async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          // Log incoming message
          logger.info(`📩 [OCPP IN] Charger ${chargerId} [${ws.protocol}]: ${JSON.stringify(message)}`);
          await this.handleOcppMessage(chargerId, message, ws.protocol);
        } catch (error) {
          logger.error(`Error parsing OCPP message: ${error}`);
        }
      });

      ws.on("close", () => {
        logger.info(`Charger ${charger.name} (ID: ${chargerId}) disconnected`);
        chargerRegistry.unregister(chargerId);

        // Update charger status to offline and all its connectors to Unavailable
        Promise.all([
          prisma.charger.update({
            where: { charger_id: chargerId },
            data: { status: "offline" },
          }),
          prisma.connector.updateMany({
            where: { charger_id: chargerId },
            data: { status: "Unavailable", updatedAt: new Date() },
          })
        ]).catch((err) => logger.error(`Error updating charger/connector status on disconnect: ${err}`));
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
      logger.error(
        `🔌 [OCPP] Received CALLERROR from charger ${chargerId}, MessageID: ${messageId}: ${errorCode} - ${errorDescription}`
      );
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
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      logger.info("OCPP server stopped");
    }
  }
}

// Singleton instance
export const ocppServer = new OcppServer();
