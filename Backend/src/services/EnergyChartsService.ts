import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";
import axios from "axios";

export class EnergyChartsService {
  public static async fetchAndStoreDayAheadPrices() {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

      // Check if we need to fetch
      const cetHour = (now.getUTCHours() + 1) % 24;
      const isPastPublishTime = cetHour >= 14 || (cetHour === 13 && now.getUTCMinutes() >= 30);

      const tomorrowEnd = new Date(startOfToday);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
      tomorrowEnd.setHours(23, 0, 0, 0);

      const endOfTomorrow = new Date(startOfToday);
      endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
      endOfTomorrow.setMilliseconds(-1);

      const countries = ["BE", "NL"];

      for (const country of countries) {
        const countToday = await prisma.epexSpotPrice.count({
          where: { timestamp: { gte: startOfToday }, country, provider: "Energy-Charts" }
        });

        const countTomorrow = await prisma.epexSpotPrice.count({
          where: { timestamp: tomorrowEnd, country, provider: "Energy-Charts" }
        });

        const needsFetch = countToday === 0 || (isPastPublishTime && countTomorrow === 0);

        if (needsFetch) {
          try {
            logger.info(`Fetching day-ahead EPEX spot prices for ${country} from energy-charts...`);
            const url = `https://api.energy-charts.info/price?bzn=${country}&start=${startOfToday.toISOString()}&end=${endOfTomorrow.toISOString()}`;
            const response = await axios.get(url, { timeout: 10000 });
            const data = response.data;

            if (data && Array.isArray(data.unix_seconds) && Array.isArray(data.price) && data.unix_seconds.length === data.price.length) {
              const operations = [];
              const chunkSize = 50;

              for (let i = 0; i < data.unix_seconds.length; i++) {
                const timestamp = new Date(data.unix_seconds[i] * 1000);
                const pricePerMwh = data.price[i];

                if (typeof pricePerMwh !== 'number') continue;

                // Only insert if it's within our target range
                if (timestamp >= startOfToday && timestamp <= endOfTomorrow) {
                  operations.push(
                    prisma.epexSpotPrice.upsert({
                      where: { timestamp_country_provider: { timestamp, country, provider: "Energy-Charts" } },
                      update: { pricePerMwh },
                      create: { timestamp, country, pricePerMwh, provider: "Energy-Charts" },
                    })
                  );
                }
              }

              for (let i = 0; i < operations.length; i += chunkSize) {
                await prisma.$transaction(operations.slice(i, i + chunkSize));
              }
              logger.info(`Successfully processed ${operations.length} Energy-Charts prices for ${country}.`);
            }
          } catch (error) {
            logger.error(`Error fetching/processing Energy-Charts prices for ${country}: ${error}`);
          }
        }
      }
    } catch (error) {
      logger.error(`Error in Energy-Charts spot price fetch worker: ${error}`);
    }
  }
}
