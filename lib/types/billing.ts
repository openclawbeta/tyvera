export interface BillingPlanModel {
  id: string;
  displayName: string;
  priceTao: number;
  priceUsd: number;
  badge?: string;
  features: string[];
}

export type BillingPaymentStatus = "CONFIRMED" | "PENDING" | "FAILED";
export type EntitlementType = "ACTIVATED" | "EXTENDED" | "REACTIVATED";

export interface BillingHistoryItem {
  id: string;
  date: string;
  plan: string;
  amountTao: number;
  amountUsd: number;
  entitlementType: EntitlementType;
  txHash: string;
  status: BillingPaymentStatus;
}

export interface BillingStatusModel {
  currentPlan: string;
  premiumExpiresAt?: string;
  daysRemaining?: number;
  walletAddress: string;
  paymentHistory: BillingHistoryItem[];
  plans: BillingPlanModel[];
}
