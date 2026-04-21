import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tax Report",
  description:
    "Generate tax reports for your Bittensor staking activity. Export transaction history for tax compliance.",
  robots: { index: false, follow: false },
};

export default function TaxLayout({ children }: { children: React.ReactNode }) {
  return children;
}
