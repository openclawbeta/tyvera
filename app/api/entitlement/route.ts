import { NextRequest, NextResponse } from "next/server";
import { getEntitlement } from "@/lib/db/subscriptions";
import { getTierForPlan, normalizeTier } from "@/lib/types/tiers";
import type { Tier } from "@/lib/types/tiers";

/* ─────────────────────────────────────────────────────────────────── */
/* Entitlement endpoint — now backed by SQLite                         */
/*                                                                     */
/* GET /api/entitlement?address=5Grwva...                              */
/* Returns the current entitlement state for a wallet address.         */
/*                                                                     */
/* Priority:                                                           */
/*   1. Active subscription (from payment)                             */
/*   2. Admin override (manually granted)                              */
/*   3. Basic tier (free, default)                                     */
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

  try {
    // Check database for active subscription or admin override
    const entitlement = await getEntitlement(address);

    if (entitlement) {
      const response: EntitlementResponse = {
        address,
        tier: normalizeTier(entitlement.tier),
        plan: entitlement.plan_id,
        status: entitlement.status,
        expiresAt: entitlement.expires_at,
        daysRemaining: entitlement.days_remaining,
      };

      return NextResponse.json(response, {
        headers: { "Cache-Control": "private, no-cache, no-store" },
      });
    }
  } catch (err) {
    // Database error — fail open to basic tier
    console.error("[Entitlement] DB error, falling back to basic:", err);
  }

  // No active subscription — return explorer tier
  const response: EntitlementResponse = {
    address,
    tier: "explorer",
    plan: null,
    status: "none",
    expiresAt: null,
    daysRemaining: null,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "private, no-cache, no-store" },
  });
}
