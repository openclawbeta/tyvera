import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Smart Alerts — Tyvera",
  description:
    "Configure personalized Bittensor alerts for yield changes, whale movements, risk events, and price thresholds.",
  openGraph: {
    title: "Smart Alerts — Tyvera",
    description: "Personalized Bittensor alerts for yield drops, whale flows, deregistration risk, and price movements.",
  },
};

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
