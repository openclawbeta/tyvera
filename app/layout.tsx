import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { WalletProvider } from "@/lib/wallet-context";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Bittensor Subnet Yield Tracker — Best Subnets to Stake TAO | Tyvera",
    template: "%s — Tyvera",
  },
  description:
    "Find the best Bittensor subnet to stake TAO in. Live yields for all 128+ subnets benchmarked against root staking, with composite scoring across liquidity, yield, participation, stability, and maturity. Non-custodial — you approve every move.",
  keywords: [
    "best bittensor subnet to stake",
    "bittensor subnet yield tracker",
    "bittensor subnet recommendations",
    "TAO staking",
    "TAO yield",
    "dTAO",
    "Bittensor subnets",
    "subnet yield calculator",
    "bittensor root staking vs alpha",
    "subnet analytics",
    "Subtensor",
    "bittensor risk scoring",
    "Bittensor validators",
    "Bittensor portfolio tracker",
    "Tyvera",
  ],
  authors: [{ name: "Tyvera" }],
  creator: "Tyvera",
  publisher: "Tyvera",
  applicationName: "Tyvera",
  category: "finance",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  metadataBase: new URL("https://tyvera.ai"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Bittensor Subnet Yield Tracker — Best Subnets to Stake TAO",
    description:
      "Live yields for all 128+ Bittensor subnets, benchmarked against root staking. Composite scoring, risk bands, and a transparent methodology — so you can decide where to put your TAO.",
    url: "https://tyvera.ai",
    siteName: "Tyvera",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tyvera — Bittensor Subnet Yield Tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bittensor Subnet Yield Tracker — Tyvera",
    description:
      "Every subnet yield benchmarked against root staking, with a transparent scoring methodology. Non-custodial.",
    images: ["/og-image.png"],
    creator: "@tyvera",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

// ── JSON-LD: Organization + WebSite with SearchAction + SoftwareApplication ─
const JSON_LD_ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Tyvera",
  url: "https://tyvera.ai",
  logo: "https://tyvera.ai/icon.svg",
  description:
    "Bittensor subnet intelligence and TAO staking analytics platform.",
  sameAs: [
    "https://twitter.com/tyvera",
    "https://github.com/openclawbeta/tyvera",
  ],
};

const JSON_LD_WEBSITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Tyvera",
  url: "https://tyvera.ai",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://tyvera.ai/subnets?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

const JSON_LD_APPLICATION = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Tyvera",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Live analytics for 128+ Bittensor subnets. Track yields, emissions, risk scores, and validator metrics.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "42",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="tyvera-theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <Script
          id="ld-organization"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_ORGANIZATION) }}
        />
        <Script
          id="ld-website"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_WEBSITE) }}
        />
        <Script
          id="ld-application"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_APPLICATION) }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
