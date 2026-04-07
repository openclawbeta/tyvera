import { mapBillingStatusDto, mapBillingHistoryDto } from "@/lib/adapters/billing";
import { PLANS, BILLING_STATE } from "@/lib/mock-data/billing";
import type { WalletBillingState } from "@/lib/types/billing-state";

/**
 * Returns billing state based on the connected wallet address.
 * When address is null (disconnected), returns a disconnected state.
 * When address is provided, returns connected_free for now.
 * TODO: Replace with real backend lookup — GET /api/billing?address=${address}
 */
export function getBillingStatus(address: string | null): WalletBillingState {
  if (!address) {
    return {
      status: "disconnected",
      currentPlan: null,
      expiresAt: null,
      daysRemaining: null,
      walletAddress: null,
    };
  }

  // TODO: Replace with real backend lookup — GET /api/billing?address=${address}
  return {
    status: "connected_free",
    currentPlan: null,
    expiresAt: null,
    daysRemaining: null,
    walletAddress: address,
  };
}

/**
 * Returns the full legacy billing status model (used for active subscription rendering).
 * This function still returns mock data and is only called when status === "active".
 */
export function getLegacyBillingStatus() {
  return mapBillingStatusDto({
    currentPlan: BILLING_STATE.currentPlan,
    premiumExpiresAt: BILLING_STATE.premiumExpiresAt ?? undefined,
    daysRemaining: BILLING_STATE.daysRemaining ?? undefined,
    walletAddress: BILLING_STATE.walletAddress,
    paymentHistory: BILLING_STATE.paymentHistory,
    plans: PLANS,
  });
}

/** Returns plans list for display regardless of billing status */
export function getPlans() {
  return PLANS;
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
