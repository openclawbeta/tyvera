import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity Feed",
  description:
    "Live transaction activity across your Bittensor wallet — stake, unstake, move-stake, claims, and transfers with on-chain links.",
  alternates: { canonical: "/activity" },
  robots: { index: false, follow: false },
};

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
