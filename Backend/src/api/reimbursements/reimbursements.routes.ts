import { Router } from "express";
import {
  getContracts,
  createOrUpdateContract,
  getLedgers,
  exportSepa
} from "./reimbursements.controller.js";
import { authenticateToken } from "../../middleware/auth.js";

const router = Router();

router.use(authenticateToken);

router.get("/contracts", getContracts as any);
router.post("/contracts", createOrUpdateContract as any);
router.get("/ledgers", getLedgers as any);
router.get("/export/sepa", exportSepa as any);

export default router;
