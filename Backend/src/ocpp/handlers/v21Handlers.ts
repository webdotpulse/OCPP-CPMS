import { prisma } from "../../config/database.js";
import { chargerRegistry } from "../chargerRegistry.js";
import { MeterValueService } from "../../services/MeterValueService.js";
import { logger } from "../../utils/logger.js";
import { loadManagementService } from "../../services/LoadManagementService.js";
import { logOcppMessage } from "../messageHandlers.js";

/**
 * Handle BootNotification from charger
 */
export async function handleBootNotification(
  chargerId: number,
  payload: any,
  protocol?: string
): Promise<any> {
  logger.info(`BootNotification received from charger ${chargerId} using protocol ${protocol || "ocpp2.1"}`, payload);

  let vendor = payload.chargingStation?.vendorName;
  let model = payload.chargingStation?.model;
  let serialNumber = payload.chargingStation?.serialNumber;

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
        firmware_version: payload.chargingStation?.firmwareVersion || payload.firmwareVersion || "Unknown",
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
      data: { status: "active", last_heartbeat: new Date() },
    });

    // Update registry heartbeat
    await chargerRegistry.updateHeartbeat(chargerId);

    const response = {
      currentTime: new Date().toISOString(),
    };
    await logOcppMessage(chargerId, "out", response);
    return response;
  } catch (error) {
    logger.error(`Error handling Heartbeat: ${error}`);
    return {
      currentTime: new Date().toISOString(),
    };
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
  const idTag = payload.idToken?.idToken;

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
      response.idTokenInfo = { status: "Invalid" };
      await logOcppMessage(chargerId, "out", response);
      return response;
    }

    logger.info(`Authorize accepted: RFID tag ${idTag} (${rfidUser?.name})`);
    let response: any = {};
    response.idTokenInfo = { status: "Accepted" };
    await logOcppMessage(chargerId, "out", response);
    return response;
  } catch (error) {
    logger.error(`Error handling Authorize: ${error}`);
    let errResponse: any = {};
    errResponse.idTokenInfo = { status: "Invalid" };
    return errResponse;
  }
}

/**
 * Handle StatusNotification from charger
 */
