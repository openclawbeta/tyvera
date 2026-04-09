/* ─────────────────────────────────────────────────────────────────── */
/* /api/activity — Real wallet transaction history from TaoStats       */
/*                                                                     */
/* GET /api/activity?address=5...&page=1&limit=50                     */
/* Returns on-chain extrinsics for the given SS58 address.            */
/*                                                                     */
/* Data source: TaoStats only (T1). No fallback — returns empty       */
/* gracefully when unavailable.                                        */
/* ─────────────────────────────────────────────────────────────────── */

import { NextRequest } from "next/server";
import type { ActivityEvent, ActivityType, ActivityStatus } from "@/lib/types/activity";
import {
  DATA_SOURCES,
  apiResponse,
  apiErrorResponse,
} from "@/lib/data-source-policy";

const TAOSTATS_API = "https://api.taostats.io/api/v1";

function classifyExtrinsic(module: string, call: string): ActivityType {
  const m = module.toLowerCase();
  const c = call.toLowerCase();

  if (m === "balances" && (c === "transfer" || c === "transfer_keep_alive" || c === "transfer_allow_death"))
    return "TRANSFER";
  if (m === "subtensormodule" && c === "add_stake") return "STAKE";
  if (m === "subtensormodule" && c === "remove_stake") return "UNSTAKE";
  if (m === "subtensormodule" && c === "move_stake") return "MOVE_STAKE";
  if (m === "subtensormodule" && (c === "burned_register" || c === "register")) return "REGISTER";
  if (m === "subtensormodule" && c === "set_weights") return "SET_WEIGHTS";
  if (m === "subtensormodule" && (c === "claim" || c === "schedule_coldkey_swap")) return "CLAIM";
  return "TRANSFER";
}

function mapStatus(success: unknown): ActivityStatus {
  if (success === true || success === "true" || success === 1) return "CONFIRMED";
  if (success === false || success === "false" || success === 0) return "FAILED";
  return "PENDING";
}

function parseExtrinsic(ext: Record<string, unknown>): ActivityEvent {
  const module = String(ext.module ?? ext.call_module ?? "");
  const call = String(ext.call ?? ext.call_function ?? "");
  const type = classifyExtrinsic(module, call);

  const rawAmount = Number(ext.amount ?? ext.value ?? 0);
  const amountTao = rawAmount > 1e6 ? rawAmount / 1e9 : rawAmount;
  const fee = Number(ext.fee ?? 0) / 1e9;
  const blockNumber = Number(ext.block_num ?? ext.block_number ?? 0);
  const timestamp = String(ext.block_timestamp ?? ext.timestamp ?? new Date().toISOString());

  return {
    id: String(ext.extrinsic_hash ?? ext.hash ?? `${blockNumber}-${Math.random().toString(36).slice(2, 8)}`),
    blockNumber,
    timestamp,
    type,
    fromAddress: String(ext.account ?? ext.from ?? ""),
    toAddress: String(ext.dest ?? ext.to ?? ""),
    amountTao,
    fee,
    subnet: ext.netuid != null ? `SN${ext.netuid}` : undefined,
    txHash: String(ext.extrinsic_hash ?? ext.hash ?? ""),
    status: mapStatus(ext.success),
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
    const offset = (page - 1) * limit;
    const url = `${TAOSTATS_API}/extrinsic?address=${address}&limit=${limit}&offset=${offset}`;

    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 30 },
    });

    if (!resp.ok) {
      console.warn(`[Activity] TaoStats returned ${resp.status}`);
      return apiResponse(
        { events: [] as ActivityEvent[], total: 0, page, limit },
        {
          source: DATA_SOURCES.TAOSTATS_LIVE,
          fetchedAt: new Date().toISOString(),
          note: `TaoStats returned ${resp.status} — empty result`,
        },
      );
    }

    const data = await resp.json();
    const extrinsics = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    const events: ActivityEvent[] = extrinsics.map(parseExtrinsic);
    const total = typeof data?.total === "number" ? data.total : events.length;

    return apiResponse(
      { events, total, page, limit },
      {
        source: DATA_SOURCES.TAOSTATS_LIVE,
        fetchedAt: new Date().toISOString(),
      },
    );
  } catch (err) {
    console.error("[Activity] Failed to fetch:", err);
    return apiResponse(
      { events: [] as ActivityEvent[], total: 0, page, limit },
      {
        source: DATA_SOURCES.TAOSTATS_LIVE,
        fetchedAt: new Date().toISOString(),
        note: "TaoStats unreachable — empty result",
      },
    );
  }
}
