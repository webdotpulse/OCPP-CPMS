import cron from "node-cron";
import { EmsTelemetrySyncService } from "../services/EmsTelemetrySyncService.js";
import { logger } from "../utils/logger.js";

export function startTelemetrySyncCron() {
  // Sync every 1 minute
  cron.schedule("* * * * *", async () => {
    logger.info("Running EMS Telemetry Sync Cron...");
    await EmsTelemetrySyncService.syncToDatabase();
  });
  logger.info("EMS Telemetry Sync Cron started (runs every 1 minute)");
}
