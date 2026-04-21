/* ─────────────────────────────────────────────────────────────────── */
/* /api/activity — Wallet transaction history from chain events        */
/*                                                                     */
/* GET /api/activity?address=5...&page=1&limit=50                      */
/* Returns on-chain events for the given SS58 address.                 */
/*                                                                     */
/* Data source priority:                                               */
/*   1. chain_events DB table  (durable, survives cold starts)         */
/*   2. In-memory event buffer (hot cache, same-instance only)         */
/*                                                                     */
/* Both sources are populated by the transfer-scanner during           */
/* cron/sync-chain. The DB is the primary source; the buffer is        */
/* a fast fallback if the DB read fails.                               */
/* ─────────────────────────────────────────────────────────────────── */

import { NextRequest } from "next/server";
import type { ActivityEvent, ActivityType, ActivityStatus } from "@/lib/types/activity";
import {
  DATA_SOURCES,
  apiResponse,
  apiErrorResponse,
} from "@/lib/data-source-policy";
import {
  getEventsForAddress,
  getEventBufferSize,
  getLastScannedBlock,
  type ChainEvent,
} from "@/lib/chain/transfer-scanner";
import { queryChainEvents } from "@/lib/db/chain-events";
import { verifyWalletAuth } from "@/lib/api/wallet-auth";
import { resolveWalletTier, getHistoryCutoffDays } from "@/lib/api/require-entitlement";

function mapChainEvent(e: ChainEvent): ActivityEvent {
  return {
    id: e.id,
    blockNumber: e.blockNumber,
    timestamp: e.timestamp,
    type: e.type as ActivityType,
    fromAddress: e.fromAddress,
    toAddress: e.toAddress,
    amountTao: e.amountTao,
    fee: e.fee,
    subnet: e.subnet,
    txHash: e.txHash,
    status: e.status as ActivityStatus,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const address = searchParams.get("address");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

  if (!address || address.length < 46) {
    return apiErrorResponse("Valid SS58 address required", 400);
  }

  // ── Entitlement: enforce history cutoff by tier ─────────────────
  const auth = await verifyWalletAuth(request);
  const walletAddress = auth.verified ? auth.address! : null;
  const tier = walletAddress ? await resolveWalletTier(walletAddress) : "explorer";
  const cutoffDays = getHistoryCutoffDays(tier);

  if (cutoffDays === 0) {
    // No history access — return empty with upgrade prompt
    return apiResponse(
      { events: [] as ActivityEvent[], total: 0, page, limit },
      {
        source: DATA_SOURCES.CHAIN_LIVE,
        fetchedAt: new Date().toISOString(),
        note: "Activity history requires Analyst tier or above. Upgrade to view transaction history.",
      },
    );
  }

  // Build a date cutoff string for SQL filtering (null = all time)
  const cutoffDate = cutoffDays > 0
    ? new Date(Date.now() - cutoffDays * 86_400_000).toISOString()
    : null;

  // ── Strategy 1: Read from DB (durable, survives cold starts) ────
  try {
    const { events: dbEvents, total } = await queryChainEvents(address, page, limit, cutoffDate);

    if (total > 0) {
      const events: ActivityEvent[] = dbEvents.map(mapChainEvent);
      const lastBlock = getLastScannedBlock();

      return apiResponse(
        { events, total, page, limit },
        {
          source: DATA_SOURCES.CHAIN_LIVE,
          fetchedAt: new Date().toISOString(),
          blockHeight: lastBlock > 0 ? lastBlock : undefined,
          note: `${total} events from DB, last scanned block ${lastBlock}`,
        },
      );
    }
  } catch (err) {
    console.warn("[Activity] DB query failed, falling back to buffer:", err);
  }

  // ── Strategy 2: Fall back to in-memory buffer ───────────────────
  try {
    const { events: chainEvents, total } = getEventsForAddress(address, page, limit);
    const events: ActivityEvent[] = chainEvents.map(mapChainEvent);
    const bufferSize = getEventBufferSize();
    const lastBlock = getLastScannedBlock();

    return apiResponse(
      { events, total, page, limit },
      {
        source: bufferSize > 0 ? DATA_SOURCES.CHAIN_CACHE : DATA_SOURCES.SYNTHETIC,
        fetchedAt: new Date().toISOString(),
        blockHeight: lastBlock > 0 ? lastBlock : undefined,
        fallbackUsed: true,
        ...(bufferSize === 0
          ? { note: "Event buffer is empty — chain scanner has not run yet. History builds over time via cron." }
          : { note: `${bufferSize} events in buffer (DB fallback), last scanned block ${lastBlock}` }),
      },
    );
  } catch (err) {
    console.error("[Activity] Both DB and buffer failed:", err);
    return apiResponse(
      { events: [] as ActivityEvent[], total: 0, page, limit },
      {
        source: DATA_SOURCES.CHAIN_CACHE,
        fetchedAt: new Date().toISOString(),
        fallbackUsed: true,
        note: "Error reading activity data — returning empty",
      },
    );
  }
}
