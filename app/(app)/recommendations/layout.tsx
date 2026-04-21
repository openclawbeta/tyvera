import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bittensor Reallocation Recommendations: Risk-Adjusted Subnet Scoring",
  description:
    "AI-powered subnet reallocation opportunities for your Bittensor portfolio. Risk-adjusted edge detection, multi-factor scoring, wallet-aware analysis. You approve every move — non-custodial.",
  keywords: [
    "Bittensor recommendations",
    "subnet reallocation",
    "TAO portfolio",
    "Bittensor edge",
    "subnet scoring",
    "risk-adjusted yield",
  ],
  alternates: { canonical: "/recommendations" },
  openGraph: {
    title: "Bittensor Reallocation Recommendations — Tyvera",
    description:
      "Risk-adjusted subnet reallocation opportunities — you approve every move.",
    url: "https://tyvera.ai/recommendations",
    type: "website",
    siteName: "Tyvera",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bittensor Reallocation Recommendations — Tyvera",
    description: "Risk-adjusted subnet reallocation opportunities for your Bittensor portfolio.",
  },
};

export default function RecommendationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
