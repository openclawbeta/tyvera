import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bittensor Validators: Stake, Take Rate & Performance Analytics",
  description:
    "Browse Bittensor validators with live stake, take rate, uptime, and subnet performance metrics. Pick the right delegate for your TAO.",
  keywords: [
    "Bittensor validators",
    "TAO delegation",
    "validator stake",
    "validator take rate",
    "Bittensor delegates",
  ],
  alternates: { canonical: "/validators" },
  openGraph: {
    title: "Bittensor Validators — Tyvera",
    description:
      "Validator analytics for Bittensor — stake, take rate, and subnet performance.",
    url: "https://tyvera.ai/validators",
    type: "website",
    siteName: "Tyvera",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bittensor Validators — Tyvera",
    description: "Stake, take rate, and performance analytics for Bittensor validators.",
  },
};

export default function ValidatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
