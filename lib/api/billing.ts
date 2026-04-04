import { mapBillingStatusDto, mapBillingHistoryDto } from "@/lib/adapters/billing";
import { PLANS, BILLING_STATE } from "@/lib/mock-data/billing";

export function getBillingStatus() {
  // TODO: replace stub with real backend call.
  return mapBillingStatusDto({
    currentPlan: BILLING_STATE.currentPlan,
    premiumExpiresAt: BILLING_STATE.premiumExpiresAt ?? undefined,
    daysRemaining: BILLING_STATE.daysRemaining ?? undefined,
    walletAddress: BILLING_STATE.walletAddress,
    paymentHistory: BILLING_STATE.paymentHistory,
    plans: PLANS,
  });
}

export function getBillingHistory() {
  // TODO: replace stub with real backend call.
  return mapBillingHistoryDto({ items: BILLING_STATE.paymentHistory });
}

export function createPaymentRequest(planId: string) {
  // TODO: replace stub with real backend call.
  return {
    id: `mock-payment-${planId.toLowerCase()}`,
    planId,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
}
