import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { WalletProvider } from "@/lib/wallet-context";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Tyvera — Bittensor Subnet Intelligence & TAO Staking Analytics",
    template: "%s — Tyvera",
  },
  description:
    "Live analytics for 128+ Bittensor subnets. Track TAO yields, emissions, risk scores, validator metrics, and smarter dTAO staking — powered by direct Subtensor chain queries. Non-custodial. You approve every move.",
  keywords: [
    "Bittensor",
    "TAO",
    "dTAO",
    "Bittensor subnets",
    "TAO staking",
    "subnet analytics",
    "Bittensor yield",
    "TAO yield calculator",
    "subnet intelligence",
    "Bittensor validators",
    "Bittensor portfolio tracker",
    "subnet 1 Apex",
    "subnet 64",
    "Subtensor",
    "crypto",
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
    title: "Tyvera — Bittensor Subnet Intelligence & TAO Staking Analytics",
    description:
      "Real-time analytics for 128+ Bittensor subnets. Track TAO yields, emissions, risk scores, and validator metrics — powered by direct Subtensor chain queries.",
    url: "https://tyvera.ai",
    siteName: "Tyvera",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tyvera — Bittensor Subnet Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tyvera — Bittensor Subnet Intelligence & TAO Staking Analytics",
    description:
      "Live analytics for 128+ Bittensor subnets. Yields, emissions, risk scoring, and validator data.",
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
