import { NextRequest, NextResponse } from "next/server";
import { runVerificationCycle } from "@/lib/db/payment-verifier";

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

export async function GET(request: NextRequest) {
  /* Require CRON_SECRET in production to prevent public triggering */
  if (CRON_SECRET) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
      { error: "Verification cycle failed", message: String(err) },
      { status: 500 },
    );
  }
}
