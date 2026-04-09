/* ─────────────────────────────────────────────────────────────────── */
/* /api/activity — Wallet transaction history from chain events        */
/*                                                                     */
/* GET /api/activity?address=5...&page=1&limit=50                     */
/* Returns on-chain events for the given SS58 address.                */
/*                                                                     */
/* Data source: ON-CHAIN ONLY via transfer-scanner event buffer.       */
/* No external API dependencies (no TaoStats).                         */
/*                                                                     */
/* Limitations:                                                        */
/*   - History depth depends on how long the cron has been running    */
/*   - Buffer holds up to 2000 events (rolling window)                */
/*   - Returns empty gracefully when buffer is cold                    */
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
        ...(bufferSize === 0
          ? { note: "Event buffer is empty — chain scanner has not run yet. History builds over time via cron." }
          : { note: `${bufferSize} events in buffer, last scanned block ${lastBlock}` }),
      },
    );
  } catch (err) {
    console.error("[Activity] Failed:", err);
    return apiResponse(
      { events: [] as ActivityEvent[], total: 0, page, limit },
      {
        source: DATA_SOURCES.CHAIN_CACHE,
        fetchedAt: new Date().toISOString(),
        note: "Error reading event buffer — returning empty",
      },
    );
  }
}
