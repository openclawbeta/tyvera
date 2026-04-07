import { NextRequest, NextResponse } from "next/server";
import { adminGrantSubscription, getEntitlement } from "@/lib/db/subscriptions";

/* ─────────────────────────────────────────────────────────────────── */
/* Admin subscription management                                       */
/*                                                                     */
/* POST /api/admin/subscription — grant a subscription manually        */
/* GET  /api/admin/subscription?address=... — check entitlement        */
/*                                                                     */
/* TODO: Add authentication (API key or admin session) before launch.  */
/* Currently open for development/testing.                             */
/* ─────────────────────────────────────────────────────────────────── */

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "tyvera-dev-admin";

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("Authorization");
  return authHeader === `Bearer ${ADMIN_SECRET}`;
}

/**
 * POST /api/admin/subscription
 * Body: { walletAddress, planId, reason, durationDays? }
 */
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { walletAddress, planId, reason, durationDays } = body;

    if (!walletAddress || !planId) {
      return NextResponse.json(
        { error: "Missing required fields: walletAddress, planId" },
        { status: 400 },
      );
    }

    await adminGrantSubscription({
      walletAddress,
      planId,
      reason: reason ?? "Manual admin grant",
      durationDays: durationDays ?? 30,
    });

    return NextResponse.json({
      success: true,
      message: `Granted ${planId} to ${walletAddress} for ${durationDays ?? 30} days`,
    });
  } catch (err) {
    console.error("[Admin] Error granting subscription:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/admin/subscription?address=5...
 * Returns current entitlement for a wallet.
 */
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const address = request.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Missing address param" }, { status: 400 });
  }

  try {
    const entitlement = await getEntitlement(address);
    return NextResponse.json({
      address,
      entitlement: entitlement ?? { tier: "basic", plan_id: null, status: "none" },
    });
  } catch (err) {
    console.error("[Admin] Error checking entitlement:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
