import "dotenv/config";
import { startServers } from "./app.js";
import { logger } from "./utils/logger.js";
import { MeterValueService } from "./services/MeterValueService.js";

// Start all servers
startServers();

// Start background workers
MeterValueService.startWorker();

logger.info("Starting Open-Source OCPP CMS...");
