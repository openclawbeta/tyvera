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

import { confirmPaymentIntent, findPaymentIntentByMemo, findPaymentIntentByAmount, expireSubscriptions } from "./subscriptions";
import { getTransfersToAddress, scanRecentTransfers } from "@/lib/chain/transfer-scanner";
import { PAYMENT_VERIFY_INTERVAL_MS } from "@/lib/config";
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
    memo: null, // Memos extracted separately — see note below
    blockNumber: e.blockNumber,
  }));
}

/* ── Verification loop ────────────────────────────────────────────── */

/** Track processed tx hashes to avoid double-processing */
const processedTxHashes = new Set<string>();

/**
 * Run one verification cycle:
 * 1. Fetch recent transfers to deposit address from chain events
 * 2. Match against pending payment intents by memo
 * 3. Confirm matches and activate subscriptions
 * 4. Expire stale subscriptions
 *
 * Note: Substrate balances.Transfer events don't natively carry memos.
 * Payment verification currently matches by amount + timing.
 * For memo-based matching, the payer includes a system.remark in the
 * same block — this would require checking for paired remark extrinsics.
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
    if (tx.to !== getDepositAddress()) continue;

    let intent: Awaited<ReturnType<typeof findPaymentIntentByMemo>> = null;

    // Strategy 1: Match by memo if available (system.remark pairing)
    if (tx.memo && tx.memo.startsWith("TYV-")) {
      intent = await findPaymentIntentByMemo(tx.memo);
    }

    // Strategy 2: Match by amount + sender + timing window
    // Substrate transfers don't natively carry memos, so this is the
    // primary matching path. Uses exact amount matching (TAO amounts are
    // unique per intent due to fractional precision) within a time window.
    if (!intent) {
      intent = await findPaymentIntentByAmount(tx.from, tx.amount);
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
