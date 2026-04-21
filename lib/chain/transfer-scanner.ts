/**
 * lib/chain/transfer-scanner.ts
 *
 * Direct Subtensor chain queries for transfer/extrinsic history.
 * Replaces TaoStats /api/v1/extrinsic and /api/v1/transfers endpoints.
 *
 * Strategy:
 *   - Uses Substrate system.events storage to scan for balances.Transfer
 *     and subtensorModule extrinsics (add_stake, remove_stake, etc.)
 *   - Scans recent blocks backwards from chain head
 *   - Results cached in-memory with rolling window
 *
 * Limitations:
 *   - Can only scan ~100 blocks per call (Subtensor block time ~12s)
 *   - Historical depth limited to ~20 minutes per scan
 *   - For deeper history, multiple cron scans build up the buffer
 */

import { ApiPromise, WsProvider } from "@polkadot/api";
import { persistChainEvents, getLastPersistedBlock } from "@/lib/db/chain-events";

/* ─────────────────────────────────────────────────────────────────── */
/* Constants                                                            */
/* ─────────────────────────────────────────────────────────────────── */

const RAO_PER_TAO = 1_000_000_000;

const SUBTENSOR_ENDPOINTS = [
  "wss://entrypoint-finney.opentensor.ai:443",
  "wss://subtensor.api.opentensor.ai:443",
];

const CONNECT_TIMEOUT_MS = 15_000;
const SCAN_TIMEOUT_MS = 45_000;

/** Max blocks to scan per invocation (keep under serverless timeout) */
const MAX_BLOCKS_PER_SCAN = 50;

/** Max events to keep in rolling buffer */
const MAX_EVENTS_BUFFER = 2000;

/* ─────────────────────────────────────────────────────────────────── */
/* Types                                                                */
/* ─────────────────────────────────────────────────────────────────── */

export type ActivityType =
  | "TRANSFER"
  | "STAKE"
  | "UNSTAKE"
  | "MOVE_STAKE"
  | "REGISTER"
  | "SET_WEIGHTS"
  | "CLAIM";

export type ActivityStatus = "CONFIRMED" | "FAILED" | "PENDING";

export interface ChainEvent {
  id: string;
  blockNumber: number;
  timestamp: string;
  type: ActivityType;
  fromAddress: string;
  toAddress: string;
  amountTao: number;
  fee: number;
  subnet?: string;
  memo?: string;
  txHash: string;
  status: ActivityStatus;
}

