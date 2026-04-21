import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developer Docs — Tyvera",
  description:
    "Tyvera API documentation — authentication, endpoints, webhook schemas, rate limits, and integration guides for Bittensor data.",
  openGraph: {
    title: "Developer Docs — Tyvera",
    description: "API docs, webhook schemas, and integration guides for building on Tyvera's Bittensor analytics platform.",
  },
};

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
