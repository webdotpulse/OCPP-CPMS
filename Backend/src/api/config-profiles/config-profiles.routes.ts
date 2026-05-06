import { Router } from "express";
import {
  getConfigProfiles,
  getConfigProfile,
  createConfigProfile,
  updateConfigProfile,
  deleteConfigProfile,
  applyConfigProfile,
} from "./config-profiles.controller.js";

const router = Router();

router.get("/", getConfigProfiles);
router.get("/:id", getConfigProfile);
router.post("/", createConfigProfile);
router.put("/:id", updateConfigProfile);
router.delete("/:id", deleteConfigProfile);
router.post("/:profileId/apply/:chargerId", applyConfigProfile);

export default router;
