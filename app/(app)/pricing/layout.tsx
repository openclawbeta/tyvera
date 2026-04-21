import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tyvera Pricing: TAO-Native Plans for Bittensor Analytics",
  description:
    "Explorer (free), Analyst, Strategist, and Institutional tiers. Pay in TAO. Unlock deeper subnet analytics, real-time alerts, portfolio automation, and API access for Bittensor staking strategies.",
  keywords: [
    "Bittensor pricing",
    "TAO subscription",
    "subnet analytics plans",
    "Bittensor API",
    "TAO alerts",
  ],
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Tyvera Pricing — TAO-Native Plans for Bittensor Analytics",
    description:
      "TAO-native subscription plans for Bittensor subnet analytics, alerts, and AI intelligence.",
    url: "https://tyvera.ai/pricing",
    type: "website",
    siteName: "Tyvera",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tyvera Pricing",
    description: "TAO-native plans for Bittensor analytics.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
