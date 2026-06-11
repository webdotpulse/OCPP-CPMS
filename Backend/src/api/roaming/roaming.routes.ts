import { Router } from "express";
import { getMargins, getReport, getStats } from "./roaming.controller.js";

const router = Router();

router.get("/margins", getMargins);
router.get("/report", getReport);
router.get("/stats", getStats);

export default router;
