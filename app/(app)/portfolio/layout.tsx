import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Track your Bittensor staking positions, TAO allocation, and subnet exposure in one dashboard.",
  robots: { index: false, follow: false },
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
