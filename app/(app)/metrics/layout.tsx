import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metrics — Tyvera",
  description:
    "Deep-dive into Bittensor network metrics — TAO price history, emission curves, staking trends, and subnet growth over time.",
  openGraph: {
    title: "Metrics — Tyvera",
    description: "Historical Bittensor network metrics — TAO price, emissions, staking trends, and subnet growth.",
  },
};

export default function MetricsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
