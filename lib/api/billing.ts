import { mapBillingStatusDto, mapBillingHistoryDto } from "@/lib/adapters/billing";
import { PLANS, BILLING_STATE } from "@/lib/mock-data/billing";
import { storePaymentIntent } from "@/lib/db/subscriptions";
import type { WalletBillingState } from "@/lib/types/billing-state";
import type { PaymentIntent } from "@/lib/types/payment";

// Tyvera payment deposit address (Talisman coldkey)
const DEPOSIT_ADDRESS = "5EkH7oV4EvT2otiH1teYu9gM2bkhuQTZbZrrPuqxHQMVTjRZ";

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
 * Create a payment intent for a selected plan.
 * Generates a unique memo and stores the intent in SQLite
 * so the payment verifier can match incoming transfers.
 */
export async function createPaymentIntent(
  planId: string,
  walletAddress: string,
): Promise<PaymentIntent> {
  const plan = PLANS.find((p) => p.id === planId);
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h window

  const shortAddr = walletAddress.slice(-8);
  const intentId = `pi_${now.getTime().toString(36)}`;
  const memo = `TYV-${planId.slice(0, 4)}-${shortAddr}-${now.getTime().toString(36).toUpperCase()}`;
  const amountTao = plan?.priceTao ?? 0;

  // Store in database so the verifier can match it
  try {
    await storePaymentIntent({
      id: intentId,
      walletAddress,
      planId,
      amountTao,
      memo,
      expiresAt: expires.toISOString(),
    });
  } catch (err) {
    console.error("[Billing] Failed to store payment intent:", err);
    // Continue anyway — the UI still shows the payment details
  }

  return {
    id: intentId,
    planId,
    planName: plan?.displayName ?? planId,
    amountTao,
    amountUsd: plan?.priceUsd ?? 0,
    depositAddress: DEPOSIT_ADDRESS,
    memo,
    status: "awaiting_payment",
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    txHash: null,
    confirmations: 0,
    requiredConfirmations: 6,
  };
}
