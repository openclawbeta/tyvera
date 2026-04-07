/**
 * lib/types/backtest.ts
 *
 * Backtester configuration and result types for strategy simulation.
 */

export type StrategyType = "hold" | "move" | "split" | "top_yield" | "diversified";
export type BacktestPeriod = "30d" | "90d" | "180d" | "1y";

export interface BacktestConfig {
  initialAmount: number;           // τ staked
  strategy: StrategyType;
  subnetA: number;                 // netuid of primary subnet
  subnetB?: number;                // netuid of secondary subnet (for move/split)
  period: BacktestPeriod;
  rebalanceFrequency?: "daily" | "weekly" | "monthly";
}

export interface DailySnapshot {
  date: string;                    // ISO date string
  value: number;                   // portfolio value in τ
  yield: number;                   // daily yield %
  cumulativeReturn: number;        // cumulative return from start %
}

export interface BacktestResult {
  config: BacktestConfig;
  dailyValues: DailySnapshot[];
  finalValue: number;              // final portfolio value in τ
  totalReturn: number;             // total return in τ
  totalReturnPct: number;          // total return as %
  maxDrawdown: number;             // max peak-to-trough as %
  sharpeRatio: number;             // return / volatility
  bestDay: {
    date: string;
    returnPct: number;
  };
  worstDay: {
    date: string;
    returnPct: number;
  };
  comparisonBaseline: number;      // what you'd earn in root/SN0 at ~18% APR
}
