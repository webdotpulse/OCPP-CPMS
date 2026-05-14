import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";
import axios from "axios";

export class EpexSpotService {
  private static workerIntervalId: NodeJS.Timeout | null = null;

  public static async fetchAndStoreDayAheadPrices() {
    try {
      logger.info("Fetching day-ahead EPEX spot prices...");

      const countries = ["BE", "NL"];

      const baseUrl = process.env.EPEX_SPOT_API_URL || "https://api.energy-charts.info/price";

      for (const country of countries) {
        try {
          const url = `${baseUrl}?bzn=${country}`;
          logger.info(`Fetching prices from ${url}`);

          const response = await axios.get(url, { timeout: 10000 });
          const data = response.data;

          if (!data || !Array.isArray(data.unix_seconds) || !Array.isArray(data.price)) {
            throw new Error(`Invalid data format received for ${country}`);
          }

          const { unix_seconds, price } = data;

          if (unix_seconds.length !== price.length) {
             throw new Error(`Mismatch between timestamps and prices arrays for ${country}`);
          }

          const operations = [];
          for (let i = 0; i < unix_seconds.length; i++) {
            const timestamp = new Date(unix_seconds[i] * 1000);
            const pricePerMwh = price[i];

            // Validate price format
            if (typeof pricePerMwh !== 'number') continue;

            operations.push(
              prisma.epexSpotPrice.upsert({
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
              })
            );
          }

          // Execute in transactions/batches to avoid locking issues
          // Using smaller chunks
          const chunkSize = 50;
          for (let i = 0; i < operations.length; i += chunkSize) {
            const chunk = operations.slice(i, i + chunkSize);
            await prisma.$transaction(chunk);
          }

          logger.info(`Successfully processed ${operations.length} prices for ${country}`);
        } catch (countryError) {
          logger.error(`Error fetching/processing EPEX prices for country ${country}: ${countryError}`);
        }
      }

      logger.info("Successfully fetched and stored day-ahead EPEX spot prices.");
    } catch (error) {
      logger.error(`Error in EPEX spot price fetch worker: ${error}`);
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
