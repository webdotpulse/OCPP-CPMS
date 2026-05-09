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

      // 1) Find ACTUAL active load (what the cars are currently drawing).
      // We use actual load to know when a site is overloaded, so dynamic limits can kick in.
      const aggregateLoad = await prisma.transaction.aggregate({
        where: {
          status: { in: ["initiated", "charging"] },
          charger: { charging_station_id: stationId }
        },
        _sum: {
          currentPower: true
        }
      });

      let totalActiveLoadKw = (aggregateLoad._sum.currentPower || 0) / 1000;

      // Fallback: If no currentPower is reported, fallback to theoretical capacity
      if (totalActiveLoadKw === 0) {
        totalActiveLoadKw = activeTransactions.reduce(
          (sum, tx) => sum + (tx.charger.power_capacity || 0),
          0
        );
      }

      // 2) Find THEORETICAL max load (what the chargers COULD draw if unbounded).
      // We use theoretical load to decide when it's safe to CLEAR limits.
      // If we used actual load to clear limits, we'd clear them as soon as throttling
      // took effect, causing an oscillation (limit on -> load drops -> limit off -> load spikes -> limit on).
      let theoreticalMaxLoadKw = activeTransactions.reduce(
        (sum, tx) => sum + (tx.charger.power_capacity || 0),
        0
      );

      const safeLimitKw = station.maxPower * 0.95;

      // If THEORETICAL max load is safely under limits, clear limits.
      if (theoreticalMaxLoadKw <= safeLimitKw) {
        logger.debug(`Station ${stationId} theoretical load (${theoreticalMaxLoadKw.toFixed(1)}kW) within safe limit (${safeLimitKw.toFixed(1)}kW). Clearing any existing load management profiles.`);
        for (const tx of activeTransactions) {
          await this.clearLoadManagementProfile(tx.charger_id, 100);
        }
        return;
      }

      // If ACTUAL active load exceeds safe limit, or if limits are needed to prevent going over.
      // (If theoretical > safe limit, we must always enforce limits to be safe)
      logger.info(`Station ${stationId} load (Active: ${totalActiveLoadKw.toFixed(1)}kW, Theoretical: ${theoreticalMaxLoadKw.toFixed(1)}kW) requires load balancing (Safe Limit: ${safeLimitKw.toFixed(1)}kW).`);

      // Dynamic Equal Distribution:
      // (In a more advanced implementation, this could allocate more to cars drawing more,
      //  but equal distribution guarantees fairness and prevents starvation).
      const limitPerTransactionKw = safeLimitKw / activeTransactions.length;
      const limitW = Math.floor(limitPerTransactionKw * 1000);

      // Apply the limits via SetChargingProfile
      for (const tx of activeTransactions) {
        // Skip dispatch if profile already exists with exact limit
        const existingProfile = await prisma.chargingProfile.findUnique({
          where: {
            chargerId_chargingProfileId: { chargerId: tx.charger_id, chargingProfileId: 100 }
          }
        });

        const existingSchedule = existingProfile?.chargingSchedule as any;
        const currentLimitW = existingSchedule?.chargingSchedulePeriod?.[0]?.limit;

        if (existingProfile && currentLimitW === limitW) {
           continue; // Limit already applied correctly, skip redundant dispatch
        }

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
                  limit: limitW
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

      // Calculate theoretical max power capacity of the chargers to prevent oscillation when clearing
      let theoreticalMaxLoadKw = activeTransactions.reduce(
        (sum, tx) => sum + (tx.charger.power_capacity || 0),
        0
      );

      // --- 1. AMPERAGE BALANCING ---
      if (group.maxAmperage) {
        // Find ACTUAL active current
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

        const safeLimitAmps = group.maxAmperage * 0.95;

        // Since we don't have a reliable `theoretical_max_current` field per charger in Prisma,
        // we strictly throttle if the active measured current exceeds the safety margin.
        // We will clear limits only when we have enough headroom (e.g. half the safety limit) to avoid heavy oscillation,
        // or we just accept slight oscillation on Amperage until a DB field is added. For now, clear if safely below.
        if (totalActiveCurrent > safeLimitAmps) {
          logger.info(`Charge Group ${groupId} active current (${totalActiveCurrent.toFixed(1)}A) requires load balancing (Safe Limit: ${safeLimitAmps.toFixed(1)}A).`);

          const limitPerTransactionAmps = Math.floor(safeLimitAmps / activeTransactions.length);

          for (const tx of activeTransactions) {
            const existingProfile = await prisma.chargingProfile.findUnique({
              where: {
                chargerId_chargingProfileId: { chargerId: tx.charger_id, chargingProfileId: 101 }
              }
            });

            const existingSchedule = existingProfile?.chargingSchedule as any;
            const currentLimitAmps = existingSchedule?.chargingSchedulePeriod?.[0]?.limit;

            if (existingProfile && currentLimitAmps === limitPerTransactionAmps) {
               continue; // Limit already applied correctly, skip redundant dispatch
            }

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
        } else if (totalActiveCurrent < (safeLimitAmps * 0.8)) {
          // Add a simple hysteresis / headroom check to reduce Amperage oscillation:
          // Only clear limits if the active load has dropped significantly (below 80% of safe limit).
          logger.debug(`Charge Group ${groupId} active current (${totalActiveCurrent.toFixed(1)}A) is well within safe limit (${safeLimitAmps.toFixed(1)}A). Clearing any existing amp load management profiles.`);
          for (const tx of activeTransactions) {
            await this.clearLoadManagementProfile(tx.charger_id, 101).catch((err: any) => logger.error(`Failed to clear amp load management profile ${tx.charger_id}: ${err}`));
          }
        }
      }

      // --- 2. POWER BALANCING ---
      if (!group.maxPower) return;

      const safeLimitKw = group.maxPower * 0.95;

      // Find ACTUAL active load to trigger limits
      const aggregateLoad = await prisma.transaction.aggregate({
        where: {
          status: { in: ["initiated", "charging"] },
          charger: { chargeGroupId: groupId }
        },
        _sum: {
          currentPower: true
        }
      });

      let totalActiveLoadKw = (aggregateLoad._sum.currentPower || 0) / 1000;

      // Fallback
      if (totalActiveLoadKw === 0) {
        totalActiveLoadKw = activeTransactions.reduce(
          (sum, tx) => sum + (tx.charger.power_capacity || 0),
          0
        );
      }

      // CLEAR limits based on THEORETICAL max load to prevent oscillation
      if (theoreticalMaxLoadKw <= safeLimitKw) {
        logger.debug(`Charge Group ${groupId} theoretical load (${theoreticalMaxLoadKw.toFixed(1)}kW) within safe limit (${safeLimitKw.toFixed(1)}kW). Clearing any existing load management profiles.`);
        for (const tx of activeTransactions) {
          await this.clearLoadManagementProfile(tx.charger_id, 100).catch((err: any) => logger.error(`Failed to clear power load management profile ${tx.charger_id}: ${err}`));
        }
        return;
      }

      // APPLY limits based on ACTUAL load or if theoretical limit enforces it
      logger.info(`Charge Group ${groupId} load (Active: ${totalActiveLoadKw.toFixed(1)}kW, Theoretical: ${theoreticalMaxLoadKw.toFixed(1)}kW) requires load balancing (Safe Limit: ${safeLimitKw.toFixed(1)}kW).`);

      const limitPerTransactionKw = safeLimitKw / activeTransactions.length;
      const limitW = Math.floor(limitPerTransactionKw * 1000);

      for (const tx of activeTransactions) {
        const existingProfile = await prisma.chargingProfile.findUnique({
          where: {
            chargerId_chargingProfileId: { chargerId: tx.charger_id, chargingProfileId: 100 }
          }
        });

        const existingSchedule = existingProfile?.chargingSchedule as any;
        const currentLimitW = existingSchedule?.chargingSchedulePeriod?.[0]?.limit;

        if (existingProfile && currentLimitW === limitW) {
           continue; // Limit already applied correctly, skip redundant dispatch
        }

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
                  limit: limitW
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
  async clearLoadManagementProfile(chargerId: number, profileId: number = 100): Promise<void> {
    try {
      // Only clear if the profile actually exists in the database
      const existingProfile = await prisma.chargingProfile.findUnique({
        where: {
          chargerId_chargingProfileId: { chargerId, chargingProfileId: profileId }
        }
      });

      if (!existingProfile) {
        return; // Profile already cleared or never set, skip redundant dispatch
      }

      const response = await clearChargingProfile({
        chargerId,
        id: profileId,
        chargingProfilePurpose: profileId === 101 ? "TxDefaultProfile" : "ChargePointMaxProfile"
      });

      if (response.status === "Accepted") {
        logger.info(`Load management profile ${profileId} cleared for charger ${chargerId}`);
        await prisma.chargingProfile.deleteMany({
          where: {
            chargerId: chargerId,
            chargingProfileId: profileId
          }
        });
      }
    } catch (error) {
      logger.error(`Error clearing load management profile ${profileId} for charger ${chargerId}: ${error}`);
    }
  }
}

export const loadManagementService = new LoadManagementService();
