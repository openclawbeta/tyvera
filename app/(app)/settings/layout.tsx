import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — Tyvera",
  description:
    "Manage your Tyvera account — wallet connection, subscription tier, team members, webhooks, and notification preferences.",
  openGraph: {
    title: "Settings — Tyvera",
    description: "Account settings, team management, webhook configuration, and subscription management.",
  },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
