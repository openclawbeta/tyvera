/**
 * GET /api/billing
 *
 * Returns billing state for the authenticated wallet:
 * - Current subscription tier, status, expiry
 * - Payment history
 * - Available upgrade/downgrade options
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWalletAuth } from "@/lib/api/wallet-auth";
import { getBillingStatus } from "@/lib/api/billing";
import { getPaymentHistory } from "@/lib/db/payment-history";
import { TIER_DEFINITIONS } from "@/lib/types/tiers";

export async function GET(request: NextRequest) {
  const auth = await requireWalletAuth(request);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  const [billing, payments] = await Promise.all([
    getBillingStatus(address),
    getPaymentHistory(address),
  ]);

  const plans = TIER_DEFINITIONS.filter((t) => t.id !== "explorer").map((t) => ({
    id: t.planIds[0],
    tier: t.id,
    name: t.displayName,
    monthlyPrice: t.monthlyPrice,
    annualPrice: t.annualPrice,
    features: t.features.slice(0, 8), // summary
  }));

  return NextResponse.json({
    billing,
    payments: payments.map((p) => ({
      id: p.id,
      plan: p.plan_id,
      amount: p.amount_tao,
      txHash: p.tx_hash,
      cycle: p.billing_cycle,
      status: p.status,
      date: p.paid_at,
    })),
    plans,
  });
}
