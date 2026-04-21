/**
 * app/api/cron/evaluate-alerts/route.ts
 *
 * Vercel Cron Job — alert rule evaluator.
 *
 * Runs every 10 minutes. For each wallet with enabled alert rules, diffs
 * the current chain snapshot against the previous tick and emits alerts
 * where thresholds are crossed. Fires email/Telegram notifications for
 * users who have configured delivery channels.
 *
 * Sibling to /api/cron/sync-chain — relies on the subnet cache set by
 * that job. Safe to invoke more often than sync-chain; will no-op until
 * fresh chain data is available.
 *
 * Auth: requires CRON_SECRET in the Authorization header.
 */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runAlertEvaluation } from "@/lib/alerts/evaluator";
import { logCronRun } from "@/lib/db/cron-log";

export const maxDuration = 60;
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

  const startedAt = new Date().toISOString();
  const started = Date.now();

  try {
    const result = await runAlertEvaluation();

    await logCronRun({
      jobName: "evaluate-alerts",
      startedAt,
      durationMs: Date.now() - started,
      status: "ok",
      result: result as unknown as Record<string, unknown>,
    }).catch(() => {});

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/evaluate-alerts] Fatal error:", err);

    await logCronRun({
      jobName: "evaluate-alerts",
      startedAt,
      durationMs: Date.now() - started,
      status: "error",
      errorMessage: String(err),
    }).catch(() => {});

    return NextResponse.json(
      { ok: false, error: String(err), timestamp: new Date().toISOString() },
      { status: 500 },
    );
  }
}
