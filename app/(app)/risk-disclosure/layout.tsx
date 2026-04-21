import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Risk Disclosure — Tyvera",
  description:
    "Important risk disclosures for Bittensor staking and subnet participation. Understand the risks before allocating capital.",
  openGraph: {
    title: "Risk Disclosure — Tyvera",
    description: "Risk disclosures for Bittensor staking and subnet participation on Tyvera.",
  },
};

export default function RiskDisclosureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
