import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subnets — Tyvera",
  description:
    "Explore 100+ Bittensor subnets with live yield, emission, risk, and metagraph data. Table, card, and heatmap views.",
  openGraph: {
    title: "Subnets — Tyvera",
    description: "Live analytics for every Bittensor subnet — yields, emissions, risk scores, and staker metrics.",
  },
};

export default function SubnetsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
