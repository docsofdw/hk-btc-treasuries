// import { CheckoutRedirect } from "@/components/payments/checkout-redirect"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TailwindIndicator } from "@/components/utility/tailwind-indicator"
// Clerk authentication removed - using HTTP Basic Auth for admin routes
// import { ClerkProvider } from "@clerk/nextjs"
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://asia-bitcoin-treasuries.vercel.app'),
  title: {
    default: 'Asia Bitcoin Treasuries - Corporate Bitcoin Holdings Tracker',
    template: '%s | Asia Bitcoin Treasuries'
  },
  description: 'Track corporate Bitcoin holdings from HKEX-listed companies. Real-time data from exchange filings, verified daily. Comprehensive tracking across Hong Kong, Singapore, Japan, South Korea, and Thailand.',
  keywords: [
    'Bitcoin', 
    'corporate treasury', 
    'Hong Kong', 
    'HKEX', 
    'cryptocurrency', 
    'Bitcoin holdings', 
    'Asia', 
    'corporate Bitcoin',
    'BTC tracker',
    'Singapore',
    'Japan',
    'South Korea',
    'Thailand',
    'public company Bitcoin'
  ],
  authors: [{ name: 'UTXO 210K' }],
  creator: 'UTXO 210K',
  publisher: 'UTXO 210K',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Asia Bitcoin Treasuries',
    title: 'Asia Bitcoin Treasuries - Track Corporate Bitcoin Holdings',
    description: 'Real-time tracking of corporate Bitcoin holdings from HKEX filings and Asian exchanges. Verified data updated daily.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Asia Bitcoin Treasuries - Corporate Bitcoin Holdings Tracker',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Asia Bitcoin Treasuries',
    description: 'Track corporate Bitcoin holdings from HKEX-listed companies',
    images: ['/og-image.png'],
    creator: '@utxo210k',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add these once you set them up in Google Search Console
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification',
    // bing: 'your-bing-verification',
  },
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <TooltipProvider>
            {children}
            {/* <CheckoutRedirect /> */}

            <TailwindIndicator />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
