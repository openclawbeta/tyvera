import type { RiskLevel, MomentumDirection, TimeSeriesPoint } from "./subnets";

export interface AllocationModel {
  netuid: number;
  name: string;
  symbol: string;
  amountTao: number;
  fraction: number;
  yield: number;
  yieldDelta7d: number;
  value: number;
  earnings7d: number;
  color: string;
}

export interface PortfolioStatsModel {
  totalStakedTao: number;
  totalValueUsd: number;
  weightedYield: number;
  earnings7d: number;
  earnings30d: number;
  topSubnet: string;
  diversificationScore: number;
}

export interface PortfolioHistoryModel {
  value: TimeSeriesPoint[];
  earnings: TimeSeriesPoint[];
  yield: TimeSeriesPoint[];
}

export interface PortfolioActivityItem {
  id: string;
  type: "MOVE" | "STAKE" | "REALLOCATION" | "REWARD" | "INFO";
  fromSubnet?: string;
  toSubnet?: string;
  subnet?: string;
  amount: number;
  txHash?: string;
  status: string;
  timestamp: string;
  label?: string;
}

export interface WatchlistItemModel {
  netuid: number;
  name: string;
  score: number;
  yield: number;
  yieldDelta7d: number;
  risk?: RiskLevel;
  momentum?: MomentumDirection;
  alert?: string;
}
