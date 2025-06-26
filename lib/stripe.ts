import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

// Make Stripe optional for development
export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: "2025-05-28.basil",
  appInfo: {
    name: "Mckay's App Template",
    version: "0.1.0"
  }
}) : null

// Helper to check if Stripe is configured
export const isStripeConfigured = () => !!stripeSecretKey
