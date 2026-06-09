import cron from "node-cron";
import { logger } from "../utils/logger.js";
import { PredictiveBalancingService } from "../services/PredictiveBalancingService.js";

// Run every hour on the hour (0 * * * *)
cron.schedule("0 * * * *", async () => {
  try {
    logger.info("Starting scheduled predictive balancing schedule generation...");
    await PredictiveBalancingService.generateSchedulesForAll();
    logger.info("Completed predictive balancing schedule generation.");
  } catch (error) {
    logger.error(`Error in predictive balancing cron job: ${error}`);
  }
});
