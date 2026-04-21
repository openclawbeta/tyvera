import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bittensor Subnets: Live Yield, Emissions & Risk Analytics",
  description:
    "Explore 128+ Bittensor subnets with live TAO yields, daily emissions, risk scoring, validator coverage, and staker concentration. Table, card, and heatmap views.",
  keywords: [
    "Bittensor subnets",
    "TAO yield",
    "subnet analytics",
    "Bittensor emissions",
    "subnet risk",
    "dTAO staking",
    "Bittensor validators",
  ],
  alternates: { canonical: "/subnets" },
  openGraph: {
    title: "Bittensor Subnets: Live Yield, Emissions & Risk Analytics",
    description:
      "Live analytics for every Bittensor subnet — yields, emissions, risk scores, and staker metrics.",
    url: "https://tyvera.ai/subnets",
    type: "website",
    siteName: "Tyvera",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bittensor Subnets — Tyvera",
    description: "Live analytics for every Bittensor subnet.",
  },
};

export default function SubnetsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
