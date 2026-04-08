import { getEntitlement, storePaymentIntent } from "@/lib/db/subscriptions";
import { TIER_DEFINITIONS } from "@/lib/types/tiers";
import { randomUUID } from "crypto";
import { PAYMENT_INTENT_EXPIRY_MS } from "@/lib/config";
import type { WalletBillingState } from "@/lib/types/billing-state";

/**
 * Get billing status for a wallet — reads from the real subscription database.
 */
export async function getBillingStatus(address?: string | null): Promise<WalletBillingState> {
  if (!address) {
    return {
      status: "disconnected",
      currentPlan: null,
      expiresAt: null,
      daysRemaining: null,
      walletAddress: null,
    };
  }

  try {
    const entitlement = await getEntitlement(address);

    if (entitlement) {
      const tierDef = TIER_DEFINITIONS.find((d) => d.id === entitlement.tier);
      return {
        status: entitlement.status === "active" ? "connected_premium" : "connected_grace",
        currentPlan: tierDef?.displayName ?? entitlement.plan_id,
        expiresAt: entitlement.expires_at,
        daysRemaining: entitlement.days_remaining,
        walletAddress: address,
      };
    }

    return {
      status: "connected_free",
      currentPlan: null,
      expiresAt: null,
      daysRemaining: null,
      walletAddress: address,
    };
  } catch (err) {
    console.error("[billing] Error fetching entitlement:", err);
    return {
      status: "connected_free",
      currentPlan: null,
      expiresAt: null,
      daysRemaining: null,
      walletAddress: address,
    };
  }
}

/**
 * Get available plans from tier definitions (real source of truth).
 */
export function getPlans() {
  return TIER_DEFINITIONS.map((tier) => ({
    id: tier.planIds[0] || tier.id,
    name: tier.displayName,
    price: tier.monthlyPrice,
    features: tier.features || [],
    tier: tier.id,
  }));
}

/**
 * Create a real payment intent stored in the database.
 */
export async function createPaymentIntent(planId: string, walletAddress?: string, billingCycle: "monthly" | "annual" = "monthly") {
  const depositAddress = process.env.DEPOSIT_ADDRESS || "5EkH7oV4EvT2otiH1teYu9gM2bkhuQTZbZrrPuqxHQMVTjRZ";
  const tierDef = TIER_DEFINITIONS.find((d) => d.planIds.includes(planId));
  const amountTao = tierDef
    ? (billingCycle === "annual" ? tierDef.annualPrice : tierDef.monthlyPrice)
    : 0;
  const durationDays = billingCycle === "annual" ? 365 : 30;
  const intentId = randomUUID();
  const memo = "TYV-" + randomUUID().slice(0, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + PAYMENT_INTENT_EXPIRY_MS).toISOString();

  await storePaymentIntent({
    id: intentId,
    walletAddress: walletAddress ?? "",
    planId,
    amountTao,
    memo,
    billingCycle,
    durationDays,
    expiresAt,
  });

  return {
    id: intentId,
    walletAddress: walletAddress ?? "",
    planId,
    planName: tierDef?.displayName ?? planId,
    amountTao,
    amountUsd: tierDef?.monthlyPrice ?? 0,
    memo,
    depositAddress,
    status: "awaiting_payment" as const,
    createdAt: new Date().toISOString(),
    expiresAt,
    txHash: null,
    confirmations: 0,
    requiredConfirmations: 6,
  };
}
