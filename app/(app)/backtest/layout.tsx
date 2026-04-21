import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bittensor Backtest: Simulate TAO Staking Strategies on Real Subnet Data",
  description:
    "Backtest staking strategies across Bittensor subnets. Simulate portfolio allocation with historical yield and emission data to validate theses before risking TAO.",
  keywords: [
    "Bittensor backtest",
    "TAO strategy simulator",
    "subnet backtesting",
    "staking simulation",
  ],
  alternates: { canonical: "/backtest" },
  openGraph: {
    title: "Bittensor Backtest — Tyvera",
    description:
      "Simulate and backtest Bittensor staking strategies with historical subnet performance data.",
    url: "https://tyvera.ai/backtest",
    type: "website",
    siteName: "Tyvera",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bittensor Backtest — Tyvera",
    description: "Simulate TAO staking strategies with real subnet history.",
  },
};

export default function BacktestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
