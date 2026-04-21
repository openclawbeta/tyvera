/**
 * app/api/cron/sync-chain/route.ts
 *
 * Vercel Cron Job — comprehensive chain-only data ingestion.
 *
 * Runs every 5 minutes and performs ALL data collection from the
 * Bittensor Subtensor chain. No external API dependencies.
 *
 * Pipeline:
 *   1. Subnet data from Subtensor (fetchSubnetsFromChain)
 *   2. Price sync from pool ratios (syncPricesFromChain)
 *   3. Market cache refresh from chain pool data (refreshMarketCache)
 *   4. Transfer/event scanning (scanRecentTransfers)
 *
 * Authentication:
 *   Requires CRON_SECRET in the Authorization header to prevent
 *   unauthorized triggers. Vercel Cron automatically sends this.
 *
 * Cron schedule: every 5 minutes (configured in vercel.json)
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchSubnetsFromChain, setSubnetCache } from "@/lib/chain";
import { refreshMarketCache } from "@/lib/chain/market-cache";
import { syncPricesFromChain } from "@/lib/chain/price-engine";
import { scanRecentTransfers } from "@/lib/chain/transfer-scanner";
import { logCronRun, pruneCronRuns } from "@/lib/db/cron-log";
import { runCronHealthCheck } from "@/lib/cron/health-check";
import { timingSafeEqual } from "crypto";

export const maxDuration = 60; // Vercel Pro allows up to 60s
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
  // ── Auth check ──────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("Authorization");
  if (!verifyCronAuth(authHeader, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Comprehensive chain sync ───────────────────────────────────
  const cronStart = Date.now();
  const startedAt = new Date().toISOString();
  const results: Record<string, unknown> = {
    ok: true,
    timestamp: startedAt,
  };

  try {
    // Step 1: Subnet data from Subtensor
    const snapshot = await fetchSubnetsFromChain();

    if (!snapshot || snapshot.subnets.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Chain sync returned no subnet data",
          timestamp: new Date().toISOString(),
        },
        { status: 502 },
      );
    }

    setSubnetCache(snapshot);
    results.subnets = snapshot.subnets.length;
    results.blockHeight = snapshot.blockHeight;
    results.syncDurationMs = snapshot.syncDurationMs;
    results.fetchedAt = snapshot.fetchedAt;

    // Step 2: Price sync from chain pool ratios (best-effort)
    try {
      const priceResult = await syncPricesFromChain();
      results.priceSync = priceResult
        ? { alphaTokens: priceResult.alphaTokens.length, taoUsd: priceResult.taoUsd }
        : false;
    } catch (err) {
      console.warn("[cron/sync-chain] Price sync failed:", err);
      results.priceSync = false;
    }

    // Step 3: Market cache refresh from chain pool data (best-effort)
    try {
      const marketOk = await refreshMarketCache(
        snapshot.subnets.map((s) => ({
          netuid: s.netuid,
          tao_in: s.taoIn,
          alpha_in: 0, // Will be derived from pool ratios
          liquidity: s.taoIn,
        })),
      );
      results.marketEnriched = marketOk;
    } catch (err) {
      console.warn("[cron/sync-chain] Market cache refresh failed:", err);
      results.marketEnriched = false;
    }

    // Step 4: Transfer/event scanning (best-effort)
    try {
      const transferResult = await scanRecentTransfers();
      results.transferScan = transferResult
        ? {
            scannedBlocks: transferResult.scannedBlocks,
            eventsFound: transferResult.events.length,
            fromBlock: transferResult.fromBlock,
            toBlock: transferResult.toBlock,
          }
        : false;
    } catch (err) {
      console.warn("[cron/sync-chain] Transfer scan failed:", err);
      results.transferScan = false;
    }

    // Log success + periodic prune
    await logCronRun({
      jobName: "sync-chain",
      startedAt,
      durationMs: Date.now() - cronStart,
      status: "ok",
      result: results as Record<string, unknown>,
    });
    pruneCronRuns().catch(() => {}); // best-effort cleanup

    // Best-effort: check sibling cron health and alert if issues
    runCronHealthCheck().catch(() => {});

    return NextResponse.json(results);
  } catch (err) {
    console.error("[cron/sync-chain] Fatal error:", err);

    await logCronRun({
      jobName: "sync-chain",
      startedAt,
      durationMs: Date.now() - cronStart,
      status: "error",
      errorMessage: String(err),
    }).catch(() => {});

    return NextResponse.json(
      {
        ok: false,
        error: String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
