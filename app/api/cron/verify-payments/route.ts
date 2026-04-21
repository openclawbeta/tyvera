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
import { logCronRun } from "@/lib/db/cron-log";
import { timingSafeEqual } from "crypto";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

function verifyCronAuth(authHeader: string | null, secret: string): boolean {
  const expected = "Bearer " + secret;
  if (!authHeader || authHeader.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("Authorization");
  if (!verifyCronAuth(authHeader, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronStart = Date.now();
  const startedAt = new Date().toISOString();

  try {
    const result = await runVerificationCycle();

    await logCronRun({
      jobName: "verify-payments",
      startedAt,
      durationMs: Date.now() - cronStart,
      status: "ok",
      result: result as unknown as Record<string, unknown>,
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/verify-payments] Error:", err);

    await logCronRun({
      jobName: "verify-payments",
      startedAt,
      durationMs: Date.now() - cronStart,
      status: "error",
      errorMessage: String(err),
    }).catch(() => {});

    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
