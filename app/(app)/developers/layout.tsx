import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tyvera Developer API: Bittensor Subnet Data, Webhooks & Rate Limits",
  description:
    "Tyvera API documentation — authentication, REST endpoints, webhook schemas, rate limits, and integration guides for live Bittensor subnet, yield, and validator data.",
  keywords: [
    "Bittensor API",
    "TAO API",
    "subnet data API",
    "Bittensor webhooks",
    "Bittensor developer docs",
  ],
  alternates: { canonical: "/developers" },
  openGraph: {
    title: "Tyvera Developer Docs — Bittensor Data API",
    description:
      "API docs, webhook schemas, and integration guides for building on Tyvera's Bittensor analytics platform.",
    url: "https://tyvera.ai/developers",
    type: "website",
    siteName: "Tyvera",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tyvera Developer API",
    description: "Build on the Bittensor analytics stack.",
  },
};

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
