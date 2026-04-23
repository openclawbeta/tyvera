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
import {
  getActiveSnapshotWallets,
  hasSnapshotForToday,
  recordPortfolioSnapshot,
} from "@/lib/db/portfolio-snapshots";
import { fetchWalletStakes } from "@/lib/chain/wallet-stakes";
import { getLatestTaoPrice } from "@/lib/chain/price-engine";
import { safeSecretEqual } from "@/lib/api/secret-compare";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // chain RPC per wallet can take a moment

// Hard cap on how many wallets we refresh per run. At 100 wallets with a
// ~400ms RPC round-trip each, serialized execution stays well under the
// Vercel 60s cap. If the user base grows past this, split the cron or
// parallelize with a concurrency limit.
const MAX_BACKFILL_WALLETS = 100;

function verifyCronAuth(authHeader: string | null, secret: string): boolean {
  return safeSecretEqual(authHeader, "Bearer " + secret);
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

    // Backfill today's portfolio snapshot for every wallet that has been
    // seen recently. Prevents the history chart from developing gaps on
    // days when the user doesn't visit the app, and lets the chart start
    // filling in automatically after the first verified visit.
    let snapshotsWritten = 0;
    let snapshotsSkipped = 0;
    let snapshotsFailed = 0;
    try {
      const activeWallets = await getActiveSnapshotWallets(30);
      const toProcess = activeWallets.slice(0, MAX_BACKFILL_WALLETS);
      const taoPoint = getLatestTaoPrice();
      const taoUsd = taoPoint?.taoUsd ?? 0;

      for (const addr of toProcess) {
        try {
          if (await hasSnapshotForToday(addr)) {
            snapshotsSkipped++;
            continue;
          }
          const stakes = await fetchWalletStakes(addr);
          await recordPortfolioSnapshot({
            walletAddress: addr,
            totalStakedTao: stakes.stats.totalStakedTao,
            totalValueUsd: stakes.stats.totalValueUsd,
            weightedYield: stakes.stats.weightedYield,
            positionCount: stakes.stats.positionCount,
            taoPriceUsd: taoUsd,
          });
          snapshotsWritten++;
        } catch {
          snapshotsFailed++;
        }
      }
    } catch (err) {
      console.warn("[cron/reset-counters] snapshot backfill failed:", err);
    }

    await logCronRun({
      jobName: "reset-counters",
      startedAt,
      durationMs: Date.now() - cronStart,
      status: "ok",
      result: {
        message: "Daily API key counters reset, stale usage + delivery rows pruned, portfolio snapshots backfilled",
        deliveriesPruned,
        snapshotsWritten,
        snapshotsSkipped,
        snapshotsFailed,
      },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      message: "Daily API key counters reset",
      deliveriesPruned,
      snapshotsWritten,
      snapshotsSkipped,
      snapshotsFailed,
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
