import { Router } from "express";
import { createPaymentIntent, handleWebhook } from "./payments.controller.js";
const router = Router();
// Placeholder routes for payment integration
router.post("/intent", createPaymentIntent);
router.post("/webhook", handleWebhook);
export default router;
