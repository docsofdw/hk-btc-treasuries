// Stripe actions disabled for MVP
export async function updateStripeCustomer(
  clerkUserId: string,
  subscriptionId: string,
  customerId: string
) {
  throw new Error("Stripe is not implemented in MVP")
}

export async function manageSubscriptionStatusChange(
  subscriptionId: string,
  customerId: string,
  productId: string
) {
  throw new Error("Stripe is not implemented in MVP")
}

export async function getSubscription(subscriptionId: string) {
  throw new Error("Stripe is not implemented in MVP")
}

/*
// Original Stripe actions - to be re-enabled when payments are needed
"use server"

import { selectByStripeCustomerId, updateCustomer } from "./customers"
import { stripe } from "@/lib/stripe"

export async function updateStripeCustomer(
  clerkUserId: string,
  subscriptionId: string,
  customerId: string
) {
  const customer = await selectByStripeCustomerId(customerId)

  if (!customer) {
    throw new Error("Customer not found")
  }

  await updateCustomer(customer.id, {
    stripeSubscriptionId: subscriptionId
  })
}

export async function manageSubscriptionStatusChange(
  subscriptionId: string,
  customerId: string,
  productId: string
) {
  const customer = await selectByStripeCustomerId(customerId)

  if (!customer) {
    throw new Error("Customer not found")
  }

  if (!stripe) {
    throw new Error("Stripe is not configured")
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  await updateCustomer(customer.id, {
    stripeSubscriptionId: subscriptionId,
    stripeProductId: productId,
    stripeCurrentPeriodEnd: subscription.current_period_end
  })
}

export async function getSubscription(subscriptionId: string) {
  if (!stripe) {
    throw new Error("Stripe is not configured")
  }
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method"]
  })
}
*/
