import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { adminGrantSubscription, getEntitlement } from "@/lib/db/subscriptions";
import { logAdminActionFromRequest } from "@/lib/db/admin-audit";
import { parseAdminGrantBody } from "@/lib/api/validation";

/* ─────────────────────────────────────────────────────────────────── */
/* Admin subscription management                                       */
/*                                                                     */
/* POST /api/admin/subscription — grant a subscription manually        */
/* GET  /api/admin/subscription?address=... — check entitlement        */
/*                                                                     */
/* ─────────────────────────────────────────────────────────────────── */

const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!ADMIN_SECRET) {
  console.error(
    "[Admin] ADMIN_SECRET env var is not set — admin endpoints will reject all requests.",
  );
}

/**
 * Constant-time auth check to prevent timing attacks.
 */
function checkAuth(request: NextRequest): boolean {
  if (!ADMIN_SECRET) return false;
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return false;

  const expected = `Bearer ${ADMIN_SECRET}`;
  if (authHeader.length !== expected.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(authHeader, "utf-8"),
      Buffer.from(expected, "utf-8"),
    );
  } catch {
    return false;
  }
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
    const raw = await request.json().catch(() => null);
    const parsed = parseAdminGrantBody(raw);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { walletAddress, planId, reason, durationDays } = parsed.value;

    await adminGrantSubscription({
      walletAddress,
      planId,
      reason: reason ?? "Manual admin grant",
      durationDays: durationDays ?? 30,
    });

    await logAdminActionFromRequest(request, {
      action: "grant_subscription",
      target: walletAddress,
      status: 200,
      metadata: {
        planId,
        durationDays: durationDays ?? 30,
        reason: reason ?? "Manual admin grant",
      },
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
    await logAdminActionFromRequest(request, {
      action: "check_entitlement",
      target: address,
      status: 200,
    });
    return NextResponse.json({
      address,
      entitlement: entitlement ?? { tier: "explorer", plan_id: null, status: "none" },
    });
  } catch (err) {
    console.error("[Admin] Error checking entitlement:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
