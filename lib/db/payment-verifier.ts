/* ─────────────────────────────────────────────────────────────────── */
/* On-chain payment verifier                                           */
/*                                                                     */
/* Polls the Bittensor chain (via transfer-scanner) for incoming TAO   */
/* transfers to the Tyvera deposit address. When a transfer matches    */
/* a pending PaymentIntent memo, it auto-activates the subscription.   */
/*                                                                     */
/* Data source: ON-CHAIN ONLY via transfer-scanner                     */
/* No external API dependencies (no TaoStats).                         */
/*                                                                     */
/* The verifier runs as a background interval on the server.           */
/* Start it from the /api/verify-payments cron endpoint or on boot.    */
/* ─────────────────────────────────────────────────────────────────── */

import { confirmPaymentIntent, findPaymentIntentByMemo, findPaymentIntentByAmount, findAllPaymentIntentsByAmount, expireSubscriptions } from "./subscriptions";
import { getTransfersToAddress, getLastScannedBlock, scanRecentTransfers } from "@/lib/chain/transfer-scanner";
import { PAYMENT_VERIFY_INTERVAL_MS, PAYMENT_MIN_CONFIRMATIONS } from "@/lib/config";
import { requireEnv } from "@/lib/env";

// Tyvera deposit address — set via DEPOSIT_ADDRESS env var (lazy to avoid build-time crash)
function getDepositAddress(): string {
  return requireEnv("DEPOSIT_ADDRESS");
}

/* ── Types ────────────────────────────────────────────────────────── */

interface Transfer {
  from: string;
  to: string;
  amount: number;     // TAO (not rao)
  txHash: string;
  memo: string | null;
  blockNumber: number;
}

/* ── Transfer fetching (chain-only) ──────────────────────────────── */

/**
 * Fetch recent transfers to the deposit address from chain event buffer.
 *
 * Uses the transfer-scanner's rolling event buffer, which is populated
 * by the cron job scanning recent blocks. No external API calls.
 */
async function fetchRecentTransfers(): Promise<Transfer[]> {
  // Trigger a scan to ensure buffer is fresh
  await scanRecentTransfers().catch((err) => {
    console.warn("[PaymentVerifier] Chain scan failed, using cached events:", err);
  });

  const depositAddr = getDepositAddress();
  const events = getTransfersToAddress(depositAddr, 20);

  return events.map((e) => ({
    from: e.fromAddress,
    to: e.toAddress,
    amount: e.amountTao,
    txHash: e.txHash,
    memo: e.memo ?? null, // Populated when system.remark paired in same block
    blockNumber: e.blockNumber,
  }));
}

/* ── Verification loop ────────────────────────────────────────────── */

/** Track processed tx hashes to avoid double-processing */
const processedTxHashes = new Set<string>();

/**
 * Run one verification cycle:
 * 1. Fetch recent transfers to deposit address from chain events
 * 2. Check confirmation depth (block maturity)
 * 3. Match against pending payment intents by memo or amount
 * 4. Collision guard: reject ambiguous amount matches
 * 5. Confirm matches and activate subscriptions
 * 6. Expire stale subscriptions
 *
 * Returns the number of newly confirmed payments.
 */
export async function runVerificationCycle(): Promise<{
  checked: number;
  confirmed: number;
  expired: number;
  skippedDepth: number;
  skippedCollision: number;
}> {
  const transfers = await fetchRecentTransfers();
  const chainHead = getLastScannedBlock();
  let confirmed = 0;
  let skippedDepth = 0;
  let skippedCollision = 0;

  for (const tx of transfers) {
    // Skip already processed
    if (processedTxHashes.has(tx.txHash)) continue;

    // Must be sent TO our deposit address
    if (tx.to !== getDepositAddress()) continue;

    // ── Confirmation depth gate ──────────────────────────────────
    // Wait until the transfer's block is at least N blocks behind
    // chain head before confirming. Prevents matching on forks.
    if (chainHead > 0 && tx.blockNumber > 0) {
      const depth = chainHead - tx.blockNumber;
      if (depth < PAYMENT_MIN_CONFIRMATIONS) {
        skippedDepth++;
        continue; // Don't mark as processed — retry next cycle
      }
    }

    let intent: Awaited<ReturnType<typeof findPaymentIntentByMemo>> = null;

    // Strategy 1: Match by memo if available (system.remark pairing)
    // This is the most reliable path — no ambiguity possible.
    if (tx.memo && tx.memo.startsWith("TYV-")) {
      intent = await findPaymentIntentByMemo(tx.memo);
    }

    // Strategy 2: Match by amount + sender + timing window
    // The fractional offset on amounts makes collisions rare, but
    // we still guard against it.
    if (!intent) {
      // ── Collision guard ────────────────────────────────────────
      // If multiple pending intents match this amount + sender,
      // reject the match entirely — manual resolution is safer.
      const matches = await findAllPaymentIntentsByAmount(tx.from, tx.amount);
      if (matches.length > 1) {
        console.warn(
          `[PaymentVerifier] Collision: ${matches.length} intents match ` +
          `amount=${tx.amount} from=${tx.from.slice(0, 12)}… — skipping for manual resolution`,
        );
        processedTxHashes.add(tx.txHash);
        skippedCollision++;
        continue;
      }
      if (matches.length === 1) {
        intent = matches[0];
      }
    }

    if (!intent) {
      processedTxHashes.add(tx.txHash);
      continue;
    }

    // Verify amount (allow 1% tolerance for network fees)
    const tolerance = intent.amount_tao * 0.01;
    if (tx.amount < intent.amount_tao - tolerance) {
      processedTxHashes.add(tx.txHash);
      continue;
    }

    // Confirm the payment!
    const success = await confirmPaymentIntent(intent.memo, tx.txHash);
    if (success) confirmed++;

    processedTxHashes.add(tx.txHash);
  }

  // Also expire any stale subscriptions
  const expired = await expireSubscriptions();

  return {
    checked: transfers.length,
    confirmed,
    expired,
    skippedDepth,
    skippedCollision,
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
