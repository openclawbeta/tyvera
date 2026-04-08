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
    await resetDailyCounters();

    return NextResponse.json({
      ok: true,
      message: "Daily API key counters reset",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/reset-counters] Error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
