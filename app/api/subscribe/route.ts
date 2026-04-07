import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { storePaymentIntent } from "@/lib/db/subscriptions";
import { TIER_DEFINITIONS } from "@/lib/types/tiers";
import type { Tier } from "@/lib/types/tiers";

/* ─────────────────────────────────────────────────────────────────── */
/* Subscribe endpoint — creates a payment intent                       */
/*                                                                     */
/* POST /api/subscribe                                                 */
/* Body: { address, plan, billing: "monthly"|"annual" }                */
/*                                                                     */
/* Returns payment instructions: deposit address, memo, amount.        */
/* The /api/verify-payments cron matches incoming transfers by memo.    */
/* ─────────────────────────────────────────────────────────────────── */

const DEPOSIT_ADDRESS = "5EkH7oV4EvT2otiH1teYu9gM2bkhuQTZbZrrPuqxHQMVTjRZ";

// TAO amounts per plan (recalculated weekly in production)
const TAO_PRICES: Record<string, { monthly: number; annual: number }> = {
  ANALYST: { monthly: 0.025, annual: 0.24 },
  STRATEGIST: { monthly: 0.08, annual: 0.77 },
  INSTITUTIONAL: { monthly: 0.27, annual: 2.6 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, plan, billing = "monthly" } = body;

    if (!address) {
      return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
    }

    if (!plan || !TAO_PRICES[plan]) {
      return NextResponse.json(
        { error: "Invalid plan. Options: ANALYST, STRATEGIST, INSTITUTIONAL" },
        { status: 400 },
      );
    }

    if (billing !== "monthly" && billing !== "annual") {
      return NextResponse.json(
        { error: "Invalid billing cycle. Options: monthly, annual" },
        { status: 400 },
      );
    }

    const priceEntry = TAO_PRICES[plan as keyof typeof TAO_PRICES];
    const amountTao = billing === "annual" ? priceEntry.annual : priceEntry.monthly;
    const durationDays = billing === "annual" ? 365 : 30;
    const memo = `TYV-${randomUUID().slice(0, 8).toUpperCase()}`;
    const intentId = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h to pay

    // Find the tier definition for display info
    const tierDef = TIER_DEFINITIONS.find((d) => d.planIds.includes(plan));

    await storePaymentIntent({
      id: intentId,
      walletAddress: address,
      planId: plan,
      amountTao,
      memo,
      expiresAt,
    });

    return NextResponse.json({
      intent_id: intentId,
      plan,
      tier: tierDef?.id ?? plan.toLowerCase(),
      display_name: tierDef?.displayName ?? plan,
      billing,
      amount_tao: amountTao,
      duration_days: durationDays,
      deposit_address: DEPOSIT_ADDRESS,
      memo,
      expires_at: expiresAt,
      instructions: [
        `Send exactly ${amountTao} τ to ${DEPOSIT_ADDRESS}`,
        `Include memo: ${memo}`,
        "Payment will be verified automatically within 10 minutes",
        "Your subscription activates immediately on confirmation",
      ],
    });
  } catch (err) {
    console.error("[Subscribe] Error:", err);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
