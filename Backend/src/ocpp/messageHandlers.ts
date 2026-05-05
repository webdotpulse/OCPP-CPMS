import { prisma } from "../config/database.js";
import { chargerRegistry } from "./chargerRegistry.js";
import { logger } from "../utils/logger.js";
import type { OcppDirection } from "../types/index.js";
import { redisPublisher } from "../config/redis.js";
import { loadManagementService } from "../services/LoadManagementService.js";

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
 * Handle BootNotification from charger
 */
export async function handleBootNotification(
  chargerId: number,
  payload: any,
  protocol?: string
): Promise<any> {
  logger.info(`BootNotification received from charger ${chargerId} using protocol ${protocol || "ocpp1.6"}`, payload);

  let vendor: string;
  let model: string;
  let serialNumber: string;

  if (protocol === "ocpp2.1" || protocol === "ocpp2.0.1") {
    vendor = payload.chargingStation?.vendorName;
    model = payload.chargingStation?.model;
    serialNumber = payload.chargingStation?.serialNumber;
  } else {
    vendor = payload.chargePointVendor;
    model = payload.chargePointModel;
    serialNumber = payload.chargePointSerialNumber;
  }

  try {
    // Check if charger exists in database
    const charger = await prisma.charger.findUnique({
      where: { charger_id: chargerId },
    });

    if (!charger) {
      logger.warn(`Charger ${chargerId} not found in database. Rejecting.`);
      await logOcppMessage(chargerId, "in", payload);
      return {
        status: "Rejected",
        currentTime: new Date().toISOString(),
        interval: 300,
      };
    }

    // Update charger info if needed
    await prisma.charger.update({
      where: { charger_id: chargerId },
      data: {
        status: "active",
        last_heartbeat: new Date(),
        manufacturer: vendor,
        model: model,
        serial_number: serialNumber,
        firmware_version: payload.chargePointSerialNumber ? payload.firmwareVersion : payload.chargingStation?.firmwareVersion || payload.firmwareVersion || "Unknown",
      },
    });

    // Update registry heartbeat
    await chargerRegistry.updateHeartbeat(chargerId);

    const response = {
      status: "Accepted",
      currentTime: new Date().toISOString(),
      interval: 300,
    };

    await logOcppMessage(chargerId, "out", response);
    return response;
  } catch (error) {
    logger.error(`Error handling BootNotification: ${error}`);
    return {
      status: "Rejected",
      currentTime: new Date().toISOString(),
      interval: 300,
    };
  }
}

/**
 * Handle Heartbeat from charger
 */
export async function handleHeartbeat(
  chargerId: number,
  payload: any
): Promise<any> {
  try {
    // Update charger's last heartbeat in database
    await prisma.charger.update({
      where: { charger_id: chargerId },
      data: { last_heartbeat: new Date() },
    });

    // Update registry heartbeat
    await chargerRegistry.updateHeartbeat(chargerId);

    const response = { currentTime: new Date().toISOString() };
    await logOcppMessage(chargerId, "out", response);
    return response;
  } catch (error) {
    logger.error(`Error handling Heartbeat: ${error}`);
    return { currentTime: new Date().toISOString() };
  }
}

/**
 * Handle Authorize request from charger
 */
