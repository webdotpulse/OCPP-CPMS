import { Router } from "express";
import { getHardwareAtRiskSettings, updateHardwareAtRiskSettings } from "./hardwareAtRisk.controller.js";

const router = Router();

router.get("/", getHardwareAtRiskSettings);
router.put("/", updateHardwareAtRiskSettings);

export default router;
