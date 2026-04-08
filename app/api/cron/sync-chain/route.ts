/**
 * app/api/cron/sync-chain/route.ts
 *
 * Vercel Cron Job — syncs subnet data from Subtensor every 5 minutes.
 *
 * This is Tyvera's primary data source. It connects directly to the
 * Bittensor blockchain, pulls all subnet metrics, and stores them
 * in an in-memory cache that the /api/subnets and /api/metagraph
 * routes read from.
 *
 * Authentication:
 *   Requires CRON_SECRET in the Authorization header to prevent
 *   unauthorized triggers. Vercel Cron automatically sends this.
 *
 * Cron schedule: every 5 minutes (configured in vercel.json)
 *
 * Fallback: If chain sync fails, the API routes fall through to
 * TaoStats → static snapshot (no user impact).
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchSubnetsFromChain, setSubnetCache } from "@/lib/chain";
import { refreshMarketCache } from "@/lib/chain/market-cache";
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
  if (cronSecret) {
    const authHeader = request.headers.get("Authorization");
    if (!verifyCronAuth(authHeader, cronSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── Sync ────────────────────────────────────────────────────────
  try {
    const snapshot = await fetchSubnetsFromChain();

    if (!snapshot || snapshot.subnets.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Chain sync returned no data",
          timestamp: new Date().toISOString(),
        },
        { status: 502 },
      );
    }

    // Store in cache for other routes to read
    setSubnetCache(snapshot);

    // Best-effort: enrich with TaoStats market data (non-blocking)
    const marketOk = await refreshMarketCache().catch(() => false);

    return NextResponse.json({
      ok: true,
      subnets: snapshot.subnets.length,
      blockHeight: snapshot.blockHeight,
      syncDurationMs: snapshot.syncDurationMs,
      fetchedAt: snapshot.fetchedAt,
      marketEnriched: marketOk,
    });
  } catch (err) {
    console.error("[cron/sync-chain] Fatal error:", err);
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
