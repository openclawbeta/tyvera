import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bittensor Yield Calculator: Compare TAO Staking APR Across Subnets",
  description:
    "Compare staking yields across 128+ Bittensor subnets. Analyze APR trends, emission allocations, validator takes, and risk-adjusted returns on TAO stakes.",
  keywords: [
    "Bittensor yield calculator",
    "TAO APR",
    "Bittensor staking yield",
    "subnet yield comparison",
    "TAO staking returns",
  ],
  alternates: { canonical: "/yield" },
  openGraph: {
    title: "Bittensor Yield Calculator — Tyvera",
    description:
      "Compare Bittensor subnet staking yields, APR trends, and risk-adjusted returns.",
    url: "https://tyvera.ai/yield",
    type: "website",
    siteName: "Tyvera",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bittensor Yield Calculator — Tyvera",
    description: "Compare TAO staking yields across every Bittensor subnet.",
  },
};

export default function YieldLayout({ children }: { children: React.ReactNode }) {
  return children;
}