export async function handleAuthorize(
  chargerId: number,
  payload: any,
  protocol?: string
): Promise<any> {
  const idTag = payload.idToken?.idToken || payload.idTag;

  try {
    // Look up RFID tag in database
    const rfidUser = await prisma.rfidUser.findUnique({
      where: { rfid_tag: idTag },
    });

    let isAuthorized = true;

    if (!rfidUser || !rfidUser.active) {
      isAuthorized = false;
    } else {
      // Check if charger belongs to a group and if user is in that group
      const charger = await prisma.charger.findUnique({
        where: { charger_id: chargerId },
        select: { chargeGroupId: true }
      });

      if (charger && charger.chargeGroupId) {
        const userInGroup = await prisma.chargeGroupUser.findUnique({
          where: {
            chargeGroupId_userId: {
              chargeGroupId: charger.chargeGroupId,
              userId: rfidUser.owner_id
            }
          }
        });
        if (!userInGroup) {
          logger.warn(`Authorize rejected: User of RFID tag ${idTag} is not in the required charge group ${charger.chargeGroupId}`);
          isAuthorized = false;
        }
      }
    }

    if (!isAuthorized) {
      logger.warn(`Authorize rejected: RFID tag ${idTag} not authorized`);
      let response: any = {};
      if (protocol === "ocpp2.1" || protocol === "ocpp2.0.1") {
        response.idTokenInfo = { status: "Invalid" };
      } else {
        response.idTagInfo = { status: "Invalid" };
      }
      await logOcppMessage(chargerId, "out", response);
      return response;
    }

    logger.info(`Authorize accepted: RFID tag ${idTag} (${rfidUser?.name})`);
    let response: any = {};
    if (protocol === "ocpp2.1" || protocol === "ocpp2.0.1") {
      response.idTokenInfo = { status: "Accepted" };
    } else {
      response.idTagInfo = { status: "Accepted" };
    }
    await logOcppMessage(chargerId, "out", response);
    return response;
  } catch (error) {
    logger.error(`Error handling Authorize: ${error}`);
    let errResponse: any = {};
    if (protocol === "ocpp2.1" || protocol === "ocpp2.0.1") {
      errResponse.idTokenInfo = { status: "Invalid" };
    } else {
      errResponse.idTagInfo = { status: "Invalid" };
    }
    return errResponse;
  }
}

/**
 * Handle StartTransaction request from charger
 */
export async function handleStartTransaction(
  chargerId: number,
  payload: any,
  protocol?: string
): Promise<any> {
  const { connectorId, idTag, meterStart, timestamp } = payload;

  try {
    // Use transaction ID from payload if provided (OCPP 2.1), else generate (OCPP 1.6)
    const transactionId = payload.transactionId ? String(payload.transactionId) : String(Math.floor(Date.now() / 1000));

    // Check if RFID tag is valid (if provided)
    let rfidUserId: number | undefined;
    if (idTag) {
      const rfidUser = await prisma.rfidUser.findUnique({
        where: { rfid_tag: idTag },
      });

      let isAuthorized = true;

      if (!rfidUser || !rfidUser.active) {
        isAuthorized = false;
      } else {
        // Check if charger belongs to a group and if user is in that group
        const chargerInfo = await prisma.charger.findUnique({
          where: { charger_id: chargerId },
          select: { chargeGroupId: true }
        });

        if (chargerInfo && chargerInfo.chargeGroupId) {
          const userInGroup = await prisma.chargeGroupUser.findUnique({
            where: {
              chargeGroupId_userId: {
                chargeGroupId: chargerInfo.chargeGroupId,
                userId: rfidUser.owner_id
              }
            }
          });
          if (!userInGroup) {
            logger.warn(`StartTransaction rejected: User of RFID tag ${idTag} is not in the required charge group ${chargerInfo.chargeGroupId}`);
            isAuthorized = false;
          }
        }
      }

      if (!isAuthorized || !rfidUser) {
        let response: any = { transactionId: 0 };
        if (protocol === "ocpp2.1" || protocol === "ocpp2.0.1") {
          response.idTokenInfo = { status: "Invalid" };
        } else {
          response.idTagInfo = { status: "Invalid" };
        }
        await logOcppMessage(chargerId, "out", response, transactionId);
        return response;
      }

      rfidUserId = rfidUser.rfid_user_id;

      // Create RfidSession for postpaid users
      if (rfidUser.type === "postpaid") {
        await prisma.rfidSession.create({
          data: {
            transactionId,
            rfidUserId,
            charger_id: chargerId,
            connectorName: `Connector_${connectorId}`,
            initialMeterValue: meterStart,
            startTime: new Date(timestamp),
          },
        });
      }
    }

    // Create basic Transaction record
    const newTransaction = await prisma.transaction.create({
      data: {
        transactionId,
        connectorName: `Connector_${connectorId}`,
        charger_id: chargerId,
        startTime: new Date(timestamp),
        initialMeterValue: meterStart,
        status: "initiated",
        idTag: idTag,
      },
      include: { charger: true }
    });

    // Register transaction in memory
    await chargerRegistry.startTransaction(
      chargerId,
      transactionId,
      `Connector_${connectorId}`,
      idTag
    );

    // Trigger Load Balancing since a new transaction has started
    if (newTransaction.charger.charging_station_id) {
      loadManagementService.balanceSiteLoad(newTransaction.charger.charging_station_id)
        .catch(err => logger.error(`Error balancing site load: ${err}`));
    }
    if (newTransaction.charger.chargeGroupId) {
      loadManagementService.balanceChargeGroupLoad(newTransaction.charger.chargeGroupId)
        .catch(err => logger.error(`Error balancing charge group load: ${err}`));
    }

    logger.info(`Transaction ${transactionId} started on charger ${chargerId}, connector ${connectorId}`);
    let response: any = { transactionId };
    if (protocol === "ocpp2.1" || protocol === "ocpp2.0.1") {
      response.idTokenInfo = { status: "Accepted" };
    } else {
      response.idTagInfo = { status: "Accepted" };
    }
    await logOcppMessage(chargerId, "out", response, transactionId);
    return response;
  } catch (error) {
    logger.error(`Error handling StartTransaction: ${error}`);
    let errResponse: any = { transactionId: 0 };
    if (protocol === "ocpp2.1" || protocol === "ocpp2.0.1") {
      errResponse.idTokenInfo = { status: "Invalid" };
    } else {
      errResponse.idTagInfo = { status: "Invalid" };
    }
    return errResponse;
  }
}

