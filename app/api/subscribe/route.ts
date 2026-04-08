import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { storePaymentIntent } from "@/lib/db/subscriptions";
import { TIER_DEFINITIONS } from "@/lib/types/tiers";
import type { Tier } from "@/lib/types/tiers";
import { MONTHLY_DURATION_DAYS, ANNUAL_DURATION_DAYS, PAYMENT_INTENT_EXPIRY_MS } from "@/lib/config";

/* ─────────────────────────────────────────────────────────────────── */
/* Subscribe endpoint — creates a payment intent                       */
/*                                                                     */
/* POST /api/subscribe                                                 */
/* Body: { address, plan, billing: "monthly"|"annual" }                */
/*                                                                     */
/* Returns payment instructions: deposit address, memo, amount.        */
/* The /api/verify-payments cron matches incoming transfers by memo.    */
/* ─────────────────────────────────────────────────────────────────── */

const DEPOSIT_ADDRESS = process.env.DEPOSIT_ADDRESS || "5EkH7oV4EvT2otiH1teYu9gM2bkhuQTZbZrrPuqxHQMVTjRZ";

/**
 * Compute TAO prices dynamically from USD tier prices and current TAO rate.
 * Falls back to conservative estimates if price fetch fails.
 */
async function getTaoPrices(): Promise<Record<string, { monthly: number; annual: number }>> {
  let taoUsd = 600; // conservative fallback

  try {
    const baseUrl = process.env.VERCEL_URL
      ? "https://" + process.env.VERCEL_URL
      : "http://localhost:3000";
    const res = await fetch(baseUrl + "/api/tao-rate", { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      if (data.taoUsd && data.taoUsd > 0) {
        taoUsd = data.taoUsd;
      }
    }
  } catch {
    // Use fallback
  }

  // USD prices from TIER_DEFINITIONS + 2% buffer for price movement
  const buffer = 1.02;
  return {
    ANALYST:        { monthly: Math.ceil((9 / taoUsd) * buffer * 10000) / 10000,   annual: Math.ceil((86 / taoUsd) * buffer * 10000) / 10000 },
    STRATEGIST:     { monthly: Math.ceil((29 / taoUsd) * buffer * 10000) / 10000,  annual: Math.ceil((278 / taoUsd) * buffer * 10000) / 10000 },
    INSTITUTIONAL:  { monthly: Math.ceil((99 / taoUsd) * buffer * 10000) / 10000,  annual: Math.ceil((950 / taoUsd) * buffer * 10000) / 10000 },
  };
}

const VALID_PLANS = ["ANALYST", "STRATEGIST", "INSTITUTIONAL"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, plan, billing = "monthly" } = body;

    if (!address) {
      return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
    }

    if (!plan || !VALID_PLANS.includes(plan)) {
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

    const taoPrices = await getTaoPrices();
    const priceEntry = taoPrices[plan as keyof typeof taoPrices];
    const amountTao = billing === "annual" ? priceEntry.annual : priceEntry.monthly;
    const durationDays = billing === "annual" ? ANNUAL_DURATION_DAYS : MONTHLY_DURATION_DAYS;
    const memo = `TYV-${randomUUID().slice(0, 8).toUpperCase()}`;
    const intentId = randomUUID();
    const expiresAt = new Date(Date.now() + PAYMENT_INTENT_EXPIRY_MS).toISOString();

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
