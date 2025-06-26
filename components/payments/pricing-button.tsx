"use client"

import { Button } from "@/components/ui/button"
import { ComponentProps } from "react"

interface PricingButtonProps extends ComponentProps<typeof Button> {
  paymentLink?: string
}

// Pricing button simplified for MVP
export function PricingButton({ 
  children, 
  paymentLink,
  ...props 
}: PricingButtonProps) {
  return (
    <Button {...props} disabled>
      {children}
    </Button>
  )
}

/*
// Original pricing button code - to be re-enabled when payments are needed
import { createCheckoutUrl } from "@/actions/stripe"
import { Button, ButtonProps } from "@/components/ui/button"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

interface PricingButtonProps extends ButtonProps {
  paymentLink: string
}

export function PricingButton({ 
  children, 
  paymentLink,
  ...props 
}: PricingButtonProps) {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleCheckout = async () => {
    setIsLoading(true)
    
    try {
      if (!isSignedIn) {
        // Store the payment link for after sign in
        sessionStorage.setItem("pendingCheckout", paymentLink)
        router.push("/signup")
        return
      }

      const result = await createCheckoutUrl(paymentLink)

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.url) {
        window.location.href = result.url
      }
    } catch (error) {
      console.error("Checkout error:", error)
      toast.error("Failed to start checkout")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleCheckout}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? "Loading..." : children}
    </Button>
  )
}
*/
