import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ask Tyvera AI: Bittensor Subnet Analysis in Plain English",
  description:
    "Ask questions about Bittensor subnets, yields, risks, and staking strategies. Tyvera's AI assistant answers with live chain data — no jargon, no waiting.",
  keywords: [
    "Bittensor AI",
    "TAO assistant",
    "Bittensor chat",
    "subnet questions",
    "TAO staking AI",
  ],
  alternates: { canonical: "/chat" },
  openGraph: {
    title: "Ask Tyvera AI — Bittensor Intelligence on Demand",
    description:
      "AI-powered Bittensor analysis — ask about subnets, yields, and staking strategies.",
    url: "https://tyvera.ai/chat",
    type: "website",
    siteName: "Tyvera",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ask Tyvera AI",
    description: "Bittensor subnet analysis in plain English.",
  },
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
