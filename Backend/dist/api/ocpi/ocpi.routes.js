import { Router } from "express";
import { getLocations, getTariffs } from "./ocpi.controller.js";
const router = Router();
// Placeholder routes for OCPI integration
router.get("/locations", getLocations);
router.get("/tariffs", getTariffs);
export default router;
