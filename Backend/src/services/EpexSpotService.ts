import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";
import { CountryCode } from "@prisma/client";

/**
 * Service to fetch and manage EPEX Spot prices.
 */
export class EpexSpotService {
  /**
   * Fetches the day-ahead prices for the given country and date.
   * This is currently a mock implementation.
   */
  static async fetchDayAheadPrices(country: CountryCode, targetDate: Date): Promise<void> {
    logger.info(`Fetching EPEX Spot prices for ${country} on ${targetDate.toISOString()}`);

    // Mock data: Generate 24 hourly prices for the target date
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const pricesToInsert = [];
    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date(startOfDay);
      timestamp.setUTCHours(hour);

      // Generate a mock price between 20 and 150 EUR/MWh
      // Introduce a peak between hour 17 and 20
      let pricePerMwh = 20 + Math.random() * 50;
      if (hour >= 17 && hour <= 20) {
        pricePerMwh += 50 + Math.random() * 30; // Peak hours
      }

      pricesToInsert.push({
        timestamp,
        country,
        pricePerMwh,
      });
    }

    try {
      // Use upsert to handle potential duplicates for the same hour/country
      for (const price of pricesToInsert) {
        await prisma.epexSpotPrice.upsert({
          where: {
            timestamp_country: {
              timestamp: price.timestamp,
              country: price.country,
            },
          },
          update: {
            pricePerMwh: price.pricePerMwh,
          },
          create: {
            timestamp: price.timestamp,
            country: price.country,
            pricePerMwh: price.pricePerMwh,
          },
        });
      }
      logger.info(`Successfully stored ${pricesToInsert.length} EPEX Spot prices for ${country}.`);
    } catch (error) {
      logger.error(`Failed to store EPEX Spot prices for ${country}: ${error}`);
    }
  }

  /**
   * Helper to fetch prices for both BE and NL for tomorrow.
   */
  static async fetchPricesForTomorrow(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await this.fetchDayAheadPrices("BE", tomorrow);
    await this.fetchDayAheadPrices("NL", tomorrow);
  }
}
