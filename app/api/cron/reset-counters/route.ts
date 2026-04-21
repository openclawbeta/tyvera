/**
 * app/api/cron/reset-counters/route.ts
 *
 * Vercel Cron Job — resets daily API key request counters at midnight UTC.
 *
 * Without this, rate-limited users would be permanently locked out
 * after hitting their daily cap once. The counter tracks requests_today
 * in the api_keys table.
 *
 * Cron schedule: daily at 00:00 UTC (configured in vercel.json)
 */

import { NextRequest, NextResponse } from "next/server";
import { resetDailyCounters } from "@/lib/db/api-keys";
import { pruneDailyUsage } from "@/lib/db/daily-usage";
import { pruneDeliveryLog } from "@/lib/db/webhooks";
import { logCronRun } from "@/lib/db/cron-log";
import { timingSafeEqual } from "crypto";

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
    await resetDailyCounters();
    await pruneDailyUsage().catch(() => {});
    // Keep the webhook delivery log from growing without bound. Runs daily so
    // the per-webhook keep window (500 most recent rows) is roomy enough for
    // a week+ of traffic against even the noisiest endpoint.
    let deliveriesPruned = 0;
    try {
      deliveriesPruned = await pruneDeliveryLog(500);
    } catch (err) {
      console.warn("[cron/reset-counters] pruneDeliveryLog failed:", err);
    }

    await logCronRun({
      jobName: "reset-counters",
      startedAt,
      durationMs: Date.now() - cronStart,
      status: "ok",
      result: {
        message: "Daily API key counters reset, stale usage + delivery rows pruned",
        deliveriesPruned,
      },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      message: "Daily API key counters reset",
      deliveriesPruned,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/reset-counters] Error:", err);

    await logCronRun({
      jobName: "reset-counters",
      startedAt,
      durationMs: Date.now() - cronStart,
      status: "error",
      errorMessage: String(err),
    }).catch(() => {});

    return NextResponse.json(
      { ok: false, error: "reset_counters_failed" },
      { status: 500 },
    );
  }
}
