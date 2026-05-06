import { Request, Response } from "express";
import { simulatorManager } from "../../simulator/SimulatorManager.js";
import { SimulatorConfig } from "../../simulator/ChargePointSimulator.js";
import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";

export async function listSimulators(req: Request, res: Response) {
  try {
    const list = simulatorManager.getList();
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to list simulators" });
  }
}

export async function spawnSimulator(req: Request, res: Response) {
  try {
    const config: SimulatorConfig = req.body;

    if (!config.chargerId || !config.protocol || !config.type || !config.maxPowerKw) {
      return res.status(400).json({ success: false, error: "Missing required config parameters" });
    }

    // Attempt to auto-create station, charger, and connector in the DB if they don't exist
    try {
      const existing = await prisma.charger.findUnique({ where: { name: config.chargerId } });
      if (!existing) {
        // Ensure at least one station exists or create a default one
        let station = await prisma.chargingStation.findFirst();

        // Ensure we have a user (admin)
        const user = await prisma.user.findFirst({ where: { role: "admin" }});
        if (user) {
          if (!station) {
            station = await prisma.chargingStation.create({
              data: {
                station_name: "Simulated Station",
                street_name: "Virtual Street 1",
                city: "Cloud",
                postal_code: "1000",
                latitude: 0,
                longitude: 0,
                owner_id: user.id,
              }
            });
          }

          const newCharger = await prisma.charger.create({
            data: {
              name: config.chargerId,
              model: "Simulated Model",
              manufacturer: "MobilityPulse Simulator",
              serial_number: `SIM-${Date.now()}-${Math.floor(Math.random()*1000)}`,
              power_capacity: config.maxPowerKw,
              firmware_version: "1.0.0",
              service_contacts: "admin@example.com",
              owner_id: user.id,
              charging_station_id: station.id,
              status: "offline",
            }
          });

          await prisma.connector.create({
            data: {
              connector_name: "Connector 1",
              status: "Available",
              current_type: config.type,
              max_power: config.maxPowerKw,
              charger_id: newCharger.charger_id
            }
          });
          logger.info(`Auto-registered simulator ${config.chargerId} in database.`);
        }
      }
    } catch (dbErr) {
      logger.error(`Failed to auto-register simulator ${config.chargerId}`, dbErr);
    }

    const success = await simulatorManager.spawn(config);
    if (!success) {
      return res.status(400).json({ success: false, error: "Simulator already exists" });
    }

    res.json({ success: true, message: `Simulator ${config.chargerId} spawned` });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to spawn simulator" });
  }
}

export async function killSimulator(req: Request, res: Response) {
  try {
    const chargerId = req.params.chargerId as string;
    const success = await simulatorManager.kill(chargerId);

    if (!success) {
      return res.status(404).json({ success: false, error: "Simulator not found" });
    }

    res.json({ success: true, message: `Simulator ${chargerId} killed` });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to kill simulator" });
  }
}

export async function triggerAction(req: Request, res: Response) {
  try {
    const chargerId = req.params.chargerId as string;
    const { action, params } = req.body;

    const sim = simulatorManager.getSimulator(chargerId);
    if (!sim) {
      return res.status(404).json({ success: false, error: "Simulator not found" });
    }

    switch (action) {
      case "boot":
        await sim.sendBootNotification();
        break;
      case "startTx":
        await sim.startTransaction(params?.idTag || "SIM-CARD");
        break;
      case "stopTx":
        await sim.stopTransaction();
        break;
      case "status":
        await sim.sendStatusNotification(params?.status || "Available");
        break;
      case "startAuto":
        sim.startAutoMode();
        break;
      case "stopAuto":
        sim.stopAutoMode();
        break;
      default:
        return res.status(400).json({ success: false, error: "Unknown action" });
    }

    res.json({ success: true, message: `Action ${action} executed` });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to execute action" });
  }
}