/**
 * Handle StopTransaction request from charger
 */
export async function handleStopTransaction(
  chargerId: number,
  payload: any,
  protocol?: string
): Promise<any> {
  const { transactionId, meterStop, timestamp, idTag } = payload;

  try {
    // End transaction in memory
    const activeTransaction = await chargerRegistry.endTransaction(chargerId, String(transactionId));

    if (!activeTransaction) {
      logger.warn(`Transaction ${transactionId} not found for charger ${chargerId}`);
    }

    // Update Transaction record
    const transaction = await prisma.transaction.findFirst({
      where: { transactionId: String(transactionId) },
    });

    if (transaction) {
      const updatedTransaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          finalMeterValue: meterStop,
          endTime: new Date(timestamp),
          status: "completed",
          energyConsumed: meterStop - (transaction.initialMeterValue || 0),
        },
        include: { charger: true }
      });

      // Trigger Load Balancing since a transaction has stopped, freeing up capacity
      if (updatedTransaction.charger.charging_station_id) {
        loadManagementService.balanceSiteLoad(updatedTransaction.charger.charging_station_id)
          .catch(err => logger.error(`Error balancing site load: ${err}`));
      }
      if (updatedTransaction.charger.chargeGroupId) {
        loadManagementService.balanceChargeGroupLoad(updatedTransaction.charger.chargeGroupId)
          .catch(err => logger.error(`Error balancing charge group load: ${err}`));
      }
    }

    // Update RfidSession if exists
    const rfidSession = await prisma.rfidSession.findFirst({
      where: { transactionId: String(transactionId) },
      include: { rfidUser: true },
    });

    if (rfidSession) {
      // Get tariff rate (simplified - get first tariff or use default)
      const tariff = await prisma.tariff.findFirst();
      const tariffRate = tariff?.charge || 10; // Default Rs 10/kWh

      const energyConsumed = meterStop - (rfidSession.initialMeterValue || 0);
      const amountDue = (energyConsumed / 1000) * tariffRate * 100; // Convert to paise

      await prisma.rfidSession.update({
        where: { id: rfidSession.id },
        data: {
          finalMeterValue: meterStop,
          endTime: new Date(timestamp),
          energyConsumed,
          tariffRate,
          amountDue,
          status: "completed",
        },
      });

      logger.info(`RfidSession ${rfidSession.id} completed. Amount due: Rs ${(amountDue / 100).toFixed(2)}`);
    }

    let response: any = {};
    if (protocol === "ocpp2.1" || protocol === "ocpp2.0.1") {
      response.idTokenInfo = { status: "Accepted" };
    } else {
      response.idTagInfo = { status: "Accepted" };
    }
    await logOcppMessage(chargerId, "out", response, transactionId);
    return response;
  } catch (error) {
    logger.error(`Error handling StopTransaction: ${error}`);
    return {};
  }
}

