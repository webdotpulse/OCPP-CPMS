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

export async function spawnSimulatorGroup(req: Request, res: Response) {
  try {
    const { count = 5, config } = req.body;

    if (count > 50) {
      return res.status(400).json({ success: false, error: "Cannot spawn more than 50 simulators at once" });
    }

    const spawnedIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const chargerId = config?.chargerId ? `${config.chargerId}-${i+1}` : `Sim-Matrix-${Math.floor(Math.random() * 10000)}`;
      const simConfig: SimulatorConfig = {
        chargerId,
        protocol: config?.protocol || "ocpp2.1",
        type: config?.type || "AC",
        maxPowerKw: config?.maxPowerKw || 22,
        chargeProfile: config?.chargeProfile || "DynamicSpeed",
      };

      // Ensure station and group exist (extracted logic similar to spawnSimulator)
      const user = await prisma.user.findFirst({ where: { role: "admin" } });
      if (user) {
        let station = await prisma.chargingStation.findFirst({
          where: { station_name: "The Matrix" }
        });
        if (!station) {
          station = await prisma.chargingStation.create({
            data: {
              station_name: "The Matrix",
              street_name: "Construct",
              city: "Zion",
              postal_code: "10101",
              latitude: 50.84967820466121,
              longitude: 4.356986627577444,
              owner_id: user.id,
            }
          });
        }
        let chargeGroup = await prisma.chargeGroup.findFirst({
          where: { name: "The Matrix Battery" }
        });
        if (!chargeGroup) {
          chargeGroup = await prisma.chargeGroup.create({
            data: {
              name: "The Matrix Battery",
              description: "Auto-generated charge group for simulators",
              maxAmperage: 100,
              maxPower: 100
            }
          });
        }

        const existing = await prisma.charger.findUnique({ where: { name: chargerId } });
        if (!existing) {
          const newCharger = await prisma.charger.create({
            data: {
              name: chargerId,
              model: "Simulated Group Model",
              manufacturer: "MobilityPulse Simulator",
              serial_number: `SIM-GRP-${Date.now()}-${i}`,
              power_capacity: simConfig.maxPowerKw,
              firmware_version: "1.0.0",
              service_contacts: "admin@example.com",
              owner_id: user.id,
              charging_station_id: station.id,
              chargeGroupId: chargeGroup.id,
              status: "offline",
            }
          });
          await prisma.connector.create({
            data: {
              connector_name: "Connector 1",
              status: "Available",
              current_type: simConfig.type,
              max_power: simConfig.maxPowerKw,
              charger_id: newCharger.charger_id
            }
          });
        }
      }

      const success = await simulatorManager.spawn(simConfig);
      if (success) {
        spawnedIds.push(chargerId);
      }
    }

    res.json({ success: true, message: `Spawned ${spawnedIds.length} simulators`, data: spawnedIds });
  } catch (error) {
    logger.error(`Failed to spawn simulator group:`, error);
    res.status(500).json({ success: false, error: "Failed to spawn simulator group" });
  }
}

export async function spawnSimulator(req: Request, res: Response) {
  try {
    const config: SimulatorConfig = req.body;

    if (!config.chargerId || !config.protocol || !config.type || !config.maxPowerKw) {
      return res.status(400).json({ success: false, error: "Missing required config parameters" });
    }

    if (config.maxPowerKw < 20 || config.maxPowerKw > 100) {
      return res.status(400).json({ success: false, error: "Simulator max power must be between 20kW and 100kW" });
    }

    // Attempt to auto-create station, charger, and connector in the DB if they don't exist
    try {
      const existing = await prisma.charger.findUnique({ where: { name: config.chargerId } });
      if (!existing) {
        // Connect to a location called "The Matrix"
        let station = await prisma.chargingStation.findFirst({
          where: { station_name: "The Matrix" }
        });

        // Ensure we have a user (admin)
        const user = await prisma.user.findFirst({ where: { role: "admin" }});
        if (user) {
          if (!station) {
            station = await prisma.chargingStation.create({
              data: {
                station_name: "The Matrix",
                street_name: "Construct",
                city: "Zion",
                postal_code: "10101",
                latitude: 50.84967820466121,
                longitude: 4.356986627577444,
                owner_id: user.id,
              }
            });
          }

          let chargeGroup = await prisma.chargeGroup.findFirst({
            where: { name: "The Matrix Battery" }
          });

          if (!chargeGroup) {
            chargeGroup = await prisma.chargeGroup.create({
              data: {
                name: "The Matrix Battery",
                description: "Auto-generated charge group for simulators",
                maxAmperage: 100,
                maxPower: 100
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
              chargeGroupId: chargeGroup.id,
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

      // Auto-register RFID tags
      if (config.rfidTags) {
        const tags = config.rfidTags.split(",").map(t => t.trim()).filter(t => t);
        const user = await prisma.user.findFirst({ where: { role: "admin" }});
        if (user) {
          for (const tag of tags) {
            const existingTag = await prisma.rfidUser.findUnique({ where: { rfid_tag: tag } });
            if (!existingTag) {
              await prisma.rfidUser.create({
                data: {
                  rfid_tag: tag,
                  name: `Simulated User ${tag}`,
                  owner_id: user.id,
                  active: true
                }
              });
              logger.info(`Auto-registered RFID tag ${tag} for simulator.`);
            }
          }
        }
      }
    } catch (dbErr) {
      logger.error(`Failed to auto-register simulator ${config.chargerId} or tags`, dbErr);
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

    // Attempt to clean up the auto-registered charger from the database
    try {
      const charger = await prisma.charger.findUnique({ where: { name: chargerId } });
      if (charger) {
        await prisma.$transaction([
          prisma.connector.deleteMany({ where: { charger_id: charger.charger_id } }),
          prisma.transaction.deleteMany({ where: { charger_id: charger.charger_id } }),
          prisma.ocppLog.deleteMany({ where: { chargerId: charger.charger_id } }),
          prisma.rfidSession.deleteMany({ where: { charger_id: charger.charger_id } }),
          prisma.chargerConfiguration.deleteMany({ where: { chargerId: charger.charger_id } }),
          prisma.chargingProfile.deleteMany({ where: { chargerId: charger.charger_id } }),
          prisma.charger.delete({ where: { charger_id: charger.charger_id } })
        ]);
        logger.info(`Auto-cleaned up simulator ${chargerId} from database.`);
      }
    } catch (dbErr) {
      logger.error(`Failed to auto-cleanup simulator ${chargerId} from database`, dbErr);
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
