import { NextRequest, NextResponse } from "next/server";
import { getTierForPlan } from "@/lib/types/tiers";
import type { Tier } from "@/lib/types/tiers";

/* ─────────────────────────────────────────────────────────────────── */
/* Phase 2E — Entitlement endpoint                                     */
/*                                                                     */
/* GET /api/entitlement?address=5Grwva...                              */
/* Returns the current entitlement state for a wallet address.         */
/*                                                                     */
/* TODO: Replace mock lookup with real backend/DB query.               */
/* ─────────────────────────────────────────────────────────────────── */

export interface EntitlementResponse {
  address: string;
  tier: Tier;
  plan: string | null;
  status: "active" | "grace" | "expired" | "none";
  expiresAt: string | null;
  daysRemaining: number | null;
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Missing required query parameter: address" },
      { status: 400 },
    );
  }

  // TODO: Replace with real database lookup
  // For now, all addresses get basic tier with no active subscription
  const plan: string | null = null;
  const tier = getTierForPlan(plan);

  const response: EntitlementResponse = {
    address,
    tier,
    plan,
    status: "none",
    expiresAt: null,
    daysRemaining: null,
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "private, no-cache, no-store",
    },
  });
}
