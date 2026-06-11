import { Router } from "express";
import { getAllCompanies } from "./companies.controller.js";
import { authenticateToken } from "../../middleware/auth.js";

const router = Router();

router.get("/", authenticateToken as any, getAllCompanies as any);

export default router;
