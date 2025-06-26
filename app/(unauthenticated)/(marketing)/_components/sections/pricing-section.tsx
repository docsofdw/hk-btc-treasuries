"use client"

import { motion } from "framer-motion"
import { Check, CreditCard, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionWrapper } from "./section-wrapper"

interface PricingPlan {
  id: string
  name: string
  price: string
  billingCycle: string
  description: string
  features: string[]
  buttonText: string
  paymentLink?: string
  popular: boolean
}

const pricingPlans: PricingPlan[] = [
  {
    id: "monthly",
    name: "Monthly Plan",
    price: "$19",
    billingCycle: "/ month",
    description: "Perfect for getting started",
    features: [
      "Up to 3 team members",
      "100GB storage",
      "Priority email support",
      "Advanced analytics",
      "API Access"
    ],
    buttonText: "Coming Soon",
    popular: false
  },
  {
    id: "yearly",
    name: "Yearly Plan",
    price: "$199",
    billingCycle: "/ year",
    description: "Save 13% with annual billing",
    features: [
      "Unlimited team members",
      "500GB storage",
      "24/7 phone & email support",
      "Advanced analytics & reporting",
      "Priority API Access",
      "Custom integrations",
      "Dedicated account manager"
    ],
    buttonText: "Coming Soon",
    popular: true
  }
]

export function PricingSection() {
  return (
    <SectionWrapper id="pricing">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h2
            className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Simple, transparent pricing
          </motion.h2>
          <motion.p
            className="text-muted-foreground mt-4 text-lg leading-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Choose the plan that fits your needs. Cancel anytime.
          </motion.p>
        </div>

        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-2">
          {pricingPlans.map((tier, index) => (
            <motion.div
              key={tier.name}
              className={`relative rounded-3xl p-8 ring-1 ${
                tier.popular
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card text-card-foreground ring-border"
              }`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.1
              }}
            >
              {tier.popular && (
                <motion.div
                  className="absolute -top-4 left-1/2 -translate-x-1/2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <span className="bg-primary text-primary-foreground inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold">
                    BEST VALUE
                  </span>
                </motion.div>
              )}

              <div className="flex items-center gap-4">
                <CreditCard
                  className={`h-8 w-8 ${
                    tier.popular ? "text-primary-foreground" : "text-primary"
                  }`}
                />
                <h3
                  className={`text-lg leading-8 font-semibold ${
                    tier.popular
                      ? "text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  {tier.name}
                </h3>
              </div>

              <p
                className={`mt-4 text-sm leading-6 ${
                  tier.popular
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground"
                }`}
              >
                {tier.description}
              </p>

              <p className="mt-6 flex items-baseline gap-x-1">
                <span
                  className={`text-4xl font-bold tracking-tight ${
                    tier.popular
                      ? "text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  {tier.price}
                </span>
                <span
                  className={`text-sm leading-6 font-semibold ${
                    tier.popular
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  }`}
                >
                  {tier.billingCycle}
                </span>
              </p>

              <ul
                className={`mt-8 space-y-3 text-sm leading-6 ${
                  tier.popular
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground"
                }`}
              >
                {tier.features.map(feature => (
                  <li key={feature} className="flex gap-x-3">
                    <Check
                      className={`h-6 w-5 flex-none ${
                        tier.popular
                          ? "text-primary-foreground"
                          : "text-primary"
                      }`}
                      aria-hidden="true"
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className={`mt-8 w-full ${
                  tier.popular
                    ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                    : ""
                }`}
                variant={tier.popular ? "default" : "outline"}
                disabled
              >
                {tier.buttonText}
              </Button>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p className="text-muted-foreground text-sm">
            All plans include a 30-day money-back guarantee. No questions asked.
          </p>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
