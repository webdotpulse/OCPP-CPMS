import { Router } from "express";
import {
  createPaymentIntent,
  handleWebhook,
  handleRefund
} from "./payments.controller.js";

const router = Router();

// Routes for payment integration
router.post("/intent", createPaymentIntent);
router.post("/refund", handleRefund);

// Mollie webhook sends the ID via a standard form post
router.post("/webhook", handleWebhook);

export default router;
