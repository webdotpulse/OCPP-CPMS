import { Router } from "express";
import {
  getEntsoeApiKey,
  updateEntsoeApiKey,
} from "./tariffs.controller.js";
import { requireAdmin } from "../../../middleware/auth.js";

const router = Router();

router.get("/entsoe-key", requireAdmin, getEntsoeApiKey);
router.post("/entsoe-key", requireAdmin, updateEntsoeApiKey);

export default router;
