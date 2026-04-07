export type TaxEventType = "STAKING_REWARD" | "STAKE" | "UNSTAKE" | "MOVE" | "SUBSCRIPTION";

export interface TaxEvent {
  id: string;
  date: string; // ISO string
  type: TaxEventType;
  subnet: string;
  amountTao: number;
  priceUsdAtTime: number;
  valueUsd: number;
  txHash?: string;
  notes?: string;
}

export interface TaxSummary {
  totalRewardsTao: number;
  totalRewardsUsd: number;
  totalFeesTao: number;
  totalFeesUsd: number;
  netIncomeTao: number;
  netIncomeUsd: number;
  eventCount: number;
  startDate: string;
  endDate: string;
}