export interface TransferScanResult {
  events: ChainEvent[];
  scannedBlocks: number;
  fromBlock: number;
  toBlock: number;
  scanDurationMs: number;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Rolling event buffer (in-memory)                                     */
/* ─────────────────────────────────────────────────────────────────── */

const eventBuffer: ChainEvent[] = [];
let lastScannedBlock = 0;
let _dbSeeded = false;

/** Get events for a specific address from the buffer. */
export function getEventsForAddress(
  address: string,
  page = 1,
  limit = 50,
): { events: ChainEvent[]; total: number } {
  const filtered = eventBuffer.filter(
    (e) => e.fromAddress === address || e.toAddress === address,
  );
  // Sort newest first
  filtered.sort((a, b) => b.blockNumber - a.blockNumber);
  const offset = (page - 1) * limit;
  return {
    events: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
}

/** Get events matching a memo pattern (for payment verification). */
export function getEventsWithMemo(
  toAddress: string,
  memoPrefix: string,
): ChainEvent[] {
  // Filter transfers to the given address. If a system.remark was paired
  // in the same block from the same signer, the memo field is populated.
  return eventBuffer
    .filter(
      (e) =>
        e.toAddress === toAddress &&
        e.type === "TRANSFER" &&
        (!memoPrefix || (e.memo && e.memo.startsWith(memoPrefix))),
    )
    .sort((a, b) => b.blockNumber - a.blockNumber);
}

/** Get the last scanned block number. */
export function getLastScannedBlock(): number {
  return lastScannedBlock;
}

/** Get total buffered events count. */
export function getEventBufferSize(): number {
  return eventBuffer.length;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Helpers                                                              */
/* ─────────────────────────────────────────────────────────────────── */

function toNumber(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  const str = String(raw).replace(/,/g, "");
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

function classifyExtrinsic(section: string, method: string): ActivityType {
  const s = section.toLowerCase();
  const m = method.toLowerCase();

  if (s === "balances" && (m === "transfer" || m === "transfer_keep_alive" || m === "transferkeepalive" || m === "transfer_allow_death" || m === "transferallowdeath"))
    return "TRANSFER";
  if (s === "subtensormodule" && (m === "add_stake" || m === "addstake")) return "STAKE";
  if (s === "subtensormodule" && (m === "remove_stake" || m === "removestake")) return "UNSTAKE";
  if (s === "subtensormodule" && (m === "move_stake" || m === "movestake")) return "MOVE_STAKE";
  if (s === "subtensormodule" && (m === "burned_register" || m === "burnedregister" || m === "register")) return "REGISTER";
  if (s === "subtensormodule" && (m === "set_weights" || m === "setweights")) return "SET_WEIGHTS";
  if (s === "subtensormodule" && (m === "claim" || m === "schedule_coldkey_swap" || m === "schedulecoldkeyswap")) return "CLAIM";
  return "TRANSFER";
}

/* ─────────────────────────────────────────────────────────────────── */
/* Chain scanner                                                        */
/* ─────────────────────────────────────────────────────────────────── */

async function connect(): Promise<ApiPromise> {
  const provider = new WsProvider(SUBTENSOR_ENDPOINTS, 2500);
  return withTimeout(
    ApiPromise.create({ provider, noInitWarn: true }),
    CONNECT_TIMEOUT_MS,
    "Transfer scanner connection",
  );
}

/**
 * Scan recent blocks for transfer and staking events.
 *
 * Reads system.events from each block and extracts:
 *   - balances.Transfer events
 *   - subtensorModule extrinsics (stake, unstake, register, etc.)
 *
 * Appends new events to the rolling buffer.
 */
export async function scanRecentTransfers(): Promise<TransferScanResult | null> {
  const start = Date.now();
  let api: ApiPromise | null = null;

  try {
    // On first scan after cold start, seed lastScannedBlock from DB
    // so we don't re-scan blocks that are already persisted.
    if (!_dbSeeded) {
      try {
        const dbBlock = await getLastPersistedBlock();
        if (dbBlock > lastScannedBlock) {
          lastScannedBlock = dbBlock;
          console.log(`[transfer-scanner] Seeded lastScannedBlock=${dbBlock} from DB`);
        }
      } catch (err) {
        console.warn("[transfer-scanner] DB seed failed, starting from chain head:", err);
      }
      _dbSeeded = true;
    }

    api = await connect();

    const header = await api.rpc.chain.getHeader();
    const headBlock = toNumber(header.number);

    // Start from where we left off (or head - MAX_BLOCKS_PER_SCAN)
    const fromBlock = lastScannedBlock > 0
      ? Math.min(lastScannedBlock + 1, headBlock - 1)
      : Math.max(1, headBlock - MAX_BLOCKS_PER_SCAN);

    const toBlock = Math.min(fromBlock + MAX_BLOCKS_PER_SCAN - 1, headBlock);
    const newEvents: ChainEvent[] = [];

    for (let blockNum = fromBlock; blockNum <= toBlock; blockNum++) {
      try {
        const blockHash = await api.rpc.chain.getBlockHash(blockNum);
        const [signedBlock, events] = await Promise.all([
          api.rpc.chain.getBlock(blockHash),
          api.query.system.events.at(blockHash),
        ]);

        // Estimate timestamp: ~12s per block from head
        const blockAge = (headBlock - blockNum) * 12;
        const blockTimestamp = new Date(Date.now() - blockAge * 1000).toISOString();

        const extrinsics = signedBlock.block.extrinsics;

        // Process events linked to extrinsics
        const eventArray = events as unknown as Array<{
          phase: { isApplyExtrinsic: boolean; asApplyExtrinsic: { toNumber(): number } };
          event: {
            section: string;
            method: string;
            data: unknown[];
          };
        }>;

        // Collect system.remark extrinsics keyed by signer for memo pairing.
        // A payer can include a system.remark("TYV-XXXXXXXX") in the same
        // block as their balances.Transfer to enable memo-based matching.
        const remarksBySigner = new Map<string, string>();
        for (let extIdx = 0; extIdx < extrinsics.length; extIdx++) {
          const ext = extrinsics[extIdx];
          const extSection = String(ext?.method?.section ?? "").toLowerCase();
          const extMethod = String(ext?.method?.method ?? "").toLowerCase();
          if (extSection === "system" && (extMethod === "remark" || extMethod === "remark_with_event" || extMethod === "remarkwithevent")) {
            try {
              const signer = ext?.signer?.toString() ?? "";
              const args = (ext?.method?.args ?? []) as unknown[];
              const raw = args[0];
              // Remark data may be hex-encoded bytes or a string
              let text = "";
              if (typeof raw === "string") {
                text = raw;
              } else if (raw && typeof (raw as any).toUtf8 === "function") {
                text = (raw as any).toUtf8();
              } else if (raw && typeof (raw as any).toString === "function") {
                const hex = (raw as any).toString();
                if (hex.startsWith("0x")) {
                  try {
                    text = Buffer.from(hex.slice(2), "hex").toString("utf8");
                  } catch { text = hex; }
                } else {
                  text = hex;
                }
              }
              if (signer && text.startsWith("TYV-")) {
                remarksBySigner.set(signer, text.trim());
              }
            } catch { /* skip malformed remark */ }
          }
        }

        for (const record of eventArray) {
          const { event, phase } = record;

          // We only care about events from extrinsics (not inherents)
          if (!phase.isApplyExtrinsic) continue;

          const section = event.section;
          const method = event.method;

          // balances.Transfer: [from, to, amount]
          if (section === "balances" && method === "Transfer") {
            const [from, to, amount] = event.data;
            let amountTao = toNumber(amount);
            if (amountTao > 1e6) amountTao /= RAO_PER_TAO;

            const fromStr = String(from);
            // Pair with system.remark from same signer in this block
            const memo = remarksBySigner.get(fromStr);

            newEvents.push({
              id: `${blockNum}-${phase.asApplyExtrinsic.toNumber()}`,
              blockNumber: blockNum,
              timestamp: blockTimestamp,
              type: "TRANSFER",
              fromAddress: fromStr,
              toAddress: String(to),
              amountTao: +amountTao.toFixed(4),
              fee: 0,
              memo,
              txHash: `0x${blockHash.toHex().slice(2)}`,
              status: "CONFIRMED",
            });
          }

          // subtensorModule events (stake operations, etc.)
          if (section === "subtensorModule") {
            const extrinsicIndex = phase.asApplyExtrinsic.toNumber();
            const ext = extrinsics[extrinsicIndex];
            const extSection = ext?.method?.section ?? "";
            const extMethod = ext?.method?.method ?? "";
            const activityType = classifyExtrinsic(extSection, extMethod);

            // Extract addresses and amounts from the extrinsic args
            const args = (ext?.method?.args ?? []) as unknown[];
            let fromAddr = "";
            let toAddr = "";
            let amountTao = 0;

            try {
              // Signer is the from address
              fromAddr = ext?.signer?.toString() ?? "";
            } catch { /* no signer */ }

            // Try to extract amount from common arg positions
            for (const arg of args) {
              const n = toNumber(arg);
              if (n > 0 && amountTao === 0) {
                amountTao = n > 1e6 ? n / RAO_PER_TAO : n;
              }
            }

            if (activityType !== "TRANSFER") {
              newEvents.push({
                id: `${blockNum}-${extrinsicIndex}`,
                blockNumber: blockNum,
                timestamp: blockTimestamp,
                type: activityType,
                fromAddress: fromAddr,
                toAddress: toAddr,
                amountTao: +amountTao.toFixed(4),
                fee: 0,
                subnet: args.length > 0 ? `SN${toNumber(args[0])}` : undefined,
                txHash: `0x${blockHash.toHex().slice(2)}`,
                status: "CONFIRMED",
              });
            }
          }
        }
      } catch (err) {
        // Skip individual block errors
        console.warn(`[transfer-scanner] Block ${blockNum} scan error:`, err);
        continue;
      }
    }

    // Append to buffer and trim
    eventBuffer.push(...newEvents);
    if (eventBuffer.length > MAX_EVENTS_BUFFER) {
      eventBuffer.splice(0, eventBuffer.length - MAX_EVENTS_BUFFER);
    }

    lastScannedBlock = toBlock;

    // Persist to DB (best-effort — buffer is the hot path, DB is durable)
    let persisted = 0;
    if (newEvents.length > 0) {
      try {
        persisted = await persistChainEvents(newEvents);
      } catch (err) {
        console.warn("[transfer-scanner] DB persist failed (events still in buffer):", err);
      }
    }

    const result: TransferScanResult = {
      events: newEvents,
      scannedBlocks: toBlock - fromBlock + 1,
      fromBlock,
      toBlock,
      scanDurationMs: Date.now() - start,
    };

    console.log(
      `[transfer-scanner] Scanned blocks ${fromBlock}–${toBlock}, ` +
      `found ${newEvents.length} events (${persisted} persisted), buffer size ${eventBuffer.length}, ` +
      `took ${result.scanDurationMs}ms`,
    );

    return result;
  } catch (err) {
    console.error("[transfer-scanner] Scan failed:", err);
    return null;
  } finally {
    if (api) {
      try { await api.disconnect(); } catch { /* ignore */ }
    }
  }
}

/**
 * Fetch recent transfers to a specific address.
 * Uses the event buffer — no external API calls.
 */
export function getTransfersToAddress(
  address: string,
  limit = 20,
): ChainEvent[] {
  return eventBuffer
    .filter((e) => e.toAddress === address && e.type === "TRANSFER")
    .sort((a, b) => b.blockNumber - a.blockNumber)
    .slice(0, limit);
}
