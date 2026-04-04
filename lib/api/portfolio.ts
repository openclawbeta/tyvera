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
  // TODO: replace stub with real backend call.
  return mapWatchlistDto({ items: WATCHLIST });
}
