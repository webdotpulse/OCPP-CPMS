import { Router } from "express";
import { getDiagnostics } from "../controllers/DiagnosticsController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();
router.get("/", authenticateToken, getDiagnostics);
export default router;
