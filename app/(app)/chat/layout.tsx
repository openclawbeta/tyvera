import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Intelligence — Tyvera",
  description:
    "Ask questions about Bittensor subnets, yields, risks, and staking strategies with AI-powered analysis.",
  openGraph: {
    title: "AI Intelligence — Tyvera",
    description: "AI-powered Bittensor analysis — ask about subnets, yields, and staking strategies.",
  },
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