export async function handleStatusNotification(
  chargerId: number,
  payload: any
): Promise<any> {
  const connectorId = payload.evseId;
  const status = payload.connectorStatus;
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
 */
export async function handleTransactionEvent(
  chargerId: number,
  payload: any,
  protocol?: string
): Promise<any> {
  const { eventType, timestamp, transactionInfo, idToken, evse, meterValue } = payload;
  const transactionId = transactionInfo?.transactionId;
  const connectorId = evse?.id;
  const idTag = idToken?.idToken;
  const chargingState = transactionInfo?.chargingState;

  const isV2GDischarging = chargingState === "Discharging";

  try {
    if (eventType === "Started") {
      let meterStart = 0;
      if (meterValue && meterValue.length > 0 && meterValue[0].sampledValue && meterValue[0].sampledValue.length > 0) {
        meterStart = parseFloat(meterValue[0].sampledValue[0].value) || 0;
      }

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
              isAuthorized = false;
            }
          }
        }

        if (!isAuthorized) {
          logger.warn(`TransactionEvent (Started) rejected: RFID tag ${idTag} not authorized`);
          let response: any = {};
          response.idTokenInfo = { status: "Invalid" };
          await logOcppMessage(chargerId, "out", response);
          return response;
        }
        rfidUserId = rfidUser?.rfid_user_id;
      }

      const connectorName = `Connector ${connectorId}`;
      const newTransaction = await prisma.transaction.create({
        data: {
          transactionId: String(transactionId),
          charger_id: chargerId,
          connectorName,
          startTime: new Date(timestamp || new Date()),
          initialMeterValue: meterStart,
          status: "charging",
          idTag,
        },
        include: { charger: true }
      });

      if (rfidUserId) {
        await prisma.rfidSession.create({
          data: {
            transactionId: String(transactionId),
            charger_id: chargerId,
            connectorName,
            rfidUserId: rfidUserId,
            startTime: new Date(timestamp || new Date()),
            initialMeterValue: meterStart,
            status: "charging",
          },
        });
        logger.info(`Started RfidSession for tag ${idTag} on charger ${chargerId}`);
      }

      await chargerRegistry.startTransaction(chargerId, transactionId, connectorName, idTag);

      const existingConnector = await prisma.connector.findFirst({
        where: {
          charger_id: chargerId,
          connector_name: connectorName
        }
      });

      if (existingConnector) {
        await prisma.connector.update({
          where: { connector_id: existingConnector.connector_id },
          data: { status: "Charging", updatedAt: new Date() },
        });
      }

      logger.info(`Transaction ${transactionId} started on charger ${chargerId}, connector ${connectorId}`);

      if (newTransaction.charger.charging_station_id) {
        loadManagementService.balanceSiteLoad(newTransaction.charger.charging_station_id)
          .catch(err => logger.error(`Error balancing site load: ${err}`));
      }
      if (newTransaction.charger.chargeGroupId) {
        loadManagementService.balanceChargeGroupLoad(newTransaction.charger.chargeGroupId)
          .catch(err => logger.error(`Error balancing charge group load: ${err}`));
      }

      let response: any = { idTokenInfo: { status: "Accepted" } };
      await logOcppMessage(chargerId, "out", response, transactionId);
      return response;

    } else if (eventType === "Updated") {
      if (meterValue && meterValue.length > 0) {
        let energyValue = 0;
        let powerValue = 0;
        let socValue: number | null = null;
        let currentValue: number | null = null;
        let voltageValue: number | null = null;

        let mvTimestamp = new Date();

        for (const mv of meterValue) {
          if (mv.timestamp) {
            mvTimestamp = new Date(mv.timestamp);
          }
          if (mv.sampledValue && Array.isArray(mv.sampledValue)) {
            for (const sv of mv.sampledValue) {
              const measurand = sv.measurand || "Energy.Active.Import.Register";
              let val = parseFloat(sv.value);

              if (measurand === "Energy.Active.Import.Register" || measurand === "Energy") {
                energyValue = isV2GDischarging ? -Math.abs(val) : Math.abs(val);
              } else if (measurand === "Energy.Active.Export.Register") {
                energyValue = -Math.abs(val); // V2G export
              } else if (measurand === "Power.Active.Import" || measurand === "Power") {
                powerValue = isV2GDischarging ? -Math.abs(val) : Math.abs(val);
              } else if (measurand === "Power.Active.Export") {
                powerValue = -Math.abs(val); // V2G export
              } else if (measurand === "SoC") {
                socValue = val;
              } else if (measurand === "Current.Import" || measurand === "Current.Offered") {
                currentValue = val;
              } else if (measurand === "Current.Export") {
                currentValue = -Math.abs(val); // V2G export
              } else if (measurand === "Voltage") {
                voltageValue = val;
              }
            }
          }
        }

        await MeterValueService.addMeterValue({
          transactionId: String(transactionId),
          chargerId,
          connectorId,
          energyValue,
          powerValue,
          socValue,
          currentValue,
          voltageValue,
          timestamp: mvTimestamp,
        });
      }

      let response: any = { idTokenInfo: { status: "Accepted" } };
      await logOcppMessage(chargerId, "out", response, transactionId);
      return response;

    } else if (eventType === "Ended") {
      let meterStop = 0;
      if (meterValue && meterValue.length > 0 && meterValue[0].sampledValue && meterValue[0].sampledValue.length > 0) {
        meterStop = parseFloat(meterValue[0].sampledValue[0].value) || 0;
      }

      await chargerRegistry.endTransaction(chargerId, transactionId);

      const transaction = await prisma.transaction.findFirst({
        where: { transactionId: String(transactionId) },
      });

      if (transaction) {
        let energyConsumed = meterStop - (transaction.initialMeterValue || 0);
        // If discharging at end, or negative consumed (exported more), retain negative representation
        if (isV2GDischarging && energyConsumed > 0) {
            energyConsumed = -energyConsumed;
        }

        const updatedTransaction = await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            finalMeterValue: meterStop,
            endTime: new Date(timestamp),
            status: "completed",
            energyConsumed: energyConsumed,
          },
          include: { charger: true }
        });

        if (updatedTransaction.charger.charging_station_id) {
          loadManagementService.balanceSiteLoad(updatedTransaction.charger.charging_station_id)
            .catch(err => logger.error(`Error balancing site load: ${err}`));
        }
        if (updatedTransaction.charger.chargeGroupId) {
          loadManagementService.balanceChargeGroupLoad(updatedTransaction.charger.chargeGroupId)
            .catch(err => logger.error(`Error balancing charge group load: ${err}`));
        }
      }

      const rfidSession = await prisma.rfidSession.findFirst({
        where: { transactionId: String(transactionId) },
        include: { rfidUser: true },
      });

      if (rfidSession) {
        const tariff = await prisma.tariff.findFirst();
        const tariffRate = tariff?.charge || 10;

        let energyConsumed = meterStop - (rfidSession.initialMeterValue || 0);
        if (isV2GDischarging && energyConsumed > 0) {
            energyConsumed = -energyConsumed;
        }
        const amountDue = (energyConsumed / 1000) * tariffRate * 100;

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

      let response: any = { idTokenInfo: { status: "Accepted" } };
      await logOcppMessage(chargerId, "out", response, transactionId);
      return response;
    }

  } catch (error) {
    logger.error(`Error handling TransactionEvent: ${error}`);
    return {};
  }
  return {};
}

export async function handleOcppMessage21(
  chargerId: number,
  actionName: string,
  payload: any,
  protocol: string
): Promise<any> {
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

  return response;
}
