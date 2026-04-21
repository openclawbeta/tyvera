import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SUBNETS_REAL_BY_NETUID } from "@/lib/data/subnets-real";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ netuid: string }>;
};

/**
 * Per-subnet metadata. Each of the ~128 subnet detail pages gets a
 * keyword-rich title and description derived from the static snapshot,
 * plus a canonical URL so indexing consolidates to /subnets/{netuid}.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ netuid: string }>;
}): Promise<Metadata> {
  const { netuid: netuidRaw } = await params;
  const netuid = Number(netuidRaw);
  const subnet = Number.isFinite(netuid)
    ? SUBNETS_REAL_BY_NETUID.get(netuid)
    : undefined;

  if (!subnet) {
    const title = `Bittensor Subnet ${netuidRaw} — Tyvera`;
    return {
      title,
      description:
        "Live Bittensor subnet analytics on Tyvera: yields, emissions, staker concentration, validator coverage, and risk scoring.",
      alternates: { canonical: `/subnets/${netuidRaw}` },
      openGraph: {
        title,
        description: "Live Bittensor subnet analytics on Tyvera.",
        url: `https://tyvera.ai/subnets/${netuidRaw}`,
        type: "article",
      },
    };
  }

  const yieldPct = subnet.yield ?? 0;
  const title = `Subnet ${subnet.netuid} ${subnet.name} (${subnet.symbol}) — ${yieldPct.toFixed(1)}% Yield | Tyvera`;
  const description =
    `Live Bittensor SN${subnet.netuid} (${subnet.name}) analytics: ${yieldPct.toFixed(1)}% yield, ` +
    `${subnet.liquidity.toLocaleString()} τ staked, ${subnet.stakers.toLocaleString()} stakers, ` +
    `${subnet.risk} risk. ${subnet.description || "Track emissions, validators, and staker concentration."}`;

  return {
    title,
    description,
    keywords: [
      `Bittensor subnet ${subnet.netuid}`,
      `${subnet.name} Bittensor`,
      `${subnet.symbol} subnet`,
      `SN${subnet.netuid}`,
      "TAO staking",
      "Bittensor yield",
      "subnet analytics",
      subnet.category,
    ],
    alternates: { canonical: `/subnets/${subnet.netuid}` },
    openGraph: {
      title,
      description,
      url: `https://tyvera.ai/subnets/${subnet.netuid}`,
      type: "article",
      siteName: "Tyvera",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `Tyvera — Subnet ${subnet.netuid} ${subnet.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
  };
}

export default function SubnetDetailLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
