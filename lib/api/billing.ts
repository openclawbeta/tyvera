import { mapBillingStatusDto, mapBillingHistoryDto } from "@/lib/adapters/billing";
import { PLANS, BILLING_STATE } from "@/lib/mock-data/billing";
import type { WalletBillingState } from "@/lib/types/billing-state";
import type { PaymentIntent } from "@/lib/types/payment";

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

/**
 * Phase 2D — Create a payment intent for a selected plan.
 * Generates a unique deposit address and memo for the user.
 *
 * TODO: Replace with real backend call that derives a unique
 * deposit address from the user's wallet + plan selection.
 */
export function createPaymentIntent(
  planId: string,
  walletAddress: string,
): PaymentIntent {
  const plan = PLANS.find((p) => p.id === planId);
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h window

  // Generate a deterministic-looking mock deposit address and memo
  const shortAddr = walletAddress.slice(-8);
  const mockDepositAddress = `5Tyvera${shortAddr}${planId.slice(0, 4)}PaymentDeposit00`;
  const mockMemo = `TYV-${planId.slice(0, 4)}-${shortAddr}-${now.getTime().toString(36).toUpperCase()}`;

  return {
    id: `pi_${now.getTime().toString(36)}`,
    planId,
    planName: plan?.displayName ?? planId,
    amountTao: plan?.priceTao ?? 0,
    amountUsd: plan?.priceUsd ?? 0,
    depositAddress: mockDepositAddress,
    memo: mockMemo,
    status: "awaiting_payment",
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    txHash: null,
    confirmations: 0,
    requiredConfirmations: 6,
  };
}
