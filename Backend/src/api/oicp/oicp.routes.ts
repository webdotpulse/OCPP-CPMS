import { Router } from "express";
import {
  getEndpoints,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  testEndpoint
} from "./oicp.controller.js";

const router = Router();

// Endpoint management
router.get("/endpoints", getEndpoints);
router.post("/endpoints", createEndpoint);
router.put("/endpoints/:id", updateEndpoint);
router.delete("/endpoints/:id", deleteEndpoint);
router.post("/endpoints/:id/test", testEndpoint);

export default router;
