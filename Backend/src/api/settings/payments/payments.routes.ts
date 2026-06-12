import { Router } from "express";
import {
  getMollieConfig,
  updateMollieConfig
} from "./payments.controller.js";
import { requireAdmin } from "../../../middleware/auth.js";

const router = Router();

router.get("/mollie", requireAdmin, getMollieConfig);
router.post("/mollie", requireAdmin, updateMollieConfig);

export default router;
