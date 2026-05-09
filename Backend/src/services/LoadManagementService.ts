import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";
import { setChargingProfile, clearChargingProfile } from "../ocpp/remoteControl.js";
import type { SetChargingProfileRequest } from "../types/index.js";

export class LoadManagementService {
  private isEngineRunning = false;

  public startSmartChargingEngine() {
    if (this.isEngineRunning) return;
    this.isEngineRunning = true;
    this.runSmartChargingLoop();
  }

  private async runSmartChargingLoop() {
    if (!this.isEngineRunning) return;

    try {
      const groups = await prisma.chargeGroup.findMany();
      for (const group of groups) {
        await this.balanceChargeGroupLoad(group.id).catch((err: any) =>
          logger.error(`Smart Charging engine error for group ${group.id}: ${err}`)
        );
      }
    } catch (error) {
      logger.error(`Smart Charging engine global error: ${error}`);
    } finally {
      // Recursive algorithm: schedule next run after 60 seconds
      setTimeout(() => this.runSmartChargingLoop(), 60 * 1000);
    }
  }
  /**
   * Calculate the total current power draw for a specific site
   */
  async calculateSiteLoad(stationId: number): Promise<number> {
    const transactions = await prisma.transaction.findMany({
      where: {
        status: "charging", // Need to make sure the status represents active drawing, e.g. "initiated" or "charging"
        charger: {
          charging_station_id: stationId
        }
      },
      include: { charger: true }
    });

    // In a real scenario, this would aggregate current active power draws from recent MeterValues.
    // For this example, we'll assume a baseline draw or use the charger's max capacity if actively charging.
    // Assuming each active transaction draws maximum power if not specifically limited.
    let totalLoad = 0;
    for (const tx of transactions) {
      // Simplified: Add power capacity of active chargers
      totalLoad += tx.charger.power_capacity || 0;
    }

    return totalLoad;
  }

  /**
   * Balance load across a charging station based on maxPower constraints
   */
  async balanceSiteLoad(stationId: number): Promise<void> {
    try {
      const station = await prisma.chargingStation.findUnique({
        where: { id: stationId },
        include: { chargers: true }
      });

      if (!station || !station.maxPower) {
        logger.debug(`Load balancing skipped: Station ${stationId} has no maxPower defined.`);
        return;
      }

      // Find all active transactions at this station
      const activeTransactions = await prisma.transaction.findMany({
        where: {
          status: { in: ["initiated", "charging"] },
          charger: { charging_station_id: stationId }
        },
        include: { charger: true }
      });

      if (activeTransactions.length === 0) {
        return; // No active transactions, nothing to balance
      }

      // Check current load vs max capacity using aggregation.
      // We aggregate the `currentPower` from the transaction to get actual active load,
      // but the original logic summed the theoretical max capacity of the charger (`power_capacity`).
      // Since Prisma doesn't support aggregating over relation fields directly,
      // we sum the actual `currentPower` and fallback if necessary.
      const aggregateLoad = await prisma.transaction.aggregate({
        where: {
          status: { in: ["initiated", "charging"] },
          charger: { charging_station_id: stationId }
        },
        _sum: {
          currentPower: true
        }
      });

      // currentPower is in Watts, convert to kW
      let totalRequestedLoadKw = (aggregateLoad._sum.currentPower || 0) / 1000;

      // Fallback: If no currentPower is reported, we fallback to theoretical capacity
      if (totalRequestedLoadKw === 0) {
        totalRequestedLoadKw = activeTransactions.reduce(
          (sum, tx) => sum + (tx.charger.power_capacity || 0),
          0
        );
      }

      // If we are back under capacity, we need to clear limits
      if (totalRequestedLoadKw <= station.maxPower) {
        logger.debug(`Station ${stationId} load (${totalRequestedLoadKw.toFixed(1)}kW) within limit (${station.maxPower}kW). Clearing any existing load management profiles.`);
        for (const tx of activeTransactions) {
          await this.clearLoadManagementProfile(tx.charger_id);
        }
        return;
      }

      logger.info(`Station ${stationId} load (${totalRequestedLoadKw.toFixed(1)}kW) exceeds limit (${station.maxPower}kW). Balancing load...`);

      // Proportional distribution (or equal distribution depending on implementation preference)
      // We will do equal distribution for active transactions to ensure no one is starved
      const limitPerTransaction = station.maxPower / activeTransactions.length;

      // Apply the limits via SetChargingProfile
      for (const tx of activeTransactions) {
        const profileRequest: SetChargingProfileRequest = {
          chargerId: tx.charger_id,
          connectorId: 0, // 0 = entire Charge Point
          csChargingProfiles: {
            chargingProfileId: 100, // Static ID representing Load Management
            stackLevel: 1,
            chargingProfilePurpose: "ChargePointMaxProfile",
            chargingProfileKind: "Absolute",
            chargingSchedule: {
              chargingRateUnit: "W", // kW converted to W
              chargingSchedulePeriod: [
                {
                  startPeriod: 0,
                  limit: limitPerTransaction * 1000 // Convert kW to W
                }
              ]
            }
          }
        };

        await this.dispatchChargingProfiles(profileRequest);
      }
    } catch (error) {
      logger.error(`Error in balanceSiteLoad for station ${stationId}: ${error}`);
    }
  }

