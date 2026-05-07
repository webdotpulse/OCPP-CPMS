import { redisClient } from "../config/redis.js";
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";

const STREAM_KEY = "meter_values_stream";
const GROUP_NAME = "meter_values_group";
const CONSUMER_NAME = "worker_1";
const BATCH_SIZE = 1000;

export interface MeterValuePayload {
  transactionId: string;
  chargerId: number;
  connectorId?: number;
  energyValue: number;
  powerValue: number;
  socValue: number | null;
  currentValue: number | null;
  voltageValue: number | null;
  timestamp: Date;
}

export class MeterValueService {
  private static isProcessing = false;
  private static workerRunning = false;

  /**
   * Initializes the Redis consumer group.
   */
  public static async initGroup(): Promise<void> {
    try {
      await redisClient.xgroup("CREATE", STREAM_KEY, GROUP_NAME, "0", "MKSTREAM");
    } catch (error: any) {
      if (!error.message.includes("BUSYGROUP")) {
        logger.error(`Error creating consumer group: ${error}`);
      }
    }
  }

  /**
   * Pushes a new meter value payload to the Redis Stream.
   */
  public static async addMeterValue(payload: MeterValuePayload): Promise<void> {
    try {
      await redisClient.xadd(STREAM_KEY, "*", "payload", JSON.stringify(payload));
    } catch (error) {
      logger.error(`Error adding meter value to stream: ${error}`);
    }
  }

  /**
   * Starts the background worker to process meter values in batches using streams.
   */
  public static async startWorker(): Promise<void> {
    if (this.workerRunning) return;
    this.workerRunning = true;

    await this.initGroup();
    logger.info("MeterValueService background stream worker started.");

    // Run the worker loop asynchronously
    this.runWorkerLoop().catch((err) => {
      logger.error(`MeterValueService worker loop error: ${err}`);
      this.workerRunning = false;
    });
  }

  /**
   * Stops the background worker.
   */
  public static stopWorker(): void {
    this.workerRunning = false;
  }

  private static async runWorkerLoop(): Promise<void> {
    while (this.workerRunning) {
      if (this.isProcessing) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      this.isProcessing = true;

      try {
        // Read from the stream, blocking for up to 5000ms
        const result = (await redisClient.xreadgroup(
          "GROUP",
          GROUP_NAME,
          CONSUMER_NAME,
          "COUNT",
          BATCH_SIZE,
          "BLOCK",
          5000,
          "STREAMS",
          STREAM_KEY,
          ">"
        )) as any;

        if (!result || result.length === 0) {
          this.isProcessing = false;
          continue;
        }

        const streamEntries = result[0][1]; // result[0] is [STREAM_KEY, entries]
        if (streamEntries.length === 0) {
          this.isProcessing = false;
          continue;
        }

        const payloads: MeterValuePayload[] = [];
        const entryIds: string[] = [];

        for (const entry of streamEntries) {
          const id = entry[0];
          const fields = entry[1]; // array of keys and values ['payload', '{...}']

          let payloadStr = "";
          for (let i = 0; i < fields.length; i += 2) {
            if (fields[i] === "payload") {
              payloadStr = fields[i + 1];
              break;
            }
          }

          if (payloadStr) {
            payloads.push(JSON.parse(payloadStr));
            entryIds.push(id);
          }
        }

        if (payloads.length > 0) {
          // Batch insert into MeterValue
          const meterValueData = payloads.map((p) => ({
            transactionId: p.transactionId,
            chargerId: p.chargerId,
            connectorId: p.connectorId,
            energy: p.energyValue,
            power: p.powerValue,
            soc: p.socValue,
            current: p.currentValue,
            voltage: p.voltageValue,
            timestamp: new Date(p.timestamp),
          }));

          await prisma.meterValue.createMany({
            data: meterValueData,
            skipDuplicates: true,
          });

          // Group by transactionId to merge the values, keeping the most recent non-null/non-zero values
          const latestValuesByTx = new Map<string, MeterValuePayload>();
          for (const p of payloads) {
            if (latestValuesByTx.has(p.transactionId)) {
              const existing = latestValuesByTx.get(p.transactionId)!;
              latestValuesByTx.set(p.transactionId, {
                ...existing,
                ...p,
                // Ensure partial metrics are not lost if a subsequent payload omits them
                energyValue: p.energyValue || existing.energyValue,
                powerValue: p.powerValue || existing.powerValue,
                socValue: p.socValue !== null ? p.socValue : existing.socValue,
                currentValue: p.currentValue !== null ? p.currentValue : existing.currentValue,
                voltageValue: p.voltageValue !== null ? p.voltageValue : existing.voltageValue,
                timestamp: new Date(Math.max(existing.timestamp.getTime(), p.timestamp.getTime())),
              });
            } else {
              latestValuesByTx.set(p.transactionId, p);
            }
          }

          // Update Transactions and RfidSessions
          for (const [transactionId, latest] of latestValuesByTx.entries()) {
            const txUpdateData = {
              energyConsumed: latest.energyValue,
              currentPower: latest.powerValue,
              ...(latest.socValue !== null && { soc: latest.socValue }),
              ...(latest.currentValue !== null && { current: latest.currentValue }),
              ...(latest.voltageValue !== null && { voltage: latest.voltageValue }),
              status: "charging",
            };

            await prisma.transaction.updateMany({
              where: { transactionId },
              data: txUpdateData,
            });

            await prisma.rfidSession.updateMany({
              where: { transactionId },
              data: txUpdateData,
            });
          }

          // Acknowledge processed entries to prevent data loss
          await redisClient.xack(STREAM_KEY, GROUP_NAME, ...entryIds);
          logger.debug(`MeterValueService processed and acknowledged ${payloads.length} entries.`);
        }
      } catch (error) {
        logger.error(`Error processing meter values stream: ${error}`);
      } finally {
        this.isProcessing = false;
      }
    }
  }
}
