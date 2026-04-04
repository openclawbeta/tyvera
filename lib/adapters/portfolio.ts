import type {
  AllocationModel,
  PortfolioActivityItem,
  PortfolioHistoryModel,
  PortfolioStatsModel,
  WatchlistItemModel,
} from "@/lib/types/portfolio";
import type { TimeSeriesPoint } from "@/lib/types/subnets";
import type {
  Allocation as MockAllocation,
  PortfolioStats as MockPortfolioStats,
  RecentChange,
  WatchlistItem,
} from "@/lib/mock-data/portfolio";

interface PortfolioDto {
  stats: MockPortfolioStats | PortfolioStatsModel;
  allocations: Array<MockAllocation | AllocationModel>;
  watchlist?: Array<WatchlistItem | WatchlistItemModel>;
  meta?: { source: string; updatedAt: string };
}

interface PortfolioHistoryDto {
  series?: {
    value?: Array<{ label?: string; ts?: string; value: number }>;
    earnings?: Array<{ label?: string; ts?: string; value: number }>;
    yield?: Array<{ label?: string; ts?: string; value: number }>;
  };
}

interface PortfolioActivityDto {
  items?: RecentChange[] | Array<RecentChange | PortfolioActivityItem>;
}

interface WatchlistDto {
  items?: Array<WatchlistItem | WatchlistItemModel>;
}

export function mapPortfolioDto(dto: PortfolioDto) {
  return {
    stats: dto.stats,
    allocations: dto.allocations,
    watchlist: dto.watchlist ?? [],
    meta: dto.meta,
  };
}

export function mapPortfolioHistoryDto(dto: PortfolioHistoryDto): PortfolioHistoryModel {
  const mapSeries = (arr: Array<{ label?: string; ts?: string; value: number }> = []): TimeSeriesPoint[] =>
    arr.map((p) => ({
      label: p.label ?? p.ts ?? "",
      value: p.value,
    }));

  return {
    value: mapSeries(dto.series?.value),
    earnings: mapSeries(dto.series?.earnings),
    yield: mapSeries(dto.series?.yield),
  };
}

export function mapPortfolioActivityDto(dto: PortfolioActivityDto): PortfolioActivityItem[] {
  return (dto.items ?? []).map((item) => {
    const normalizedType: PortfolioActivityItem["type"] =
      item.type === "REALLOCATION"
        ? "MOVE"
        : item.type === "ADD" || item.type === "REMOVE"
          ? "STAKE"
          : item.type;

    return {
      id: item.id,
      type: normalizedType,
      fromSubnet: item.fromSubnet,
      toSubnet: item.toSubnet,
      subnet: item.subnet,
      amount: Number((("amountTao" in item ? item.amountTao : undefined) ?? item.amount ?? 0)),
      txHash: item.txHash,
      status: item.status,
      timestamp: String((("createdAt" in item ? item.createdAt : undefined) ?? item.timestamp ?? "")),
      label: "label" in item ? item.label : undefined,
    };
  });
}

export function mapWatchlistDto(dto: WatchlistDto): WatchlistItemModel[] {
  return dto.items ?? [];
}
