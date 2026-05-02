import { Router } from "express";
import {
  getAllTransactions,
  getActiveTransactions,
  getChargerTransactions,
  getTransactionStats,
  getTransactionById,
  getRfidSessionById,
  getRfidSessionsByUser,
} from "./transactions.controller.js";

const router = Router();

router.get("/", getAllTransactions);
router.get("/active", getActiveTransactions);
router.get("/charger/:chargerId", getChargerTransactions);
router.get("/stats", getTransactionStats);
router.get("/:id", getTransactionById);
router.get("/rfid/:id", getRfidSessionById);
router.get("/user/:userId", getRfidSessionsByUser);

export default router;
