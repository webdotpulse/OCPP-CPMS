import { Request, Response } from "express";
import { logger } from "../../utils/logger.js";
import {
  remoteStartTransaction,
  remoteStopTransaction,
  resetCharger,
  unlockConnector,
  getConfiguration,
  changeConfiguration,
  triggerMessage,
  getConnectedChargers as getConnected,
  setChargingProfile,
  clearChargingProfile,
} from "../../ocpp/remoteControl.js";
import type { RemoteStartRequest, RemoteStopRequest, SetChargingProfileRequest, ClearChargingProfileRequest } from "../../types/index.js";

/**
 * POST /api/ocpp/set-charging-profile - Set charging profile on charger
 */
export const setChargingProfileController = async (req: Request, res: Response) => {
  try {
    const { chargerId, connectorId, csChargingProfiles } = req.body as SetChargingProfileRequest;

    if (chargerId === undefined || connectorId === undefined || !csChargingProfiles) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: chargerId, connectorId, csChargingProfiles",
      });
    }

    const result = await setChargingProfile({ chargerId, connectorId, csChargingProfiles });

    if (result.status === "Rejected") {
      return res.status(400).json({
        success: false,
        error: result.error || "Set charging profile rejected",
      });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Error setting charging profile: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to set charging profile",
    });
  }
};

/**
 * POST /api/ocpp/clear-charging-profile - Clear charging profile on charger
 */
export const clearChargingProfileController = async (req: Request, res: Response) => {
  try {
    const request = req.body as ClearChargingProfileRequest;

    if (request.chargerId === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: chargerId",
      });
    }

    const result = await clearChargingProfile(request);

    if (result.status === "Rejected") {
      return res.status(400).json({
        success: false,
        error: result.error || "Clear charging profile rejected",
      });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Error clearing charging profile: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to clear charging profile",
    });
  }
};

/**
 * GET /api/ocpp/connected - Get list of connected chargers
 */
export const getConnectedChargers = (req: Request, res: Response) => {
  const connectedChargers = getConnected();
  res.json({
    success: true,
    data: connectedChargers,
    count: connectedChargers.length,
  });
};

/**
 * POST /api/ocpp/remote-start - Start charging remotely
 */
export const remoteStart = async (req: Request, res: Response) => {
  try {
    const { chargerId, connectorId, idTag } = req.body;

    if (!chargerId || !connectorId || !idTag) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: chargerId, connectorId, idTag",
      });
    }

    const result = await remoteStartTransaction({
      chargerId,
      connectorId,
      idTag,
    });

    if (result.status === "Rejected") {
      return res.status(400).json({
        success: false,
        error: result.error || "Remote start rejected by charger",
      });
    }

    logger.info(
      `Remote start successful: charger ${chargerId}, connector ${connectorId}`
    );
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Error in remote start: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to send remote start request",
    });
  }
};

/**
 * POST /api/ocpp/remote-stop - Stop charging remotely
 */
export const remoteStop = async (req: Request, res: Response) => {
  try {
    const { chargerId, transactionId } = req.body;

    if (!chargerId || !transactionId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: chargerId, transactionId",
      });
    }

    const result = await remoteStopTransaction({ chargerId, transactionId });

    if (result.status === "Rejected") {
      return res.status(400).json({
        success: false,
        error: result.error || "Remote stop rejected by charger",
      });
    }

    logger.info(
      `Remote stop successful: charger ${chargerId}, transaction ${transactionId}`
    );
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Error in remote stop: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to send remote stop request",
    });
  }
};

/**
 * POST /api/ocpp/get-configuration - Get charger configuration
 */
export const getChargerConfiguration = async (req: Request, res: Response) => {
  try {
    const { chargerId, key } = req.body;

    if (!chargerId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: chargerId",
      });
    }

    const result = await getConfiguration(chargerId, key);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Error getting configuration: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get configuration",
    });
  }
};

/**
 * POST /api/ocpp/set-configuration - Set charger configuration
 */
export const setChargerConfiguration = async (req: Request, res: Response) => {
  try {
    const { chargerId, configurationKey } = req.body;

    if (!chargerId || !configurationKey) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: chargerId, configurationKey",
      });
    }

    const result = await changeConfiguration(chargerId, configurationKey);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Error setting configuration: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to set configuration",
    });
  }
};

/**
 * POST /api/ocpp/reset - Reset charger
 */
export const resetChargerController = async (req: Request, res: Response) => {
  try {
    const { chargerId, type } = req.body;

    if (!chargerId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: chargerId",
      });
    }

    if (type !== "Soft" && type !== "Hard") {
      return res.status(400).json({
        success: false,
        error: "Invalid reset type. Must be 'Soft' or 'Hard'",
      });
    }

    const result = await resetCharger(chargerId, type);

    logger.info(`Reset sent to charger ${chargerId}: ${type}`);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Error resetting charger: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to reset charger",
    });
  }
};

/**
 * POST /api/ocpp/unlock - Unlock connector
 */
export const unlockConnectorController = async (req: Request, res: Response) => {
  try {
    const { chargerId, connectorId } = req.body;

    if (!chargerId || !connectorId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: chargerId, connectorId",
      });
    }

    const result = await unlockConnector(chargerId, connectorId);

    logger.info(
      `Unlock sent to charger ${chargerId}, connector ${connectorId}`
    );
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Error unlocking connector: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to unlock connector",
    });
  }
};

/**
 * POST /api/ocpp/trigger-message - Trigger message on charger
 */
export const triggerMessageController = async (req: Request, res: Response) => {
  try {
    const { chargerId, requestedMessage, connectorId } = req.body;

    if (!chargerId || !requestedMessage) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: chargerId, requestedMessage",
      });
    }

    const result = await triggerMessage(chargerId, requestedMessage, connectorId);

    logger.info(
      `Trigger message sent to charger ${chargerId}: ${requestedMessage}`
    );
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Error triggering message: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to trigger message",
    });
  }
};
