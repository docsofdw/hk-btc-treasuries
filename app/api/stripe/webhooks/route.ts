import { NextRequest, NextResponse } from "next/server"

// Stripe webhooks disabled for MVP
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: "Payment processing not implemented in MVP" },
    { status: 501 }
  )
}

/*
// Original Stripe webhook code - to be re-enabled when payments are needed
import { clerkClient } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { Stripe } from "stripe"
import { createCustomer, createSubscription, updateSubscription } from "@/actions/customers"
import { stripe } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature") as string

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret || !signature) {
    console.error("Invalid webhook secret or signature", { webhookSecret, signature })
    return NextResponse.json({ error: "Invalid webhook secret or signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error(`Webhook signature verification failed.`, (error as Error).message)
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const clerk = await clerkClient()
        const { userId } = session.metadata as { userId?: string }

        if (!userId) {
          return NextResponse.json({ error: "userId is required" }, { status: 400 })
        }

        const user = await clerk.users.getUser(userId)

        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const customerId = session.customer as string

        const customer = await createCustomer({
          clerkUserId: userId,
          name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Customer",
          email: user.emailAddresses?.[0]?.emailAddress || "Customer",
          stripeCustomerId: customerId
        })

        if (!customer?.stripeCustomerId) {
          return NextResponse.json({ error: "Customer not created" }, { status: 500 })
        }

        // Retrieve the subscription to get the current period dates
        const subscriptionId = session.subscription as string
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)

        await createSubscription({
          stripeCustomerId: customer.stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          stripeProductId: subscription.items.data[0].price.product as string,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: subscription.current_period_end
        })

        break
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription

        await updateSubscription({
          stripeSubscriptionId: subscription.id,
          stripeProductId: subscription.items.data[0].price.product as string,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: subscription.current_period_end
        })

        break
      }
      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
*/
