export type ActivityType = "TRANSFER" | "STAKE" | "UNSTAKE" | "MOVE_STAKE" | "REGISTER" | "SET_WEIGHTS" | "CLAIM";

export type ActivityStatus = "CONFIRMED" | "PENDING" | "FAILED";

export interface ActivityEvent {
  id: string;
  blockNumber: number;
  timestamp: string | Date;
  type: ActivityType;
  fromAddress: string;
  toAddress: string;
  amountTao: number;
  fee: number;
  subnet?: string;
  txHash: string;
  status: ActivityStatus;
}

export interface ActivitySummary {
  totalTransactions: number;
  totalStaked: number;
  totalUnstaked: number;
  totalFees: number;
  recentBlocks: number;
}
