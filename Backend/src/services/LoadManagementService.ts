import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";
import { setChargingProfile, clearChargingProfile } from "../ocpp/remoteControl.js";
import type { SetChargingProfileRequest } from "../types/index.js";

export class LoadManagementService {
  private isEngineRunning = false;
  private timeoutId?: NodeJS.Timeout;

  public startSmartChargingEngine() {
    if (this.isEngineRunning) return;
    this.isEngineRunning = true;
    this.runSmartChargingLoop();
  }

  public stopSmartChargingEngine() {
    this.isEngineRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  private async runSmartChargingLoop() {
    if (!this.isEngineRunning) return;

    try {
      // Pre-fetch all active transactions and group them by chargeGroupId
      const allActiveTransactions = await prisma.transaction.findMany({
        where: {
          status: { in: ["initiated", "charging"] },
          charger: { chargeGroupId: { not: null } }
        },
        include: { charger: true }
      });

      const txsByGroupId = new Map<number, typeof allActiveTransactions>();
      const groupIds = new Set<number>();

      for (const tx of allActiveTransactions) {
        const groupId = tx.charger.chargeGroupId;
        if (groupId) {
          groupIds.add(groupId);
          if (!txsByGroupId.has(groupId)) {
            txsByGroupId.set(groupId, []);
          }
          txsByGroupId.get(groupId)!.push(tx);
        }
      }

      if (groupIds.size > 0) {
        const activeGroups = await prisma.chargeGroup.findMany({
          where: { id: { in: Array.from(groupIds) } }
        });

        for (const group of activeGroups) {
          const activeTransactions = txsByGroupId.get(group.id) || [];
          await this.balanceChargeGroupLoadWithData(group, activeTransactions).catch((err: any) =>
            logger.error(`Smart Charging engine error for group ${group.id}: ${err}`)
          );
        }
      }
    } catch (error) {
      logger.error(`Smart Charging engine global error: ${error}`);
    } finally {
      // Recursive algorithm: schedule next run after 60 seconds
      if (this.isEngineRunning) {
        this.timeoutId = setTimeout(() => this.runSmartChargingLoop(), 60 * 1000);
      }
    }
  }
  /**
   * Calculate the total current power draw for a specific site
   */
  async calculateSiteLoad(stationId: number): Promise<number> {
    const aggregateLoad = await prisma.transaction.aggregate({
      where: {
        status: { in: ["initiated", "charging"] },
        charger: { charging_station_id: stationId }
      },
      _sum: {
        currentPower: true
      }
    });

    return (aggregateLoad._sum.currentPower || 0) / 1000;
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
        const clearPromises = activeTransactions.map(tx => this.clearLoadManagementProfile(tx.charger_id, 100));
        const clearResults = await Promise.allSettled(clearPromises);
        clearResults.forEach((result, index) => {
          if (result.status === "rejected") {
            logger.error(`Failed to clear load management profile for charger ${activeTransactions[index].charger_id}: ${result.reason}`);
          }
        });
        return;
      }

      // If ACTUAL active load exceeds safe limit, or if limits are needed to prevent going over.
      // (If theoretical > safe limit, we must always enforce limits to be safe)
      logger.info(`Station ${stationId} load (Active: ${totalActiveLoadKw.toFixed(1)}kW, Theoretical: ${theoreticalMaxLoadKw.toFixed(1)}kW) requires load balancing (Safe Limit: ${safeLimitKw.toFixed(1)}kW).`);

      // Dynamic Equal Distribution:
      // (In a more advanced implementation, this could allocate more to cars drawing more,
      //  but equal distribution guarantees fairness and prevents starvation).
      const limitPerTransactionKw = Math.max(1.4, safeLimitKw / activeTransactions.length);
      const limitW = Math.floor(limitPerTransactionKw * 1000);

      // Pre-fetch all relevant charging profiles in a single query
      const chargerIds = activeTransactions.map(tx => tx.charger_id);
      const existingProfilesList = await prisma.chargingProfile.findMany({
        where: { chargerId: { in: chargerIds }, chargingProfileId: 100 }
      });
      const existingProfilesMap = new Map(existingProfilesList.map(p => [p.chargerId, p]));

      // Apply the limits via SetChargingProfile
      const dispatchPromises: Promise<void>[] = [];
      const txsWithPromises: typeof activeTransactions = [];

      for (const tx of activeTransactions) {
        // Skip dispatch if profile already exists with exact limit
        const existingProfile = existingProfilesMap.get(tx.charger_id);

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

        dispatchPromises.push(this.dispatchChargingProfiles(profileRequest));
        txsWithPromises.push(tx);
      }

      if (dispatchPromises.length > 0) {
        const dispatchResults = await Promise.allSettled(dispatchPromises);
        dispatchResults.forEach((result, index) => {
          if (result.status === "rejected") {
            logger.error(`Failed to dispatch charging profile for charger ${txsWithPromises[index].charger_id}: ${result.reason}`);
          }
        });
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

      await this.balanceChargeGroupLoadWithData(group, activeTransactions);
    } catch (error) {
      logger.error(`Error in balanceChargeGroupLoad for group ${groupId}: ${error}`);
    }
  }

