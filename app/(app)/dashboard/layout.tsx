import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Tyvera",
  description:
    "Your personalized Bittensor dashboard — portfolio value, staking yields, subnet performance, and market overview at a glance.",
  openGraph: {
    title: "Dashboard — Tyvera",
    description: "Personalized Bittensor portfolio dashboard with live staking yields and subnet performance.",
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
