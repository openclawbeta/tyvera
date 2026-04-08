/**
 * app/api/cron/verify-payments/route.ts
 *
 * Vercel Cron Job — verifies pending TAO payments every minute.
 *
 * Checks for incoming TAO transfers matching pending payment intents,
 * confirms them, and activates the corresponding subscriptions.
 *
 * Cron schedule: every 1 minute (configured in vercel.json)
 */

import { NextRequest, NextResponse } from "next/server";
import { runVerificationCycle } from "@/lib/db/payment-verifier";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runVerificationCycle();

    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/verify-payments] Error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