  async balanceChargeGroupLoadWithData(group: any, activeTransactions: any[]): Promise<void> {
    try {
      const groupId = group.id;
      if (activeTransactions.length === 0) return;

      // Calculate theoretical max power capacity of the chargers to prevent oscillation when clearing
      let theoreticalMaxLoadKw = activeTransactions.reduce(
        (sum, tx) => sum + (tx.charger.power_capacity || 0),
        0
      );

      // --- 1. AMPERAGE BALANCING ---
      if (group.maxAmperage) {
        // Find ACTUAL active current from in-memory array
        let totalActiveCurrent = activeTransactions.reduce((sum, tx) => sum + (tx.current || 0), 0);

        const safeLimitAmps = group.maxAmperage * 0.95;

        // Calculate theoretical max current based on power capacity (assuming 230V per phase, or just a rough max estimate).
        // A safer way is estimating max amperage from the power capacity. E.g. 22kW -> ~32A (3-phase)
        let theoreticalMaxCurrentAmps = activeTransactions.reduce((sum, tx) => {
          // If power capacity exists, estimate max amps. Using a conservative estimate of 32A max per typical AC charger.
          // Or just using total active transactions * 32A.
          const estimatedMaxTxAmps = tx.charger.power_capacity ? Math.ceil((tx.charger.power_capacity * 1000) / (230 * 3)) : 32;
          return sum + Math.max(32, estimatedMaxTxAmps); // Default to at least 32A assumption per charger
        }, 0);

        if (theoreticalMaxCurrentAmps <= safeLimitAmps) {
          logger.debug(`Charge Group ${groupId} theoretical current (${theoreticalMaxCurrentAmps.toFixed(1)}A) within safe limit (${safeLimitAmps.toFixed(1)}A). Clearing any existing amp load management profiles.`);
          const clearPromises = activeTransactions.map(tx => this.clearLoadManagementProfile(tx.charger_id, 101));
          const clearResults = await Promise.allSettled(clearPromises);
          clearResults.forEach((result, index) => {
            if (result.status === "rejected") {
              logger.error(`Failed to clear amp load management profile for charger ${activeTransactions[index].charger_id}: ${result.reason}`);
            }
          });
        } else {
          logger.info(`Charge Group ${groupId} active current (${totalActiveCurrent.toFixed(1)}A, Theoretical: ${theoreticalMaxCurrentAmps.toFixed(1)}A) requires load balancing (Safe Limit: ${safeLimitAmps.toFixed(1)}A).`);

          // Prioritize older transactions; suspend others if safe limit drops below 6A per active transaction
          const sortedTransactions = [...activeTransactions].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
          const maxActiveChargers = Math.max(1, Math.floor(safeLimitAmps / 6)); // At least 1 to avoid divide-by-zero
          const activeCount = Math.min(sortedTransactions.length, maxActiveChargers);
          const limitPerTransactionAmps = Math.floor(safeLimitAmps / activeCount);

          const chargerIds = activeTransactions.map(tx => tx.charger_id);
          const existingAmpProfilesList = await prisma.chargingProfile.findMany({
            where: { chargerId: { in: chargerIds }, chargingProfileId: 101 }
          });
          const existingAmpProfilesMap = new Map(existingAmpProfilesList.map(p => [p.chargerId, p]));

          const dispatchPromises: Promise<void>[] = [];
          const txsWithPromises: typeof activeTransactions = [];

          for (let i = 0; i < sortedTransactions.length; i++) {
            const tx = sortedTransactions[i];
            const currentTxLimitAmps = i < activeCount ? limitPerTransactionAmps : 0;

            const existingProfile = existingAmpProfilesMap.get(tx.charger_id);

            const existingSchedule = existingProfile?.chargingSchedule as any;
            const currentLimitAmps = existingSchedule?.chargingSchedulePeriod?.[0]?.limit;

            if (existingProfile && currentLimitAmps === currentTxLimitAmps) {
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
                      limit: currentTxLimitAmps
                    }
                  ]
                }
              }
            };

            // Dispatch profile to throttle
            dispatchPromises.push(this.dispatchChargingProfiles(profileRequest));
            txsWithPromises.push(tx);
          }

