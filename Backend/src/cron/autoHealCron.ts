import cron from "node-cron";
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";
import { resetCharger, unlockConnector } from "../ocpp/remoteControl.js";

// Run every 5 minutes
export function startAutoHealCron() {
  cron.schedule("*/5 * * * *", async () => {
    logger.info("Running auto-heal background worker...");
    try {
      const rules = await prisma.autoHealRule.findMany({ where: { isActive: true } });
      if (rules.length === 0) return;

      const faultEvents = await prisma.diagnosticEvent.findMany({
        where: {
          resolved: false,
          type: "FaultedState", // or HighTemperature
        },
      });

      for (const event of faultEvents) {
        for (const rule of rules) {
           if (event.type === "FaultedState" && (rule.triggerCondition === "Status: Faulted" || rule.triggerCondition === "Status: SuspendedEVSE")) {
             logger.info(`Triggering auto-heal for charger ${event.chargerId} due to rule ${rule.id}`);

             try {
                if (rule.actionCommand === "Send SoftReset") {
                   await resetCharger(event.chargerId, "Soft");
                } else if (rule.actionCommand === "Send UnlockConnector" && event.connectorId) {
                   await unlockConnector(event.chargerId, event.connectorId);
                }

                await prisma.diagnosticEvent.create({
                   data: {
                     chargerId: event.chargerId,
                     connectorId: event.connectorId,
                     type: "AutoHealAttempt",
                     description: `Triggered by rule ${rule.id}. Executed ${rule.actionCommand}.`
                   }
                });

                // Assuming auto heal resolves it temporarily or we wait for next ping
                await prisma.diagnosticEvent.update({
                  where: { id: event.id },
                  data: { resolved: true }
                });

             } catch (actionErr) {
                logger.error(`Autoheal action failed: ${actionErr}`);
             }
           }
        }
      }
    } catch (error) {
      logger.error(`Error in auto-heal cron: ${error}`);
    }
  });
}
