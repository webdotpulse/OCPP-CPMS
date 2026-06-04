import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { stripe, isStripeConfigured } from "../../services/StripeService.js";

/**
 * Creates a Stripe payment intent and initiates a PaymentTransaction record.
 */
export const createPaymentIntent = async (req: Request, res: Response) => {
  if (!isStripeConfigured() || !stripe) {
    return res.status(501).json({
      success: false,
      message: "Payment integration is not configured. Missing STRIPE_SECRET_KEY.",
    });
  }

  try {
    const { amount, currency = "EUR", transactionId } = req.body;

    if (!amount || !transactionId) {
       return res.status(400).json({
           success: false,
           message: "amount and transactionId are required",
       });
    }

    // Amount must be an integer representing cents
    const amountInCents = Math.round(amount * 100);

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        transactionId: transactionId,
      },
    });

    // Save initial transaction in database
    await prisma.paymentTransaction.create({
      data: {
        transactionId: transactionId,
        provider: "stripe",
        paymentIntentId: paymentIntent.id,
        amount: amount,
        currency: currency.toUpperCase(),
        status: "pending",
      }
    });

    res.json({
      success: true,
      data: {
         clientSecret: paymentIntent.client_secret,
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
 * Handles incoming payment webhooks from Stripe.
 */
export const handleWebhook = async (req: Request, res: Response) => {
   if (!isStripeConfigured() || !stripe) {
      return res.status(501).json({
        success: false,
        message: "Payment integration is not configured.",
      });
   }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
      return res.status(400).send('Missing signature or webhook secret');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as any;
          await prisma.paymentTransaction.updateMany({
             where: { paymentIntentId: paymentIntent.id },
             data: { status: 'succeeded' }
          });
          logger.info(`Payment intent ${paymentIntent.id} succeeded`);
          break;
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as any;
          await prisma.paymentTransaction.updateMany({
             where: { paymentIntentId: paymentIntent.id },
             data: { status: 'failed' }
          });
          logger.error(`Payment intent ${paymentIntent.id} failed`);
          break;
        }
        default:
          logger.info(`Unhandled event type ${event.type}`);
      }
  } catch (dbError) {
      logger.error("Error updating payment transaction from webhook", dbError);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
};
