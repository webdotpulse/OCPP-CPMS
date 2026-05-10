import { prisma } from "../config/database.js";
import { redisClient } from "../config/redis.js";
import { logger } from "../utils/logger.js";
import { MeterValuePayload } from "../services/MeterValueService.js";

export async function normalizeMeterValues(
  chargerId: number,
  payload: MeterValuePayload,
  rules?: any
): Promise<MeterValuePayload> {
  try {
    if (!rules) {
      return payload;
    }

    let { energyValue, powerValue, voltageValue, currentValue, timestamp, transactionId } = payload;

    // Apply calculatePowerFromVoltageAndCurrent
    if (rules.calculatePowerFromVoltageAndCurrent && (!powerValue || powerValue === 0)) {
      if (voltageValue != null && currentValue != null) {
        powerValue = voltageValue * currentValue;
        logger.debug(`[Quirk] Calculated power: ${powerValue}W for charger ${chargerId}`);
      }
    }

    // Apply energyMultiplier
    if (rules.energyMultiplier && energyValue) {
      energyValue = energyValue * rules.energyMultiplier;
    }

    // Apply estimateEnergyFromPower
    if (rules.estimateEnergyFromPower) {
      const redisKeyLastTime = `quirk:last_time:${transactionId}`;
      const redisKeyTotalEnergy = `quirk:total_energy:${transactionId}`;

      const lastTimeStr = await redisClient.get(redisKeyLastTime);
      const totalEnergyStr = await redisClient.get(redisKeyTotalEnergy);

      let totalEnergy = totalEnergyStr ? parseFloat(totalEnergyStr) : (energyValue || 0);

      if (lastTimeStr) {
        const lastTime = new Date(lastTimeStr);
        const currentTime = new Date(timestamp);
        const elapsedHours = (currentTime.getTime() - lastTime.getTime()) / (1000 * 60 * 60);

        if (elapsedHours > 0 && powerValue) {
          // Estimate energy consumed in this interval (powerValue is usually in Watts, energy in Wh)
          // If powerValue is W, elapsedHours * powerValue gives Wh.
          const energyIncrement = powerValue * elapsedHours;
          totalEnergy += energyIncrement;
          energyValue = totalEnergy;
          logger.debug(`[Quirk] Estimated energy increment: ${energyIncrement}Wh, total: ${totalEnergy}Wh for charger ${chargerId}`);
        }
      } else {
        // First reading
        if (!totalEnergy) totalEnergy = energyValue || 0;
      }

      await redisClient.set(redisKeyLastTime, new Date(timestamp).toISOString());
      await redisClient.set(redisKeyTotalEnergy, totalEnergy.toString());

      // Expire keys after 24 hours of inactivity
      await redisClient.expire(redisKeyLastTime, 86400);
      await redisClient.expire(redisKeyTotalEnergy, 86400);
    }

    return {
      ...payload,
      energyValue,
      powerValue,
    };
  } catch (error) {
    logger.error(`Error in normalizeMeterValues for charger ${chargerId}: ${error}`);
    return payload; // Return original payload on error
  }
}