  /**
   * Balance load across a Charge Group based on maxPower constraints
   */
  async balanceChargeGroupLoad(groupId: number): Promise<void> {
    try {
      const group = await prisma.chargeGroup.findUnique({
        where: { id: groupId },
      });

      if (!group) return;

      const activeTransactions = await prisma.transaction.findMany({
        where: {
          status: { in: ["initiated", "charging"] },
          charger: { chargeGroupId: groupId }
        },
        include: { charger: true }
      });

      if (activeTransactions.length === 0) return;

      // Calculate total active current across the group using aggregate
      const aggregateCurrent = await prisma.transaction.aggregate({
        where: {
          status: { in: ["initiated", "charging"] },
          charger: { chargeGroupId: groupId }
        },
        _sum: {
          current: true
        }
      });

      let totalActiveCurrent = aggregateCurrent._sum.current || 0;
      if (totalActiveCurrent === 0) {
        totalActiveCurrent = activeTransactions.reduce(
          (sum, tx) => sum + (tx.current || 0),
          0
        );
      }

      // Check maxAmperage constraint
      if (group.maxAmperage && totalActiveCurrent > group.maxAmperage) {
        logger.info(`Charge Group ${groupId} active current (${totalActiveCurrent}A) exceeds limit (${group.maxAmperage}A). Balancing load...`);

        // Fair-share reduction for each active transaction
        const limitPerTransactionAmps = group.maxAmperage / activeTransactions.length;

        for (const tx of activeTransactions) {
          const profileRequest: SetChargingProfileRequest = {
            chargerId: tx.charger_id,
            connectorId: 0,
            csChargingProfiles: {
              chargingProfileId: 101, // ID representing Smart Load Management (Amps)
              stackLevel: 2, // Higher priority
              chargingProfilePurpose: "TxDefaultProfile", // Throttling charging speeds for tx
              chargingProfileKind: "Absolute",
              chargingSchedule: {
                chargingRateUnit: "A", // Using Amps
                chargingSchedulePeriod: [
                  {
                    startPeriod: 0,
                    limit: limitPerTransactionAmps
                  }
                ]
              }
            }
          };

          // Dispatch profile to throttle
          await this.dispatchChargingProfiles(profileRequest).catch((err: any) =>
            logger.error(`Failed to dispatch amp throttle profile for tx ${tx.id}: ${err}`)
          );
        }
      }

      // We still run the old logic for maxPower if needed
      if (!group.maxPower) return;

      const aggregateLoad = await prisma.transaction.aggregate({
        where: {
          status: { in: ["initiated", "charging"] },
          charger: { chargeGroupId: groupId }
        },
        _sum: {
          currentPower: true
        }
      });

      // currentPower is in Watts, convert to kW
      let totalRequestedLoadKw = (aggregateLoad._sum.currentPower || 0) / 1000;

      // Fallback: If no currentPower is reported, we fallback to theoretical capacity
      if (totalRequestedLoadKw === 0) {
        totalRequestedLoadKw = activeTransactions.reduce(
          (sum, tx) => sum + (tx.charger.power_capacity || 0),
          0
        );
      }

      if (totalRequestedLoadKw <= group.maxPower) {
        logger.debug(`Charge Group ${groupId} load (${totalRequestedLoadKw.toFixed(1)}kW) within limit (${group.maxPower}kW). Clearing any existing load management profiles.`);
        for (const tx of activeTransactions) {
          await this.clearLoadManagementProfile(tx.charger_id).catch((err: any) => logger.error(`Failed to clear power load management profile ${tx.charger_id}: ${err}`));
        }
        return;
      }

      logger.info(`Charge Group ${groupId} load (${totalRequestedLoadKw.toFixed(1)}kW) exceeds limit (${group.maxPower}kW). Balancing load...`);

      const limitPerTransaction = group.maxPower / activeTransactions.length;

      for (const tx of activeTransactions) {
        const profileRequest: SetChargingProfileRequest = {
          chargerId: tx.charger_id,
          connectorId: 0,
          csChargingProfiles: {
            chargingProfileId: 100, // Static ID representing Load Management
            stackLevel: 1,
            chargingProfilePurpose: "ChargePointMaxProfile",
            chargingProfileKind: "Absolute",
            chargingSchedule: {
              chargingRateUnit: "W",
              chargingSchedulePeriod: [
                {
                  startPeriod: 0,
                  limit: limitPerTransaction * 1000
                }
              ]
            }
          }
        };

        await this.dispatchChargingProfiles(profileRequest).catch((err: any) => logger.error(`Failed to dispatch power throttle profile ${tx.charger_id}: ${err}`));
      }
    } catch (error) {
      logger.error(`Error in balanceChargeGroupLoad for group ${groupId}: ${error}`);
    }
  }

