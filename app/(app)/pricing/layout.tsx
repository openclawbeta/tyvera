import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Tyvera",
  description:
    "Operator-grade plans for subnet research, allocation workflows, and premium Bittensor intelligence. Pay in TAO.",
  openGraph: {
    title: "Pricing — Tyvera",
    description: "TAO-native subscription plans for Bittensor subnet analytics and AI intelligence.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
