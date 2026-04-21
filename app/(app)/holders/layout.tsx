import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Top Holders — Tyvera",
  description:
    "Explore the largest TAO holders across Bittensor subnets. Track whale wallets, concentration metrics, and holder distribution.",
  openGraph: {
    title: "Top Holders — Tyvera",
    description: "Track the largest TAO holders, whale wallets, and holder concentration across Bittensor subnets.",
  },
};

export default function HoldersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
