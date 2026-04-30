import { chargerRegistry } from "./chargerRegistry.js";
import { logger } from "../utils/logger.js";
import type { RemoteStartRequest, RemoteStopRequest, SetChargingProfileRequest, ClearChargingProfileRequest } from "../types/index.js";

// Generate unique message ID
let messageIdCounter = 0;
function generateMessageId(): string {
  return `msg_${Date.now()}_${++messageIdCounter}`;
}

/**
 * Send RemoteStartTransaction request to charger
 * OCPP 1.6 CALL format: [2, messageId, "RemoteStartTransaction", payload]
 */
export async function remoteStartTransaction(
  request: RemoteStartRequest
): Promise<{ status: string; transactionId?: number; error?: string }> {
  const { chargerId, connectorId, idTag } = request;

  try {
    // Check if charger is connected
    if (!(await chargerRegistry.isConnectedGlobally(chargerId))) {
      return { status: "Rejected", error: "Charger not connected" };
    }

    // Send RemoteStartTransaction using correct OCPP 1.6 CALL format
    // MessageTypeId 2 = CALL (request from Central System to Charge Point)
    const messageId = generateMessageId();
    const message = [
      2,  // MessageTypeId: CALL
      messageId,
      "RemoteStartTransaction",
      {
        connectorId,
        idTag,
      }
    ];

    await chargerRegistry.publishCommand(chargerId, message);

    logger.info(`Remote start sent to charger ${chargerId}, connector ${connectorId}, idTag ${idTag}`);

    return { status: "Accepted" };
  } catch (error) {
    logger.error(`Error in remoteStartTransaction: ${error}`);
    return { status: "Rejected", error: "Failed to send remote start" };
  }
}

/**
 * Send RemoteStopTransaction request to charger
 * OCPP 1.6 CALL format: [2, messageId, "RemoteStopTransaction", payload]
 */
export async function remoteStopTransaction(
  request: RemoteStopRequest
): Promise<{ status: string; error?: string }> {
  const { chargerId, transactionId } = request;

  try {
    // Check if charger is connected
    if (!(await chargerRegistry.isConnectedGlobally(chargerId))) {
      return { status: "Rejected", error: "Charger not connected" };
    }

    // Send RemoteStopTransaction using correct OCPP 1.6 CALL format
    const messageId = generateMessageId();
    const message = [
      2,  // MessageTypeId: CALL
      messageId,
      "RemoteStopTransaction",
      { transactionId }
    ];

    await chargerRegistry.publishCommand(chargerId, message);

    logger.info(`Remote stop sent to charger ${chargerId}, transaction ${transactionId}`);

    return { status: "Accepted" };
  } catch (error) {
    logger.error(`Error in remoteStopTransaction: ${error}`);
    return { status: "Rejected", error: "Failed to send remote stop" };
  }
}

/**
 * Send GetConfiguration request to charger
 * OCPP 1.6 CALL format: [2, messageId, "GetConfiguration", payload]
 */
export async function getConfiguration(
  chargerId: number,
  key?: string
): Promise<{ status: string; configurationKey?: any[]; unknownKey?: string; error?: string }> {
  try {
    if (!(await chargerRegistry.isConnectedGlobally(chargerId))) {
      return { status: "Rejected", error: "Charger not connected" };
    }

    // Send GetConfiguration using correct OCPP 1.6 CALL format
    const messageId = generateMessageId();
    const message = [
      2,  // MessageTypeId: CALL
      messageId,
      "GetConfiguration",
      { key: key || [] }
    ];

    await chargerRegistry.publishCommand(chargerId, message);

    logger.info(`GetConfiguration sent to charger ${chargerId}, key: ${key || "all"}`);

    return { status: "Accepted" };
  } catch (error) {
    logger.error(`Error in getConfiguration: ${error}`);
    return { status: "Rejected" };
  }
}

/**
 * Send ChangeConfiguration request to charger
 * OCPP 1.6 CALL format: [2, messageId, "ChangeConfiguration", payload]
 */
export async function changeConfiguration(
  chargerId: number,
  configurationKey: Array<{ key: string; value: string }>
): Promise<{ status: string; error?: string }> {
  try {
    if (!(await chargerRegistry.isConnectedGlobally(chargerId))) {
      return { status: "Rejected", error: "Charger not connected" };
    }

    // Send ChangeConfiguration using correct OCPP 1.6 CALL format
    const messageId = generateMessageId();
    const message = [
      2,  // MessageTypeId: CALL
      messageId,
      "ChangeConfiguration",
      { configurationKey }
    ];

    await chargerRegistry.publishCommand(chargerId, message);

    logger.info(`ChangeConfiguration sent to charger ${chargerId}`);

    return { status: "Accepted" };
  } catch (error) {
    logger.error(`Error in changeConfiguration: ${error}`);
    return { status: "Rejected" };
  }
}

/**
 * Send Reset request to charger
 * OCPP 1.6 CALL format: [2, messageId, "Reset", payload]
 */
