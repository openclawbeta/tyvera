/**
 * app/api/cron/subscription-notices/route.ts
 *
 * Vercel Cron — daily subscription lifecycle notifier.
 *
 * Runs once per day. For each wallet-owned subscription:
 *   - at 7 / 3 / 1 days before expiry → emit `subscription_expiring` alert
 *   - on transition to grace period → emit `subscription_grace` alert
 *   - on transition to expired → emit `subscription_expired` alert
 *
 * Also runs `expireSubscriptions()` first so state transitions happen in the
 * same job — ensures grace/expired alerts are sent on the day they change.
 *
 * Auth: Bearer CRON_SECRET header.
 */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { expireSubscriptions } from "@/lib/db/subscriptions";
import { sendSubscriptionNotices } from "@/lib/alerts/subscription-notices";
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
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (!verifyCronAuth(authHeader, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const started = Date.now();

  try {
    // Step 1 — roll state forward (active → grace → expired).
    const transitioned = await expireSubscriptions();

    // Step 2 — send notices based on new state.
    const result = await sendSubscriptionNotices();

    await logCronRun({
      jobName: "subscription-notices",
      startedAt,
      durationMs: Date.now() - started,
      status: "ok",
      result: {
        transitioned,
        ...result,
      } as unknown as Record<string, unknown>,
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      transitioned,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron:subscription-notices] error:", err);

    await logCronRun({
      jobName: "subscription-notices",
      startedAt,
      durationMs: Date.now() - started,
      status: "error",
      errorMessage: message,
    }).catch(() => {});

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
