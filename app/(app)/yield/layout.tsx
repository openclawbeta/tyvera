import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yield Explorer — Tyvera",
  description:
    "Compare staking yields across all Bittensor subnets. Analyze APR trends, emission allocations, and risk-adjusted returns.",
  openGraph: {
    title: "Yield Explorer — Tyvera",
    description: "Compare Bittensor subnet staking yields, APR trends, and risk-adjusted returns.",
  },
};

export default function YieldLayout({ children }: { children: React.ReactNode }) {
  return children;
}