          if (dispatchPromises.length > 0) {
            const dispatchResults = await Promise.allSettled(dispatchPromises);
            dispatchResults.forEach((result, index) => {
              if (result.status === "rejected") {
                logger.error(`Failed to dispatch amp throttle profile for tx ${txsWithPromises[index].id}: ${result.reason}`);
              }
            });
          }
        }
      }

      // --- 2. POWER BALANCING ---
      if (!group.maxPower) return;

      const safeLimitKw = group.maxPower * 0.95;

      // Find ACTUAL active load from in-memory array
      let totalActiveLoadKw = activeTransactions.reduce((sum, tx) => sum + ((tx.currentPower || 0) / 1000), 0);

      // CLEAR limits based on THEORETICAL max load to prevent oscillation
      if (theoreticalMaxLoadKw <= safeLimitKw) {
        logger.debug(`Charge Group ${groupId} theoretical load (${theoreticalMaxLoadKw.toFixed(1)}kW) within safe limit (${safeLimitKw.toFixed(1)}kW). Clearing any existing load management profiles.`);
        const clearPromises = activeTransactions.map(tx => this.clearLoadManagementProfile(tx.charger_id, 100));
        const clearResults = await Promise.allSettled(clearPromises);
        clearResults.forEach((result, index) => {
          if (result.status === "rejected") {
            logger.error(`Failed to clear power load management profile for charger ${activeTransactions[index].charger_id}: ${result.reason}`);
          }
        });
        return;
      }

      // APPLY limits based on ACTUAL load or if theoretical limit enforces it
      logger.info(`Charge Group ${groupId} load (Active: ${totalActiveLoadKw.toFixed(1)}kW, Theoretical: ${theoreticalMaxLoadKw.toFixed(1)}kW) requires load balancing (Safe Limit: ${safeLimitKw.toFixed(1)}kW).`);

      // Prioritize older transactions; suspend others if safe limit drops below 1.4kW per active transaction
      const sortedTransactionsKw = [...activeTransactions].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      const maxActiveChargersKw = Math.max(1, Math.floor(safeLimitKw / 1.4));
      const activeCountKw = Math.min(sortedTransactionsKw.length, maxActiveChargersKw);
      const limitPerTransactionKw = safeLimitKw / activeCountKw;

      const chargerIdsKw = activeTransactions.map(tx => tx.charger_id);
      const existingPowerProfilesList = await prisma.chargingProfile.findMany({
        where: { chargerId: { in: chargerIdsKw }, chargingProfileId: 100 }
      });
      const existingPowerProfilesMap = new Map(existingPowerProfilesList.map(p => [p.chargerId, p]));

      const dispatchPromises: Promise<void>[] = [];
      const txsWithPromises: typeof activeTransactions = [];

      for (let i = 0; i < sortedTransactionsKw.length; i++) {
        const tx = sortedTransactionsKw[i];
        const limitW = i < activeCountKw ? Math.floor(limitPerTransactionKw * 1000) : 0;

        const existingProfile = existingPowerProfilesMap.get(tx.charger_id);

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

        dispatchPromises.push(this.dispatchChargingProfiles(profileRequest));
        txsWithPromises.push(tx);
      }

      if (dispatchPromises.length > 0) {
        const dispatchResults = await Promise.allSettled(dispatchPromises);
        dispatchResults.forEach((result, index) => {
          if (result.status === "rejected") {
            logger.error(`Failed to dispatch power throttle profile for charger ${txsWithPromises[index].charger_id}: ${result.reason}`);
          }
        });
      }
    } catch (error) {
      logger.error(`Error in balanceChargeGroupLoadWithData for group ${group.id}: ${error}`);
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
      throw error;
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
      throw error;
    }
  }
}

export const loadManagementService = new LoadManagementService();
