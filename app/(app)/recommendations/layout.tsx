import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recommendations — Tyvera",
  description:
    "AI-powered reallocation recommendations for Bittensor staking. Wallet-aware scoring, risk-adjusted edge detection, review-first execution.",
  openGraph: {
    title: "Recommendations — Tyvera",
    description: "Risk-adjusted subnet reallocation opportunities — you approve every move.",
  },
};

export default function RecommendationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