/**
 * Handle MeterValues from charger
 */
export async function handleMeterValues(
  chargerId: number,
  payload: any
): Promise<void> {
  const { connectorId, meterValue, transactionId } = payload;

  try {
    if (!transactionId) return;

    let energyValue = 0;
    let powerValue = 0;

    if (Array.isArray(meterValue)) {
      for (const mv of meterValue) {
        if (mv.sampledValue && Array.isArray(mv.sampledValue)) {
          for (const sv of mv.sampledValue) {
            const measurand = sv.measurand || "Energy.Active.Import.Register";
            if (measurand === "Energy.Active.Import.Register" || measurand === "Energy") {
              energyValue = parseFloat(sv.value);
            } else if (measurand === "Power.Active.Import" || measurand === "Power") {
              powerValue = parseFloat(sv.value);
            }
          }
        } else if (mv.value !== undefined) {
           energyValue = parseFloat(mv.value);
        }
      }
    }

    // Update Transaction record
    const transaction = await prisma.transaction.findFirst({
      where: { transactionId: String(transactionId) },
    });

    if (transaction) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          energyConsumed: energyValue || transaction.energyConsumed,
          currentPower: powerValue || transaction.currentPower,
          status: "charging",
        },
      });
    }

    // Update RfidSession if exists
    const rfidSession = await prisma.rfidSession.findFirst({
      where: { transactionId: String(transactionId) },
    });

    if (rfidSession) {
      await prisma.rfidSession.update({
        where: { id: rfidSession.id },
        data: {
          energyConsumed: energyValue || rfidSession.energyConsumed,
          currentPower: powerValue || rfidSession.currentPower,
          status: "charging",
        },
      });
    }

    await logOcppMessage(chargerId, "in", payload, transactionId);
  } catch (error) {
    logger.error(`Error handling MeterValues: ${error}`);
  }
}

/**
 * Handle StatusNotification from charger
 */
export async function handleStatusNotification(
  chargerId: number,
  payload: any
): Promise<any> {
  const connectorId = payload.evseId ?? payload.connectorId;
  const status = payload.connectorStatus ?? payload.status;
  const errorCode = payload.errorCode;
  const timestamp = payload.timestamp;
  const info = payload.info;

  try {
    // Update/Create connector status in database
    const connectorName = `Connector ${connectorId}`;
    
    // For connectorId 0 (Charge Point itself), we don't usually create a "Connector" record
    // unless the system design requires it. Here we only handle actual connectors (1+).
    if (connectorId > 0) {
      const existingConnector = await prisma.connector.findFirst({
        where: { 
          charger_id: chargerId,
          connector_name: connectorName
        }
      });

      if (existingConnector) {
        await prisma.connector.update({
          where: { connector_id: existingConnector.connector_id },
          data: { status, updatedAt: new Date() },
        });
      } else {
        await prisma.connector.create({
          data: {
            charger_id: chargerId,
            connector_name: connectorName,
            status: status,
            current_type: "AC", // Default, can be refined based on charger model
            updatedAt: new Date(),
          }
        });
        logger.info(`Auto-created connector ${connectorName} for charger ${chargerId}`);
      }
    }

    // Update charger status to active if receiving status notifications
    await prisma.charger.update({
      where: { charger_id: chargerId },
      data: { status: "active", last_heartbeat: new Date() },
    });

    logger.info(
      `StatusNotification from charger ${chargerId}: connector ${connectorId} status = ${status}`
    );

    const response = {};
    await logOcppMessage(chargerId, "out", response);
    return response;
  } catch (error) {
    logger.error(`Error handling StatusNotification: ${error}`);
    return {};
  }
}

