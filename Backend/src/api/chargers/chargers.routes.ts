import { Router } from "express";
import {
  getAllChargers,
  getUnrecognizedConnections,
  getChargerById,
  getChargerStatus,
  createCharger,
  updateCharger,
  deleteCharger,
  createBulkConnectors,
  getChargerLogs,
  getChargerConfigurations,
} from "./chargers.controller.js";

const router = Router();

router.get("/", getAllChargers);
router.get("/unrecognized", getUnrecognizedConnections);
router.get("/:id", getChargerById);
router.get("/:id/status", getChargerStatus);
router.get("/:id/logs", getChargerLogs);
router.get("/:id/configurations", getChargerConfigurations);
router.post("/", createCharger);
router.put("/:id", updateCharger);
router.delete("/:id", deleteCharger);
router.post("/connectors", createBulkConnectors);

export default router;
