import { prisma } from "../config/database.js";
import { chargerRegistry } from "./chargerRegistry.js";
import { logger } from "../utils/logger.js";
import type { OcppDirection } from "../types/index.js";
import { redisPublisher } from "../config/redis.js";
import { handleOcppMessage16 } from "./handlers/v16Handlers.js";
import { handleOcppMessage21 } from "./handlers/v21Handlers.js";

/**
 * Log OCPP message to database and broadcast live via Redis pub/sub
 */
export async function logOcppMessage(
  chargerId: number,
  direction: OcppDirection,
  message: any,
  transactionId?: string | number
): Promise<void> {
  try {
    const newLog = await prisma.ocppLog.create({
      data: {
        chargerId,
        direction,
        message: JSON.stringify(message ?? {}),
        transactionId: transactionId ? String(transactionId) : null,
      },
      include: { charger: true },
    });
    
    // Publish log to Redis cluster to be picked up by any connected log WebSockets
    await redisPublisher.publish("ocpp_logs", JSON.stringify(newLog));
  } catch (error) {
    logger.error(`Failed to log OCPP message: ${error}`);
  }
}

/**
 * Main message router - dispatch to appropriate handler
 */
export async function handleOcppMessage(
  chargerId: number,
  messageType: number,
  messageId: string,
  actionName: string,
  payload: any,
  protocol: string = "ocpp1.6"
): Promise<any> {
  await logOcppMessage(chargerId, "in", [messageType, messageId, actionName, payload]);

  // Update registry heartbeat on any incoming message
  await chargerRegistry.updateHeartbeat(chargerId);

  let response: any;

  if (protocol === "ocpp2.1" || protocol === "ocpp2.0.1") {
    response = await handleOcppMessage21(chargerId, actionName, payload, protocol);
  } else {
    response = await handleOcppMessage16(chargerId, actionName, payload, protocol);
  }

  // Publish charger status updates for real-time frontend
  if (messageType === 2 && ["BootNotification", "StatusNotification", "StartTransaction", "StopTransaction", "Heartbeat"].includes(actionName)) {
    redisPublisher.publish("charger_status_updates", JSON.stringify({ chargerId }));
  }

  logger.debug(`Response for action ${actionName}: ${JSON.stringify(response)}`);
  return response;
}