/**
 * Handle TransactionEvent from charger (OCPP 2.1)
 * This acts as an adapter, delegating to the 1.6 handlers
 */
export async function handleTransactionEvent(
  chargerId: number,
  payload: any,
  protocol?: string
): Promise<any> {
  const { eventType, timestamp, transactionInfo, idToken, evse, meterValue } = payload;

  const transactionId = transactionInfo?.transactionId;

  if (eventType === "Started") {
    const meterStart = meterValue?.[0]?.sampledValue?.[0]?.value ? parseFloat(meterValue[0].sampledValue[0].value) : 0;
    return await handleStartTransaction(chargerId, {
      connectorId: evse?.id,
      idTag: idToken?.idToken,
      meterStart,
      timestamp,
      transactionId
    }, protocol);
  } else if (eventType === "Updated") {
    // MeterValues or charging state update
    if (meterValue && meterValue.length > 0) {
      await handleMeterValues(chargerId, {
        connectorId: evse?.id,
        transactionId,
        meterValue
      });
    }
    return {};
  } else if (eventType === "Ended") {
    const meterStop = meterValue?.[0]?.sampledValue?.[0]?.value ? parseFloat(meterValue[0].sampledValue[0].value) : 0;
    return await handleStopTransaction(chargerId, {
      transactionId,
      meterStop,
      timestamp,
      idTag: idToken?.idToken
    }, protocol);
  }

  return {};
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

  // In OCPP 1.6, messageType 2 = CALL (all requests)
  // The actionName determines which handler to route to
  let response: any;

  switch (actionName) {
    case "BootNotification":
      logger.debug(`Routing action ${actionName} -> handleBootNotification`);
      response = await handleBootNotification(chargerId, payload, protocol);
      break;
    case "Heartbeat":
      logger.debug(`Routing action ${actionName} -> handleHeartbeat`);
      response = await handleHeartbeat(chargerId, payload);
      break;
    case "Authorize":
      logger.debug(`Routing action ${actionName} -> handleAuthorize`);
      response = await handleAuthorize(chargerId, payload, protocol);
      break;
    case "StartTransaction":
      logger.debug(`Routing action ${actionName} -> handleStartTransaction`);
      response = await handleStartTransaction(chargerId, payload, protocol);
      break;
    case "StopTransaction":
      logger.debug(`Routing action ${actionName} -> handleStopTransaction`);
      response = await handleStopTransaction(chargerId, payload, protocol);
      break;
    case "MeterValues":
      logger.debug(`Routing action ${actionName} -> handleMeterValues`);
      await handleMeterValues(chargerId, payload);
      response = {};
      break;
    case "StatusNotification":
      logger.debug(`Routing action ${actionName} -> handleStatusNotification`);
      response = await handleStatusNotification(chargerId, payload);
      break;
    case "TransactionEvent":
      logger.debug(`Routing action ${actionName} -> handleTransactionEvent`);
      response = await handleTransactionEvent(chargerId, payload, protocol);
      break;
    default:
      logger.warn(`Unknown action name: ${actionName}`);
      response = {};
  }

  logger.debug(`Response for action ${actionName}: ${JSON.stringify(response)}`);
  return response;
}
