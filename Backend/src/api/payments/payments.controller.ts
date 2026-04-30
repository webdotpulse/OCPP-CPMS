import { Request, Response } from "express";

/**
 * Placeholder for creating a payment intent (Stripe/Mollie)
 */
export const createPaymentIntent = async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: "Payment integration is not implemented yet. Ready for future Stripe/Mollie integration.",
  });
};

/**
 * Placeholder for handling payment webhooks
 */
export const handleWebhook = async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: "Webhook handler is not implemented yet.",
  });
};
