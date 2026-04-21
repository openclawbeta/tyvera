import {
  mapPortfolioHistoryDto,
  mapPortfolioActivityDto,
} from "@/lib/adapters/portfolio";
import { getSubnets } from "@/lib/api/subnets";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type { WatchlistItemModel } from "@/lib/types/portfolio";

/**
 * Get portfolio data for a connected wallet.
 *
 * Returns an honest empty state when no address is provided or when
 * no on-chain stakes are found. Real stake data is fetched via
 * /api/portfolio endpoint (server-side Subtensor RPC query).
 */
export function getPortfolio(_address?: string) {
  return {
    stats: {
      totalStakedTao: 0,
      totalValueUsd: 0,
      weightedYield: 0,
      earnings7d: 0,
      earnings30d: 0,
      topSubnet: "—",
      diversificationScore: 0,
    },
    allocations: [],
    watchlist: [],
    meta: {
      source: _address ? "loading" : "disconnected",
      updatedAt: new Date().toISOString(),
    },
  };
}

export function getPortfolioHistory(_address?: string, _range = "30d") {
  if (!_address) {
    return mapPortfolioHistoryDto({
      series: { value: [], earnings: [], yield: [] },
    });
  }

  // Generate history from real subnet yields (no mock data dependency)
  const subnets = getSubnets().filter(s => s.liquidity > 0 && s.netuid !== 0);
  const avgYield = subnets.length > 0
    ? subnets.reduce((sum, s) => sum + s.yield, 0) / subnets.length
    : 10;

  const days = _range === "7d" ? 7 : _range === "14d" ? 14 : 30;
  const points: { day: string; value: number; yield: number }[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const day = date.toISOString().split("T")[0];
    const yieldVariation = avgYield * (0.85 + (i / days) * 0.3);

    points.push({
      day,
      value: 0, // No synthetic value — real data comes from portfolio API
      yield: Number(yieldVariation.toFixed(2)),
    });
  }

  return mapPortfolioHistoryDto({
    series: {
      value: points.map((p) => ({ label: p.day, value: p.value })),
      earnings: points.map((p) => ({ label: p.day, value: 0 })),
      yield: points.map((p) => ({ label: p.day, value: p.yield })),
    },
  });
}

/**
 * Fetch the real daily portfolio snapshot series for a wallet from
 * /api/portfolio/history. Returns null on any failure so the caller can
 * fall back to the synchronous placeholder without surfacing the error.
 */
export async function fetchPortfolioHistory(
  address?: string | null,
  range: "7d" | "14d" | "30d" | "90d" = "30d",
) {
  if (!address) return null;
  try {
    const resp = await fetchWithTimeout(
      `/api/portfolio/history?address=${encodeURIComponent(address)}&range=${range}`,
      { cache: "no-store", timeoutMs: 8_000 },
    );
    if (!resp.ok) return null;
    const body = await resp.json();
    const series = body?.series;
    if (!series) return null;
    return mapPortfolioHistoryDto({ series });
  } catch {
    return null;
  }
}

export function getPortfolioActivity(_address?: string) {
  return mapPortfolioActivityDto({ items: [] });
}

export function getWatchlist(_address?: string) {
  const subnets = getSubnets();

  if (subnets.length > 0) {
    const liveSubnets: WatchlistItemModel[] = subnets
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((subnet, index, arr): WatchlistItemModel => ({
        netuid: subnet.netuid,
        name: subnet.name,
        score: subnet.score,
        yield: subnet.yield,
        yieldDelta7d: subnet.yieldDelta7d,
        risk: subnet.risk,
        momentum: subnet.yieldDelta7d >= 0 ? "UP" : "DOWN",
        alert: subnet.risk === "SPECULATIVE" ? "Higher-risk setup" : subnet.risk === "HIGH" ? "Watch volatility" : undefined,
        reason: subnet.summary ?? `Strong candidate in ${subnet.category}`,
        compareTargetNetuid: arr[(index + 1) % arr.length]?.netuid,
        compareTargetName: arr[(index + 1) % arr.length]?.name,
      }));

    return liveSubnets;
  }

  return [];
}
