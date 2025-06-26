"use client"

// Checkout redirect disabled for MVP
export function CheckoutRedirect() {
  return null
}

/*
// Original checkout redirect code - to be re-enabled when payments are needed
import { createCheckoutUrl } from "@/actions/stripe"
import { useAuth } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { RedirectToast } from "./redirect-toast"

export function CheckoutRedirect() {
  const { isLoaded, isSignedIn } = useAuth()
  const [showRedirect, setShowRedirect] = useState(false)
  const [paymentLink, setPaymentLink] = useState<string | null>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return

    const storedPaymentLink = window.localStorage.getItem("pendingCheckout")
    
    if (storedPaymentLink && isLoaded && isSignedIn) {
      setPaymentLink(storedPaymentLink)
      setShowRedirect(true)
      
      // Process the redirect
      createCheckoutUrl(storedPaymentLink)
        .then(({ url, error }) => {
          if (error || !url) {
            toast.error(error || "Failed to create checkout session")
            window.localStorage.removeItem("pendingCheckout")
            setShowRedirect(false)
            return
          }
          
          // Clear the stored payment link
          window.localStorage.removeItem("pendingCheckout")
          
          // Redirect to Stripe
          window.location.href = url
        })
        .catch((error) => {
          console.error("Checkout redirect error:", error)
          toast.error("Failed to redirect to checkout")
          window.localStorage.removeItem("pendingCheckout")
          setShowRedirect(false)
        })
    }
  }, [isLoaded, isSignedIn])

  if (!showRedirect || !paymentLink) return null

  return <RedirectToast />
}
*/
