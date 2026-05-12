import cron from "node-cron";
import { logger } from "../utils/logger.js";
import { EpexSpotService } from "../services/EpexSpotService.js";

/**
 * Initializes all cron jobs.
 */
export function initCronJobs() {
  logger.info("Initializing cron jobs...");

  // Fetch EPEX day-ahead prices daily at 14:00 CET
  // We use standard server time here, assuming it matches CET or adjusting standard cron expression.
  // "0 14 * * *" means at 14:00 every day
  cron.schedule("0 14 * * *", async () => {
    logger.info("Cron Job triggered: Fetching EPEX Spot prices for tomorrow.");
    try {
      await EpexSpotService.fetchPricesForTomorrow();
    } catch (error) {
      logger.error(`Error in EPEX Spot price cron job: ${error}`);
    }
  }, {
    timezone: "Europe/Brussels" // CET/CEST timezone for BE/NL markets
  });

  logger.info("Cron jobs initialized.");
}
