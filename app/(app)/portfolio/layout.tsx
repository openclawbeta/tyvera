import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio — Tyvera",
  description:
    "Track your Bittensor staking positions, TAO allocation, and subnet exposure in one dashboard.",
  openGraph: {
    title: "Portfolio — Tyvera",
    description: "Your Bittensor staking portfolio — positions, allocation, and subnet exposure.",
  },
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
