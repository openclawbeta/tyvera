import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tax Report — Tyvera",
  description:
    "Generate tax reports for your Bittensor staking activity. Export transaction history for tax compliance.",
  openGraph: {
    title: "Tax Report — Tyvera",
    description: "Generate Bittensor staking tax reports and export transaction history.",
  },
};

export default function TaxLayout({ children }: { children: React.ReactNode }) {
  return children;
}
