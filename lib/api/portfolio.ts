import {
  mapPortfolioDto,
  mapPortfolioHistoryDto,
  mapPortfolioActivityDto,
  mapWatchlistDto,
} from "@/lib/adapters/portfolio";
import {
  PORTFOLIO_STATS,
  ALLOCATIONS,
  PORTFOLIO_HISTORY,
  RECENT_CHANGES,
  WATCHLIST,
} from "@/lib/mock-data/portfolio";
import { getSubnets } from "@/lib/api/subnets";
import type { WatchlistItemModel } from "@/lib/types/portfolio";

export function getPortfolio(_address?: string) {
  // Return disconnected state when no wallet is connected
  if (!_address) {
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
      meta: { source: "disconnected", updatedAt: new Date().toISOString() },
    };
  }

  // TODO: replace with Subtensor RPC query for real staked positions
  return mapPortfolioDto({
    stats: PORTFOLIO_STATS,
    allocations: ALLOCATIONS,
    watchlist: WATCHLIST,
    meta: { source: "mock", updatedAt: new Date().toISOString() },
  });
}

export function getPortfolioHistory(_address?: string, _range = "30d") {
  // Generate synthetic history data seeded from real subnet yields
  const subnets = getSubnets().filter(s => s.liquidity > 0 && s.netuid !== 0);
  const avgYield = subnets.length > 0
    ? subnets.reduce((sum, s) => sum + s.yield, 0) / subnets.length
    : 10;

  const syntheticHistory = PORTFOLIO_HISTORY.map((point, index) => {
    // Seed realistic growth curves from actual subnet data
    const yieldVariation = avgYield * (0.85 + (index / PORTFOLIO_HISTORY.length) * 0.3);
    const baseValue = 50000 + (index * 100); // Modest growth trajectory

    return {
      day: point.day,
      value: baseValue + (Math.random() * 5000),
      yield: Number((yieldVariation + (Math.random() - 0.5) * 2).toFixed(2)),
    };
  });

  return mapPortfolioHistoryDto({
    series: {
      value: syntheticHistory.map((point) => ({ label: point.day, value: point.value })),
      earnings: syntheticHistory.map((point) => ({
        label: point.day,
        value: Number((point.value * point.yield / 100 / 365).toFixed(4)),
      })),
      yield: syntheticHistory.map((point) => ({ label: point.day, value: point.yield })),
    },
  });
}

export function getPortfolioActivity(_address?: string) {
  // Return empty array when disconnected, mock data when connected
  if (!_address) {
    return mapPortfolioActivityDto({ items: [] });
  }

  // TODO: replace stub with real backend call.
  return mapPortfolioActivityDto({ items: RECENT_CHANGES });
}

export function getWatchlist(_address?: string) {
  // Try to get live subnets first
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

  // Fallback to mock data only if no live subnets are available
  const seedItems = mapWatchlistDto({ items: WATCHLIST });
  return seedItems;
}
