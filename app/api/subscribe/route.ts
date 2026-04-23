import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { storePaymentIntent } from "@/lib/db/subscriptions";
import { TIER_DEFINITIONS } from "@/lib/types/tiers";
import type { Tier } from "@/lib/types/tiers";
import { MONTHLY_DURATION_DAYS, ANNUAL_DURATION_DAYS, PAYMENT_INTENT_EXPIRY_MS } from "@/lib/config";
import { requireEnv } from "@/lib/env";
import { parseSubscribeBody } from "@/lib/api/validation";
import { requireWalletAuth } from "@/lib/api/wallet-auth";

/* ─────────────────────────────────────────────────────────────────── */
/* Subscribe endpoint — creates a payment intent                       */
/*                                                                     */
/* POST /api/subscribe                                                 */
/* Body: { address, plan, billing: "monthly"|"annual" }                */
/*                                                                     */
/* Returns payment instructions: deposit address, memo, amount.        */
/* The /api/verify-payments cron matches incoming transfers by memo.    */
/* ─────────────────────────────────────────────────────────────────── */

function getDepositAddress(): string {
  return requireEnv("DEPOSIT_ADDRESS");
}

/**
 * Sanity bounds for the fetched TAO/USD rate. A quote outside this range
 * almost certainly indicates a bad data source and would produce bogus
 * billing amounts, so we fail-closed rather than invoice at the wrong rate.
 */
const TAO_USD_MIN = 50;
const TAO_USD_MAX = 10_000;
/** Maximum acceptable age of the price snapshot used to invoice a user. */
const TAO_USD_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

class PriceUnavailableError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "PriceUnavailableError";
  }
}

/**
 * Compute TAO prices dynamically from USD tier prices and the current
 * verified TAO rate. If the rate cannot be obtained within sanity bounds,
 * throw — subscribe requests MUST fail-closed rather than bill the user at
 * a silently-wrong rate.
 */
async function getTaoPrices(): Promise<Record<string, { monthly: number; annual: number }>> {
  const baseUrl = process.env.VERCEL_URL
    ? "https://" + process.env.VERCEL_URL
    : "http://localhost:3000";

  let res: Response;
  try {
    res = await fetch(baseUrl + "/api/tao-rate", { next: { revalidate: 300 } });
  } catch {
    throw new PriceUnavailableError("fetch_failed", "TAO price feed unreachable");
  }
  if (!res.ok) {
    throw new PriceUnavailableError("bad_status", `TAO price feed returned ${res.status}`);
  }

  const data = await res.json().catch(() => null);
  if (!data || typeof data !== "object") {
    throw new PriceUnavailableError("bad_payload", "TAO price feed returned invalid payload");
  }

  const taoUsd = typeof data.taoUsd === "number" ? data.taoUsd : null;
  if (taoUsd === null || !Number.isFinite(taoUsd) || taoUsd <= 0) {
    throw new PriceUnavailableError("no_price", "TAO price feed has no usable quote yet");
  }
  if (taoUsd < TAO_USD_MIN || taoUsd > TAO_USD_MAX) {
    throw new PriceUnavailableError(
      "out_of_bounds",
      `TAO/USD rate ${taoUsd} is outside sanity bounds [${TAO_USD_MIN}, ${TAO_USD_MAX}]`,
    );
  }

  // Freshness check. `fetchedAt` comes back inside the `_meta` envelope
  // emitted by apiResponse(); accept top-level or `meta` as fallbacks.
  const meta =
    (data as { _meta?: { fetchedAt?: unknown } })._meta ??
    (data as { meta?: { fetchedAt?: unknown } }).meta;
  const fetchedAtRaw =
    meta && typeof meta === "object" && typeof meta.fetchedAt === "string"
      ? meta.fetchedAt
      : typeof (data as { fetchedAt?: unknown }).fetchedAt === "string"
        ? (data as { fetchedAt: string }).fetchedAt
        : null;
  if (fetchedAtRaw) {
    const fetchedMs = Date.parse(fetchedAtRaw);
    if (Number.isFinite(fetchedMs)) {
      const ageMs = Date.now() - fetchedMs;
      if (ageMs > TAO_USD_MAX_AGE_MS) {
        throw new PriceUnavailableError(
          "stale",
          `TAO price quote is ${Math.round(ageMs / 1000)}s old (max ${TAO_USD_MAX_AGE_MS / 1000}s)`,
        );
      }
    }
  }

  // Derive USD prices from TIER_DEFINITIONS (single source of truth) + 2% buffer
  const buffer = 1.02;
  const prices: Record<string, { monthly: number; annual: number }> = {};
  for (const tier of TIER_DEFINITIONS) {
    if (tier.monthlyPrice > 0) {
      for (const planId of tier.planIds) {
        prices[planId] = {
          monthly: Math.ceil((tier.monthlyPrice / taoUsd) * buffer * 10000) / 10000,
          annual:  Math.ceil((tier.annualPrice / taoUsd) * buffer * 10000) / 10000,
        };
      }
    }
  }
  return prices;
}

const VALID_PLANS = ["ANALYST", "STRATEGIST", "INSTITUTIONAL"];

export async function POST(request: NextRequest) {
  try {
    // ── Authenticate the caller ──────────────────────────────────
    // Intents may only be created by the wallet they are bound to.
    // Without this check an attacker could pre-register an intent
    // for any address and hijack the legitimate payment flow.
    const auth = await requireWalletAuth(request);
    if (!auth.verified || !auth.address) {
      return auth.errorResponse ?? NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const raw = await request.json().catch(() => null);
    const parsed = parseSubscribeBody(raw, VALID_PLANS);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { address, plan, billing } = parsed.value;

    // Body-supplied address must match the authenticated wallet.
    if (address !== auth.address) {
      return NextResponse.json(
        { error: "Address in body does not match authenticated wallet" },
        { status: 403 },
      );
    }

    let taoPrices: Record<string, { monthly: number; annual: number }>;
    try {
      taoPrices = await getTaoPrices();
    } catch (err) {
      if (err instanceof PriceUnavailableError) {
        console.error("[Subscribe] Price unavailable:", err.code, err.message);
        return NextResponse.json(
          {
            error:
              "Pricing is temporarily unavailable. Please try again in a minute.",
            code: err.code,
          },
          { status: 503 },
        );
      }
      throw err;
    }
    const priceEntry = taoPrices[plan as keyof typeof taoPrices];
    const baseAmount = billing === "annual" ? priceEntry.annual : priceEntry.monthly;

    // Add a small random fractional offset (0.001–0.009 TAO) to make the
    // amount unique per intent. This prevents same-plan collisions where
    // two users subscribing simultaneously produce identical amounts.
    // The 1% tolerance in the verifier easily absorbs this offset.
    const offset = +(Math.floor(Math.random() * 9 + 1) / 1000).toFixed(3);
    const amountTao = +(baseAmount + offset).toFixed(4);
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
      billingCycle: billing,
      durationDays,
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
      deposit_address: getDepositAddress(),
      memo,
      expires_at: expiresAt,
      instructions: [
        `Send exactly ${amountTao} τ to ${getDepositAddress()}`,
        `Include memo: ${memo}`,
        "Payment will be verified automatically within 10 minutes",
        "Your subscription activates immediately on confirmation",
      ],
    });
  } catch (err) {
    console.error("[Subscribe] Error:", err);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 },
    );
  }
}
