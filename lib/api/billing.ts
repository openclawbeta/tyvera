import { mapBillingStatusDto, mapBillingHistoryDto } from "@/lib/adapters/billing";
import { PLANS, BILLING_STATE } from "@/lib/mock-data/billing";
import type { WalletBillingState } from "@/lib/types/billing-state";

export function getBillingStatus(address?: string | null): WalletBillingState {
  if (!address) {
    return {
      status: "disconnected",
      currentPlan: null,
      expiresAt: null,
      daysRemaining: null,
      walletAddress: null,
    };
  }
  return {
    status: "connected_free",
    currentPlan: null,
    expiresAt: null,
    daysRemaining: null,
    walletAddress: address,
  };
}

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

export function getPlans() {
  return PLANS;
}

export function getBillingHistory() {
  return mapBillingHistoryDto({ items: BILLING_STATE.paymentHistory });
}

export function createPaymentRequest(planId: string) {
  return {
    id: `mock-payment-${planId.toLowerCase()}`,
    planId,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
}

export async function createPaymentIntent(planId: string, _walletAddress?: string) {
  return {
    id: `pi-${Date.now()}`,
    walletAddress: _walletAddress ?? "",
    planId,
    planName: planId,
    amountTao: 0,
    amountUsd: 0,
    memo: `tyvera-${planId}-${Date.now()}`,
    depositAddress: "5EkH7oV4EvT2otiH1teYu9gM2bkhuQTZbZrrPuqxHQMVTjRZ",
    status: "awaiting_payment" as const,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    txHash: null,
    confirmations: 0,
    requiredConfirmations: 6,
  };
}
