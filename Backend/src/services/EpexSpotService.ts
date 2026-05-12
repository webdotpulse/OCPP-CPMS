import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";

export class EpexSpotService {
  private static workerIntervalId: NodeJS.Timeout | null = null;

  public static async fetchAndStoreDayAheadPrices() {
    try {
      logger.info("Fetching day-ahead EPEX spot prices...");

      const now = new Date();
      now.setMinutes(0, 0, 0); // Start at current hour

      const countries = ["BE", "NL"];

      for (const country of countries) {
        // Generate mock prices for the next 24 hours
        for (let i = 0; i < 24; i++) {
          const timestamp = new Date(now.getTime() + i * 60 * 60 * 1000);

          // Generate a semi-realistic spot price between 20 and 150 EUR/MWh
          // Randomness seeded simply for mocking purposes
          const basePrice = 50;
          const randomVariation = Math.random() * 100 - 20;

          // Add diurnal curve (higher in morning and evening)
          const hour = timestamp.getHours();
          const timeMultiplier = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 21) ? 1.5 : 0.8;

          const pricePerMwh = Math.max(0, (basePrice + randomVariation) * timeMultiplier);

          await prisma.epexSpotPrice.upsert({
            where: {
              timestamp_country: {
                timestamp,
                country,
              },
            },
            update: {
              pricePerMwh,
            },
            create: {
              timestamp,
              country,
              pricePerMwh,
            },
          });
        }
      }

      logger.info("Successfully fetched and stored day-ahead EPEX spot prices.");
    } catch (error) {
      logger.error(`Error fetching EPEX spot prices: ${error}`);
    }
  }

  public static startEpexWorker() {
    // Run immediately on startup
    this.fetchAndStoreDayAheadPrices();

    // Schedule to run daily (e.g., every 24 hours)
    const twentyFourHours = 24 * 60 * 60 * 1000;
    this.workerIntervalId = setInterval(() => {
      this.fetchAndStoreDayAheadPrices();
    }, twentyFourHours);

    logger.info("Started EPEX Spot Service worker");
  }

  public static async getPriceForTimestamp(country: string, timestamp: Date): Promise<number | null> {
    try {
      // Find the specific hour for the timestamp
      const targetTime = new Date(timestamp);
      targetTime.setMinutes(0, 0, 0);

      const priceRecord = await prisma.epexSpotPrice.findUnique({
        where: {
          timestamp_country: {
            timestamp: targetTime,
            country,
          },
        },
      });

      if (priceRecord) {
        return priceRecord.pricePerMwh;
      }

      // Fallback: get the most recent price for the country if the exact hour isn't found
      const latestPrice = await prisma.epexSpotPrice.findFirst({
        where: { country },
        orderBy: { timestamp: "desc" },
      });

      if (latestPrice) {
        logger.warn(`Exact EPEX price not found for ${country} at ${targetTime.toISOString()}. Using latest available price.`);
        return latestPrice.pricePerMwh;
      }

      return null;
    } catch (error) {
      logger.error(`Error getting EPEX price for timestamp: ${error}`);
      return null;
    }
  }
}
