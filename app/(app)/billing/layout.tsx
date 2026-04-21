import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing — Tyvera",
  description:
    "Manage your Tyvera subscription — view payment history, current tier, and renewal status.",
  openGraph: {
    title: "Billing — Tyvera",
    description: "Manage your Tyvera subscription tier, payment history, and renewal status.",
  },
};

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
