import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey && stripeSecretKey !== "sk_test_placeholder"
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2026-05-27.dahlia' as any, // Use latest supported API version or default
    })
  : null;

export const isStripeConfigured = () => !!stripe;