export async function resetCharger(
  chargerId: number,
  type: "Soft" | "Hard"
): Promise<{ status: string; error?: string }> {
  try {
    if (!(await chargerRegistry.isConnectedGlobally(chargerId))) {
      return { status: "Rejected", error: "Charger not connected" };
    }

    // Send Reset using correct OCPP 1.6 CALL format
    const messageId = generateMessageId();
    const message = [
      2,  // MessageTypeId: CALL
      messageId,
      "Reset",
      { type }
    ];

    await chargerRegistry.publishCommand(chargerId, message);

    logger.info(`Reset sent to charger ${chargerId}, type: ${type}`);

    return { status: "Accepted" };
  } catch (error) {
    logger.error(`Error in resetCharger: ${error}`);
    return { status: "Rejected" };
  }
}

/**
 * Send UnlockConnector request to charger
 * OCPP 1.6 CALL format: [2, messageId, "UnlockConnector", payload]
 */
export async function unlockConnector(
  chargerId: number,
  connectorId: number
): Promise<{ status: string; error?: string }> {
  try {
    if (!(await chargerRegistry.isConnectedGlobally(chargerId))) {
      return { status: "Rejected", error: "Charger not connected" };
    }

    // Send UnlockConnector using correct OCPP 1.6 CALL format
    const messageId = generateMessageId();
    const message = [
      2,  // MessageTypeId: CALL
      messageId,
      "UnlockConnector",
      { connectorId }
    ];

    await chargerRegistry.publishCommand(chargerId, message);

    logger.info(`Unlock sent to charger ${chargerId}, connector ${connectorId}`);

    return { status: "Accepted" };
  } catch (error) {
    logger.error(`Error in unlockConnector: ${error}`);
    return { status: "Rejected" };
  }
}

/**
 * Send SetChargingProfile request to charger
 * OCPP 1.6 CALL format: [2, messageId, "SetChargingProfile", payload]
 */
export async function setChargingProfile(
  request: SetChargingProfileRequest
): Promise<{ status: string; error?: string }> {
  const { chargerId, connectorId, csChargingProfiles } = request;

  try {
    if (!(await chargerRegistry.isConnectedGlobally(chargerId))) {
      return { status: "Rejected", error: "Charger not connected" };
    }

    const messageId = generateMessageId();
    const message = [
      2,  // MessageTypeId: CALL
      messageId,
      "SetChargingProfile",
      {
        connectorId,
        csChargingProfiles,
      }
    ];

    await chargerRegistry.publishCommand(chargerId, message);

    logger.info(`SetChargingProfile sent to charger ${chargerId}, connector ${connectorId}`);

    return { status: "Accepted" };
  } catch (error) {
    logger.error(`Error in setChargingProfile: ${error}`);
    return { status: "Rejected", error: "Failed to send SetChargingProfile" };
  }
}

/**
 * Send ClearChargingProfile request to charger
 * OCPP 1.6 CALL format: [2, messageId, "ClearChargingProfile", payload]
 */
export async function clearChargingProfile(
  request: ClearChargingProfileRequest
): Promise<{ status: string; error?: string }> {
  const { chargerId, id, connectorId, chargingProfilePurpose, stackLevel } = request;

  try {
    if (!(await chargerRegistry.isConnectedGlobally(chargerId))) {
      return { status: "Rejected", error: "Charger not connected" };
    }

    const messageId = generateMessageId();
    const payload: any = {};
    if (id !== undefined) payload.id = id;
    if (connectorId !== undefined) payload.connectorId = connectorId;
    if (chargingProfilePurpose !== undefined) payload.chargingProfilePurpose = chargingProfilePurpose;
    if (stackLevel !== undefined) payload.stackLevel = stackLevel;

    const message = [
      2,  // MessageTypeId: CALL
      messageId,
      "ClearChargingProfile",
      payload
    ];

    await chargerRegistry.publishCommand(chargerId, message);

    logger.info(`ClearChargingProfile sent to charger ${chargerId}`);

    return { status: "Accepted" };
  } catch (error) {
    logger.error(`Error in clearChargingProfile: ${error}`);
    return { status: "Rejected", error: "Failed to send ClearChargingProfile" };
  }
}

/**
 * Send TriggerMessage request to charger
 * OCPP 1.6 CALL format: [2, messageId, "TriggerMessage", payload]
 */
export async function triggerMessage(
  chargerId: number,
  requestedMessage: string,
  connectorId?: number
): Promise<{ status: string; error?: string }> {
  try {
    if (!(await chargerRegistry.isConnectedGlobally(chargerId))) {
      return { status: "Rejected", error: "Charger not connected" };
    }

    // Send TriggerMessage using correct OCPP 1.6 CALL format
    const messageId = generateMessageId();
    const payload: any = { requestedMessage };
    if (connectorId !== undefined) {
      payload.connectorId = connectorId;
    }

    const message = [
      2,  // MessageTypeId: CALL
      messageId,
      "TriggerMessage",
      payload
    ];

    await chargerRegistry.publishCommand(chargerId, message);

    logger.info(
      `TriggerMessage sent to charger ${chargerId}, message: ${requestedMessage}`
    );

    return { status: "Accepted" };
  } catch (error) {
    logger.error(`Error in triggerMessage: ${error}`);
    return { status: "Rejected" };
  }
}

/**
 * Get list of connected chargers
 */
export function getConnectedChargers(): number[] {
  return chargerRegistry.getConnectedChargers();
}

/**
 * Check if a charger is connected
 */
export async function isChargerConnected(chargerId: number): Promise<boolean> {
  return chargerRegistry.isConnectedGlobally(chargerId);
}
