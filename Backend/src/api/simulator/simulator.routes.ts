import { Router } from "express";
import {
  listSimulators,
  spawnSimulator,
  spawnSimulatorGroup,
  killSimulator,
  triggerAction,
} from "./simulator.controller.js";

const router = Router();

router.get("/", listSimulators);
router.post("/spawn", spawnSimulator);
router.post("/spawn-group", spawnSimulatorGroup);
router.delete("/:chargerId", killSimulator);
router.post("/:chargerId/action", triggerAction);

export default router;
