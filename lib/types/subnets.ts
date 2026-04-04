export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "SPECULATIVE";
export type MomentumDirection = "UP" | "DOWN" | "FLAT";

export interface SubnetCardModel {
  id: string;
  netuid: number;
  name: string;
  symbol: string;
  score: number;
  yield: number;
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

export interface SubnetDetailModel extends SubnetCardModel {
  validatorConcentration?: number;
  volatility?: number;
  confidence?: number;
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
