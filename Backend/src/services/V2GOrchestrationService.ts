import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";
import { setChargingProfile } from "../ocpp/remoteControl.js";
import { redisClient } from "../config/redis.js";

export class V2GOrchestrationService {
  /**
   * Evaluates if we need to dispatch V2G discharging commands based on building load (EMS telemetry).
   * Could be scheduled to run every minute via cron.
   */
  public static async evaluateAndDispatchV2G() {
    try {
      logger.info("Evaluating V2G Orchestration based on EMS telemetry...");

      // 1. Get all active EMS Gateways
      const gateways = await prisma.emsGateway.findMany({
        where: { status: "online" }
      });

      for (const gateway of gateways) {
        // Retrieve telemetry from Redis (recent data)
        const redisKey = `ems_telemetry:${gateway.gateway_id}`;
        const telemetryRaw = await redisClient.hgetall(redisKey);

        if (!telemetryRaw || Object.keys(telemetryRaw).length === 0) {
          continue; // No recent telemetry for this gateway
        }

        const gridKw = parseFloat(telemetryRaw.grid_kw || "0");

        // Simple evaluation logic:
        // If the house is drawing high power from the grid (e.g., > 5kW), trigger V2H/V2G
        if (gridKw > 5) {
          await this.triggerV2GDischargeForClient(gateway.client_id, gridKw);
        } else {
          await this.stopV2GDischargeForClient(gateway.client_id);
        }
      }

    } catch (error) {
      logger.error(`Error in evaluateAndDispatchV2G: ${error}`);
    }
  }

  /**
   * Triggers V2G discharge for a specific client's active transactions.
   */
  private static async triggerV2GDischargeForClient(clientId: number, gridLoadKw: number) {
    try {
      // Find active transactions for this client's chargers
      const activeTransactions = await prisma.transaction.findMany({
        where: {
          status: { in: ["initiated", "charging"] },
          charger: { owner_id: clientId }
        },
        include: {
          charger: true,
          rfidUser: {
            include: { vehicleEnergyProfile: true }
          }
        }
      });

      for (const tx of activeTransactions) {
        // Skip if already explicitly set to discharge at a sufficient rate
        if (tx.currentDirection === "Discharging") continue;

        const profile = tx.rfidUser?.vehicleEnergyProfile;
        const minSoc = profile ? profile.minSocThreshold : 40.0;

        const latestMeterValue = await prisma.meterValue.findFirst({
          where: { transactionId: tx.transactionId },
          orderBy: { timestamp: "desc" }
        });

        const currentSoc = latestMeterValue?.soc ?? tx.finalMeterValue ?? 100;

        if (currentSoc > minSoc) {
           // We have enough charge. Dispatch negative power profile.
           const limitKw = -Math.min(gridLoadKw, 11); // Discharge up to 11kW to offset load
           const limitAmps = (limitKw * 1000) / 230; // Approx negative amps

           logger.info(`Triggering V2G discharge for tx ${tx.id} on charger ${tx.charger_id} at ${limitKw}kW`);

           const profileRequest = {
            chargerId: tx.charger_id,
            connectorId: 0,
            csChargingProfiles: {
              chargingProfileId: 300, // V2G Discharge Profile ID
              stackLevel: 3,          // Higher priority than normal load balancing
              chargingProfilePurpose: "TxDefaultProfile" as const,
              chargingProfileKind: "Absolute" as const,
              chargingSchedule: {
                chargingRateUnit: "A" as const,
                chargingSchedulePeriod: [
                  {
                    startPeriod: 0,
                    limit: limitAmps // Negative limit indicates discharging in V2G extension/2.0.1
                  }
                ]
              }
            }
          };

          const response = await setChargingProfile(profileRequest);

          if (response.status === "Accepted") {
            // Update transaction
            await prisma.transaction.update({
              where: { id: tx.id },
              data: {
                currentDirection: "Discharging",
                dischargeLimit: limitAmps
              }
            });
          }
        }
      }
    } catch (error) {
      logger.error(`Error triggering V2G for client ${clientId}: ${error}`);
    }
  }

  /**
   * Stops V2G discharge when grid load normalizes.
   */
  private static async stopV2GDischargeForClient(clientId: number) {
    try {
      const activeTransactions = await prisma.transaction.findMany({
        where: {
          status: { in: ["initiated", "charging"] },
          charger: { owner_id: clientId },
          currentDirection: "Discharging"
        }
      });

      for (const tx of activeTransactions) {
         logger.info(`Stopping V2G discharge for tx ${tx.id} on charger ${tx.charger_id}`);

         const profileRequest = {
          chargerId: tx.charger_id,
          connectorId: 0,
          csChargingProfiles: {
            chargingProfileId: 300,
            stackLevel: 3,
            chargingProfilePurpose: "TxDefaultProfile" as const,
            chargingProfileKind: "Absolute" as const,
            chargingSchedule: {
              chargingRateUnit: "A" as const,
              chargingSchedulePeriod: [
                {
                  startPeriod: 0,
                  limit: 0
                }
              ]
            }
          }
        };

        const response = await setChargingProfile(profileRequest);

        if (response.status === "Accepted") {
          await prisma.transaction.update({
            where: { id: tx.id },
            data: {
              currentDirection: "Charging",
              dischargeLimit: null
            }
          });
        }
      }
    } catch (error) {
      logger.error(`Error stopping V2G for client ${clientId}: ${error}`);
    }
  }
}
