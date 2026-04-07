import type { BillingHistoryItem, BillingPlanModel, BillingStatusModel } from "@/lib/types/billing";
import type { BillingState, PaymentRecord, Plan } from "@/lib/mock-data/billing";

interface BillingStatusDto {
  currentPlan: BillingState["currentPlan"] | string;
  premiumExpiresAt?: string;
  daysRemaining?: number;
  walletAddress: string;
  paymentHistory?: Array<PaymentRecord | BillingHistoryItem>;
  plans?: Array<(Plan & { durationDays?: number }) | BillingPlanModel>;
}

interface BillingHistoryDto {
  items?: Array<PaymentRecord | BillingHistoryItem>;
}

export function mapBillingStatusDto(dto: BillingStatusDto): BillingStatusModel {
  return {
    currentPlan: dto.currentPlan,
    premiumExpiresAt: dto.premiumExpiresAt,
    daysRemaining: dto.daysRemaining,
    walletAddress: dto.walletAddress,
    paymentHistory: dto.paymentHistory ?? [],
    plans: dto.plans ?? [],
  };
}

export function mapBillingHistoryDto(dto: BillingHistoryDto): BillingHistoryItem[] {
  return dto.items ?? [];
}
