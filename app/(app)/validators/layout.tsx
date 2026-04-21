import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Validators — Tyvera",
  description:
    "Browse Bittensor validators with stake, take rate, and performance metrics across all subnets.",
  openGraph: {
    title: "Validators — Tyvera",
    description: "Validator analytics for Bittensor — stake, take rate, and subnet performance.",
  },
};

export default function ValidatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
