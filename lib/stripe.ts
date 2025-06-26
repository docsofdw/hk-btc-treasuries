// Stripe disabled for MVP
export const stripe = null as unknown

/*
// Original Stripe code - to be re-enabled when payments are needed
import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  console.error("STRIPE_SECRET_KEY is not defined in environment variables")
}

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null
*/

// Helper to check if Stripe is configured
export const isStripeConfigured = () => !!stripe
