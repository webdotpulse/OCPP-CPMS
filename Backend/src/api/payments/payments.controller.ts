import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { MollieService } from "../../services/MollieService.js";
import { PaymentStatus } from "@mollie/api-client";

/**
 * Creates a Mollie payment and initiates a PaymentTransaction record.
 */
export const createPaymentIntent = async (req: Request, res: Response) => {
  const companyId = req.body.companyId || null;

  try {
    const isConfigured = await MollieService.isConfigured(companyId);
    if (!isConfigured) {
      return res.status(501).json({
        success: false,
        message: "Payment integration is not configured. Missing Mollie API Key.",
      });
    }

    const { amount, currency = "EUR", transactionId } = req.body;

    if (!amount || !transactionId) {
       return res.status(400).json({
           success: false,
           message: "amount and transactionId are required",
       });
    }

    // Amount must be a string with 2 decimal places for Mollie
    const amountStr = parseFloat(amount).toFixed(2);

    const client = await MollieService.getClient(companyId);

    // Create a Payment in Mollie
    const payment = await client.payments.create({
      amount: {
        value: amountStr,
        currency: currency.toUpperCase(),
      },
      description: `Order ${transactionId}`,
      redirectUrl: `${req.headers.origin || process.env.FRONTEND_URL}/payments?success=true`,
      webhookUrl: `${process.env.BACKEND_URL}/api/payments/webhook${companyId ? `?companyId=${companyId}` : ''}`,
      metadata: {
        transactionId: transactionId,
      },
    });

    // Save initial transaction in database
    await prisma.paymentTransaction.create({
      data: {
        transactionId: transactionId,
        provider: "mollie",
        paymentIntentId: payment.id,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        status: "pending",
      }
    });

    res.json({
      success: true,
      data: {
         checkoutUrl: payment._links.checkout?.href,
      }
    });
  } catch (error: any) {
    logger.error("Error creating payment intent", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment intent",
      error: error.message
    });
  }
};

/**
 * Handles incoming payment webhooks from Mollie.
 */
export const handleWebhook = async (req: Request, res: Response) => {
  const paymentId = req.body.id;
  const companyId = req.query.companyId ? parseInt(req.query.companyId as string, 10) : null;

  if (!paymentId) {
      return res.status(400).send('Missing payment ID');
  }

  try {
    const isConfigured = await MollieService.isConfigured(companyId);
    if (!isConfigured) {
       return res.status(501).json({
         success: false,
         message: "Payment integration is not configured.",
       });
    }

    const client = await MollieService.getClient(companyId);
    const payment = await client.payments.get(paymentId);

    let status = 'pending';
    if (payment.status === PaymentStatus.paid) {
        status = 'succeeded';
    } else if (payment.status === PaymentStatus.failed || payment.status === PaymentStatus.canceled || payment.status === PaymentStatus.expired) {
        status = 'failed';
    }

    await prisma.paymentTransaction.updateMany({
        where: { paymentIntentId: payment.id },
        data: { status }
    });

    logger.info(`Payment intent ${payment.id} updated to ${status}`);

    // Return a 200 response to acknowledge receipt of the event
    res.send();
  } catch (err: any) {
    logger.error(`Webhook handling failed: ${err.message}`);
    return res.status(500).send(`Webhook Error: ${err.message}`);
  }
};

/**
 * Handles generating a refund for a payment.
 */
export const handleRefund = async (req: Request, res: Response) => {
  const { paymentId, amount, companyId } = req.body;

  if (!paymentId || !amount) {
    return res.status(400).json({
      success: false,
      message: "paymentId and amount are required",
    });
  }

  try {
    const isConfigured = await MollieService.isConfigured(companyId);
    if (!isConfigured) {
      return res.status(501).json({
        success: false,
        message: "Payment integration is not configured.",
      });
    }

    const amountStr = parseFloat(amount).toFixed(2);
    const refund = await MollieService.generateRefund(paymentId, amountStr, companyId);

    res.json({
      success: true,
      data: refund
    });
  } catch (error: any) {
    logger.error(`Failed to handle refund for payment ${paymentId}`, error);
    res.status(500).json({
      success: false,
      message: "Failed to process refund",
      error: error.message
    });
  }
};