  /**
   * Dispatch a ChargingProfile and save it to the database
   */
  async dispatchChargingProfiles(request: SetChargingProfileRequest): Promise<void> {
    try {
      const response = await setChargingProfile(request);

      if (response.status === "Accepted") {
        logger.info(`Charging profile accepted by charger ${request.chargerId}`);

        // Save applied profile to DB
        await prisma.chargingProfile.upsert({
          where: {
            chargerId_chargingProfileId: {
              chargerId: request.chargerId,
              chargingProfileId: request.csChargingProfiles.chargingProfileId
            }
          },
          update: {
            connectorId: request.connectorId,
            stackLevel: request.csChargingProfiles.stackLevel,
            chargingProfilePurpose: request.csChargingProfiles.chargingProfilePurpose,
            chargingProfileKind: request.csChargingProfiles.chargingProfileKind,
            recurrencyKind: request.csChargingProfiles.recurrencyKind,
            validFrom: request.csChargingProfiles.validFrom ? new Date(request.csChargingProfiles.validFrom) : null,
            validTo: request.csChargingProfiles.validTo ? new Date(request.csChargingProfiles.validTo) : null,
            chargingSchedule: request.csChargingProfiles.chargingSchedule as any
          },
          create: {
            chargerId: request.chargerId,
            connectorId: request.connectorId,
            chargingProfileId: request.csChargingProfiles.chargingProfileId,
            stackLevel: request.csChargingProfiles.stackLevel,
            chargingProfilePurpose: request.csChargingProfiles.chargingProfilePurpose,
            chargingProfileKind: request.csChargingProfiles.chargingProfileKind,
            recurrencyKind: request.csChargingProfiles.recurrencyKind,
            validFrom: request.csChargingProfiles.validFrom ? new Date(request.csChargingProfiles.validFrom) : null,
            validTo: request.csChargingProfiles.validTo ? new Date(request.csChargingProfiles.validTo) : null,
            chargingSchedule: request.csChargingProfiles.chargingSchedule as any
          }
        });
      } else {
        logger.warn(`Charging profile rejected by charger ${request.chargerId}`);
      }
    } catch (error) {
      logger.error(`Error dispatching charging profile: ${error}`);
    }
  }

  /**
   * Clear the load management profile from a charger
   */
  async clearLoadManagementProfile(chargerId: number): Promise<void> {
    try {
      const response = await clearChargingProfile({
        chargerId,
        id: 100, // ID of our load management profile
        chargingProfilePurpose: "ChargePointMaxProfile"
      });

      if (response.status === "Accepted") {
        logger.info(`Load management profile cleared for charger ${chargerId}`);
        await prisma.chargingProfile.deleteMany({
          where: {
            chargerId: chargerId,
            chargingProfileId: 100
          }
        });
      }
    } catch (error) {
      logger.error(`Error clearing load management profile for charger ${chargerId}: ${error}`);
    }
  }
}

export const loadManagementService = new LoadManagementService();
