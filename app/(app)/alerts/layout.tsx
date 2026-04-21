import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Smart Alerts",
  description:
    "Configure personalized Bittensor alerts for yield changes, whale movements, risk events, and price thresholds.",
  robots: { index: false, follow: false },
};

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
