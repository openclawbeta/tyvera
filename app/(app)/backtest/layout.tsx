import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Backtest — Tyvera",
  description:
    "Backtest staking strategies across Bittensor subnets. Simulate portfolio allocation with historical yield and emission data.",
  openGraph: {
    title: "Backtest — Tyvera",
    description: "Simulate and backtest Bittensor staking strategies with historical subnet performance data.",
  },
};

export default function BacktestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
