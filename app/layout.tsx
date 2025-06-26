import { CheckoutRedirect } from "@/components/payments/checkout-redirect"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TailwindIndicator } from "@/components/utility/tailwind-indicator"
import { ClerkProvider } from "@clerk/nextjs"
import type { Metadata } from "next"
import { ThemeProvider } from "next-themes"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
})

export const metadata: Metadata = {
  title: 'Hong Kong & China Bitcoin Treasuries | BTC Holdings Tracker',
  description: 'Real-time tracking of Bitcoin holdings by Hong Kong-listed and China-headquartered public companies. Verified data from official filings.',
  keywords: 'bitcoin, btc, treasury, hong kong, china, cryptocurrency, holdings',
  openGraph: {
    title: 'HK/China Bitcoin Treasuries Tracker',
    description: 'Track Bitcoin holdings of Hong Kong and Chinese public companies',
    type: 'website',
    locale: 'en_US',
    url: 'https://hkbtc.vercel.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HK/China Bitcoin Treasuries',
    description: 'Real-time BTC holdings tracker for Hong Kong & Chinese companies',
  },
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  const content = (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <TooltipProvider>
            {children}
            <CheckoutRedirect />

            <TailwindIndicator />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )

  // Only wrap with ClerkProvider if the key is available
  if (clerkPublishableKey) {
    return <ClerkProvider>{content}</ClerkProvider>
  }

  return content
}
