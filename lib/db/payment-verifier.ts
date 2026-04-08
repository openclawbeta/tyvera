/* ─────────────────────────────────────────────────────────────────── */
/* On-chain payment verifier                                           */
/*                                                                     */
/* Polls the Bittensor chain (via Subtensor RPC) for incoming TAO      */
/* transfers to the Tyvera deposit address. When a transfer matches    */
/* a pending PaymentIntent memo, it auto-activates the subscription.   */
/*                                                                     */
/* The verifier runs as a background interval on the server.           */
/* Start it from the /api/verify-payments cron endpoint or on boot.    */
/* ─────────────────────────────────────────────────────────────────── */

import { confirmPaymentIntent, findPaymentIntentByMemo, expireSubscriptions } from "./subscriptions";
import { PAYMENT_VERIFY_INTERVAL_MS } from "@/lib/config";
import { requireEnv } from "@/lib/env";

// Tyvera deposit address — set via DEPOSIT_ADDRESS env var
const DEPOSIT_ADDRESS = requireEnv("DEPOSIT_ADDRESS");

// Subtensor finney RPC endpoint — set via SUBTENSOR_RPC env var
const SUBTENSOR_RPC = process.env.SUBTENSOR_RPC ?? "https://entrypoint-finney.opentensor.ai:443";

/* ── Types ────────────────────────────────────────────────────────── */

interface Transfer {
  from: string;
  to: string;
  amount: number;     // TAO (not rao)
  txHash: string;
  memo: string | null;
  blockNumber: number;
}

/* ── RPC helpers ──────────────────────────────────────────────────── */

/**
 * Fetch recent transfers to the deposit address.
 *
 * NOTE: Bittensor's Subtensor RPC doesn't natively expose a
 * "get transfers" method. In production, this would use:
 *   1. Substrate events subscription (system.events for balances.Transfer)
 *   2. TaoStats API to query recent transfers
 *   3. Subscan API for Bittensor
 *
 * For MVP, we poll TaoStats or use a fallback mock.
 * The structure is wired so swapping to real chain data is a one-line change.
 */
async function fetchRecentTransfers(): Promise<Transfer[]> {
  try {
    // Try TaoStats API first (free tier available)
    const resp = await fetch(
      `https://api.taostats.io/api/v1/transfers?to=${DEPOSIT_ADDRESS}&limit=20`,
      {
        headers: {
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data)) {
        return data.map((tx: Record<string, unknown>) => ({
          from: String(tx.from ?? ""),
          to: String(tx.to ?? ""),
          amount: Number(tx.amount ?? 0) / 1e9, // rao to TAO
          txHash: String(tx.extrinsic_hash ?? tx.hash ?? ""),
          memo: extractMemo(tx),
          blockNumber: Number(tx.block_num ?? 0),
        }));
      }
    }
  } catch {
    // TaoStats unavailable — fall through to mock
  }

  // Fallback: return empty (no transfers detected)
  // In production, wire up Substrate events subscription here
  return [];
}

/**
 * Extract memo from a transfer's remark/data field.
 * Bittensor transfers can include a system.remark extrinsic as memo.
 */
function extractMemo(tx: Record<string, unknown>): string | null {
  // TaoStats may include memo in different fields depending on version
  const candidates = [tx.memo, tx.remark, tx.data, tx.call_data];
  for (const c of candidates) {
    if (typeof c === "string" && c.startsWith("TYV-")) return c;
  }
  return null;
}

/* ── Verification loop ────────────────────────────────────────────── */

/** Track processed tx hashes to avoid double-processing */
const processedTxHashes = new Set<string>();

/**
 * Run one verification cycle:
 * 1. Fetch recent transfers to deposit address
 * 2. Match against pending payment intents by memo
 * 3. Confirm matches and activate subscriptions
 * 4. Expire stale subscriptions
 *
 * Returns the number of newly confirmed payments.
 */
export async function runVerificationCycle(): Promise<{
  checked: number;
  confirmed: number;
  expired: number;
}> {
  const transfers = await fetchRecentTransfers();
  let confirmed = 0;

  for (const tx of transfers) {
    // Skip already processed
    if (processedTxHashes.has(tx.txHash)) continue;

    // Must be sent TO our deposit address
    if (tx.to !== DEPOSIT_ADDRESS) continue;

    // Must have a memo matching our format
    if (!tx.memo || !tx.memo.startsWith("TYV-")) continue;

    // Try to find a matching payment intent
    const intent = await findPaymentIntentByMemo(tx.memo);
    if (!intent) {
      processedTxHashes.add(tx.txHash);
      continue;
    }

    // Verify amount (allow 1% tolerance for network fees)
    const tolerance = intent.amount_tao * 0.01;
    if (tx.amount < intent.amount_tao - tolerance) {
      // Underpayment — don't confirm
      processedTxHashes.add(tx.txHash);
      continue;
    }

    // Confirm the payment!
    const success = await confirmPaymentIntent(tx.memo, tx.txHash);
    if (success) confirmed++;

    processedTxHashes.add(tx.txHash);
  }

  // Also expire any stale subscriptions
  const expired = await expireSubscriptions();

  return {
    checked: transfers.length,
    confirmed,
    expired,
  };
}

/* ── Background runner ────────────────────────────────────────────── */

let _interval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the background verification loop.
 * Polls every `intervalMs` (default: 60 seconds).
 */
export function startVerificationLoop(intervalMs = PAYMENT_VERIFY_INTERVAL_MS): void {
  if (_interval) return; // Already running

  console.log(`[PaymentVerifier] Starting — polling every ${intervalMs / 1000}s`);

  // Run once immediately
  runVerificationCycle()
    .then((r) => console.log(`[PaymentVerifier] Initial cycle: ${r.checked} checked, ${r.confirmed} confirmed, ${r.expired} expired`))
    .catch((err) => console.error("[PaymentVerifier] Error:", err));

  _interval = setInterval(() => {
    runVerificationCycle()
      .then((r) => {
        if (r.confirmed > 0 || r.expired > 0) {
          console.log(`[PaymentVerifier] ${r.confirmed} confirmed, ${r.expired} expired`);
        }
      })
      .catch((err) => console.error("[PaymentVerifier] Error:", err));
  }, intervalMs);
}

/**
 * Stop the background verification loop.
 */
export function stopVerificationLoop(): void {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
    console.log("[PaymentVerifier] Stopped");
  }
}
