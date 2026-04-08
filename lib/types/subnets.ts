export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "SPECULATIVE";
export type MomentumDirection = "UP" | "DOWN" | "FLAT";

export interface SubnetCardModel {
  id: string;
  netuid: number;
  name: string;
  symbol: string;
  score: number;
  yield: number; // normalized allocator-facing yield
  rawYield?: number; // raw annualized emissions APR before normalization
  yieldDelta7d: number;
  inflow: number;
  inflowPct: number;
  risk: RiskLevel;
  liquidity: number;
  stakers: number;
  emissions: number;
  validatorTake: number;
  description: string;
  category: string;
  momentum: number[];
  momentumDirection?: MomentumDirection;
  isWatched: boolean;
  breakeven: number;
  age: number;
}

export interface SubnetLinkSet {
  website?: string;
  docs?: string;
  github?: string;
  x?: string;
  discord?: string;
  explorer?: string;
}

export interface SubnetDetailModel extends SubnetCardModel {
  validatorConcentration?: number;
  volatility?: number;
  confidence?: number;
  summary?: string;
  thesis?: string[];
  useCases?: string[];
  links?: SubnetLinkSet;
  alphaPrice?: number;
  marketCap?: number;
  volume24h?: number;
  volumeCapRatio?: number;
  change1h?: number;
  change24h?: number;
  change1w?: number;
  change1m?: number;
  flow24h?: number;
  flow1w?: number;
  flow1m?: number;
  dailyChainBuys?: number;
  incentivePct?: number;
}

export interface TimeSeriesPoint {
  label: string;
  value: number;
}

export interface SubnetHistoryModel {
  yield: TimeSeriesPoint[];
  inflow: TimeSeriesPoint[];
  liquidity: TimeSeriesPoint[];
  emissions: TimeSeriesPoint[];
}

/* ── TAO Staking Baseline (root network netuid 0) ────────────────── */

export interface TaoBaseline {
  yield: number;
  liquidity: number;
  emissions: number;
  source: "subtensor-snapshot" | "taostats-live" | "unavailable";
  fetchedAt: string;
}
