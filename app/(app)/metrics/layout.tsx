import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bittensor Network Metrics: TAO Price, Emissions & Staking Trends",
  description:
    "Deep-dive into Bittensor network metrics — live TAO price, historical emission curves, total staking trends, and subnet growth over time.",
  keywords: [
    "Bittensor metrics",
    "TAO price history",
    "Bittensor emissions",
    "TAO staking trends",
    "Bittensor network stats",
  ],
  alternates: { canonical: "/metrics" },
  openGraph: {
    title: "Bittensor Network Metrics — Tyvera",
    description:
      "Historical Bittensor network metrics — TAO price, emissions, staking trends, and subnet growth.",
    url: "https://tyvera.ai/metrics",
    type: "website",
    siteName: "Tyvera",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bittensor Network Metrics — Tyvera",
    description: "TAO price, emissions, staking trends, and subnet growth.",
  },
};

export default function MetricsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
