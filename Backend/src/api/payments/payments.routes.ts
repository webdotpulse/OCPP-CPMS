import express, { Router } from "express";
import {
  createPaymentIntent,
  handleWebhook
} from "./payments.controller.js";

const router = Router();

// Routes for payment integration
router.post("/intent", createPaymentIntent);

// Webhook requires raw body for signature verification
router.post("/webhook", express.raw({ type: 'application/json' }), handleWebhook);

export default router;
