import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bittensor Top Holders: TAO Whale Wallets & Concentration Tracker",
  description:
    "Explore the largest TAO holders across Bittensor subnets. Track whale wallets, staking concentration, and holder distribution in real time.",
  keywords: [
    "Bittensor holders",
    "TAO whales",
    "subnet concentration",
    "Bittensor rich list",
    "TAO distribution",
  ],
  alternates: { canonical: "/holders" },
  openGraph: {
    title: "Bittensor Top Holders — Tyvera",
    description:
      "Track the largest TAO holders, whale wallets, and holder concentration across Bittensor subnets.",
    url: "https://tyvera.ai/holders",
    type: "website",
    siteName: "Tyvera",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bittensor Top Holders — Tyvera",
    description: "TAO whale wallets and subnet concentration tracker.",
  },
};

export default function HoldersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
