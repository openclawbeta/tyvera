import { NextRequest, NextResponse } from "next/server";
import { runVerificationCycle } from "@/lib/db/payment-verifier";
import { safeSecretEqual } from "@/lib/api/secret-compare";

/* ─────────────────────────────────────────────────────────────────── */
/* Payment verification endpoint                                       */
/*                                                                     */
/* GET /api/verify-payments                                            */
/*                                                                     */
/* Triggers a verification cycle: checks for incoming TAO transfers,   */
/* matches against pending payment intents, and activates subs.        */
/*                                                                     */
/* Call this via:                                                       */
/*   - Vercel Cron (vercel.json: { "crons": [{ "path": ... }] })      */
/*   - External cron service (every 60s)                               */
/*   - Manual trigger during development                               */
/*                                                                     */
/* ─────────────────────────────────────────────────────────────────── */

const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error(
    "[VerifyPayments] CRON_SECRET env var is not set — endpoint will reject all requests.",
  );
}

export async function GET(request: NextRequest) {
  /* Fail-closed: reject all requests when CRON_SECRET is not configured */
  if (!CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (!safeSecretEqual(authHeader, "Bearer " + CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runVerificationCycle();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[VerifyPayments] Error:", err);
    return NextResponse.json(
      { error: "Verification cycle failed" },
      { status: 500 },
    );
  }
}
