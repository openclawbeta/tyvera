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
  // TODO: replace stub with real backend call.
  return mapPortfolioDto({
    stats: PORTFOLIO_STATS,
    allocations: ALLOCATIONS,
    watchlist: WATCHLIST,
    meta: { source: "mock", updatedAt: new Date().toISOString() },
  });
}

export function getPortfolioHistory(_address?: string, _range = "30d") {
  // TODO: replace stub with real backend call.
  return mapPortfolioHistoryDto({
    series: {
      value: PORTFOLIO_HISTORY.map((point) => ({ label: point.day, value: point.value })),
      earnings: PORTFOLIO_HISTORY.map((point, index) => ({
        label: point.day,
        value: Number((PORTFOLIO_STATS.earnings30d / PORTFOLIO_HISTORY.length * (0.85 + index * 0.02)).toFixed(4)),
      })),
      yield: PORTFOLIO_HISTORY.map((point) => ({ label: point.day, value: point.yield })),
    },
  });
}

export function getPortfolioActivity(_address?: string) {
  // TODO: replace stub with real backend call.
  return mapPortfolioActivityDto({ items: RECENT_CHANGES });
}

export function getWatchlist(_address?: string) {
  const liveSubnets: WatchlistItemModel[] = getSubnets()
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

  const seedItems = mapWatchlistDto({ items: WATCHLIST });
  return liveSubnets.length > 0 ? liveSubnets : seedItems;
}
