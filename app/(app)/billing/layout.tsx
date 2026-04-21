import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing",
  description:
    "Manage your Tyvera subscription — view payment history, current tier, and renewal status.",
  robots: { index: false, follow: false },
};

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
