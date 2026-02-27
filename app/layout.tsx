import type React from "react"
import type { Metadata, Viewport } from "next"
import { Playfair_Display, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ToastProvider } from "@/components/ui/toast"
import { Web3Provider } from "./providers"
import GoogleAnalytics from "./google-analytics"
import "./globals.css"
import "./reown-custom.css"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL('https://kabbalahcode.space'),
  title: {
    default: 'KABBALAH CODE | Mystical Web3 Rewards & Sacred Numerology',
    template: '%s | KABBALAH CODE'
  },
  description:
    "Daily mystical predictions powered by sacred Kabbalah numerology, your unique Web3 soul signature, and the eternal Tree of Life. Earn $KCODE tokens, unlock sacred NFTs, and discover your spiritual path through blockchain technology.",
  keywords: [
    "Kabbalah",
    "Web3",
    "NFT",
    "Numerology",
    "Crypto",
    "Predictions",
    "Telegram Bot",
    "KCODE Token",
    "Sacred Geometry",
    "Tree of Life",
    "Blockchain",
    "Spiritual",
    "Mystical",
    "Daily Predictions",
    "Crypto Rewards"
  ],
  authors: [{ name: "Kabbalah Code Team" }],
  creator: "Kabbalah Code",
  publisher: "Kabbalah Code",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://kabbalahcode.space",
    siteName: "KABBALAH CODE",
    title: "KABBALAH CODE | Mystical Web3 Rewards & Sacred Numerology",
    description: "Daily mystical predictions powered by sacred Kabbalah numerology. Earn $KCODE tokens, unlock sacred NFTs, and discover your spiritual path through blockchain.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "KABBALAH CODE - Mystical Web3 Rewards",
        type: "image/png",
      },
      {
        url: "/logo.png",
        width: 800,
        height: 400,
        alt: "KABBALAH CODE Logo",
        type: "image/png",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@KabbalahCode",
    creator: "@KabbalahCode",
    title: "KABBALAH CODE | Mystical Web3 Rewards",
    description: "Daily mystical predictions powered by sacred Kabbalah numerology. Earn $KCODE tokens and unlock sacred NFTs.",
    images: ["/og-image.png"],
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
  alternates: {
    canonical: "https://kabbalahcode.space",
  },
  category: "Web3",
  generator: "Next.js",
  applicationName: "KABBALAH CODE",
  referrer: "origin-when-cross-origin",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
    shortcut: "/icon-light-32x32.png",
  },
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FF9500" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" }
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: "dark",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'KABBALAH CODE',
    description: 'Daily mystical predictions powered by sacred Kabbalah numerology, your unique Web3 soul signature, and the eternal Tree of Life.',
    url: 'https://kabbalahcode.space',
    applicationCategory: 'Web3 Application',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Organization',
      name: 'Kabbalah Code',
      url: 'https://kabbalahcode.space',
    },
    sameAs: [
      'https://twitter.com/KabbalahCode',
      'https://t.me/kabbalah_code',
    ],
  }

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Kabbalah Code',
    url: 'https://kabbalahcode.space',
    logo: 'https://kabbalahcode.space/logo.png',
    description: 'Daily mystical predictions powered by sacred Kabbalah numerology. Earn $KCODE tokens and unlock sacred NFTs.',
    foundingDate: '2024',
    sameAs: [
      'https://twitter.com/KabbalahCode',
      'https://t.me/kabbalah_code'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@kabbalahcode.space',
      availableLanguage: ['English', 'Russian']
    }
  }

  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className={`${playfair.variable} ${inter.variable} font-sans antialiased bg-black text-white`}>
        <GoogleAnalytics />
        <Web3Provider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Web3Provider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
