/* ─────────────────────────────────────────────────────────────────── */
/* Subscription CRUD operations                                        */
/*                                                                     */
/* Uses the DbClient abstraction — works with both Turso and sql.js.  */
/* ─────────────────────────────────────────────────────────────────── */

import { getDb } from "./index";
import { getTierForPlan, TIER_DEFINITIONS } from "@/lib/types/tiers";
import type { Tier } from "@/lib/types/tiers";
import { MONTHLY_DURATION_DAYS, GRACE_PERIOD_DAYS, PAYMENT_AMOUNT_TOLERANCE_TAO } from "@/lib/config";

/* ── Types ────────────────────────────────────────────────────────── */

export interface Subscription {
  id: number;
  wallet_address: string;
  plan_id: string;
  tier: Tier;
  status: "active" | "expired" | "cancelled" | "grace";
  amount_tao: number;
  tx_hash: string | null;
  memo: string | null;
  activated_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ActiveEntitlement {
  wallet_address: string;
  tier: Tier;
  plan_id: string;
  status: "active" | "grace";
  expires_at: string;
  days_remaining: number;
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function rowToObject(columns: string[], values: any[]): Record<string, unknown> {
  return Object.fromEntries(columns.map((c, i) => [c, values[i]]));
}

/* ── Read ─────────────────────────────────────────────────────────── */

/**
 * Get the current active entitlement for a wallet.
 * Checks: active subscriptions > admin overrides > basic (free).
 */
export async function getEntitlement(walletAddress: string): Promise<ActiveEntitlement | null> {
  const db = await getDb();

  // Check for active subscription — query ALL known plan IDs, highest tier first.
  // Derives dynamically from TIER_DEFINITIONS so new tiers are automatically included.
  const tierOrder = TIER_DEFINITIONS
    .slice()
    .reverse() // highest tier first (institutional → strategist → analyst)
    .flatMap((d) => d.planIds)
    .filter((id) => id !== "FREE");

  for (const planId of tierOrder) {
    const rows = await db.query(
      `SELECT * FROM subscriptions
       WHERE wallet_address = ? AND plan_id = ? AND status IN ('active', 'grace')
       AND expires_at > datetime('now')
       ORDER BY expires_at DESC LIMIT 1`,
      [walletAddress, planId],
    );

    if (rows.length > 0 && rows[0].rows.length > 0) {
      const obj = rowToObject(rows[0].columns, rows[0].rows[0]);

      const expiresAt = new Date(obj.expires_at as string);
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000));

      return {
        wallet_address: obj.wallet_address as string,
        tier: obj.tier as Tier,
        plan_id: obj.plan_id as string,
        status: obj.status as "active" | "grace",
        expires_at: obj.expires_at as string,
        days_remaining: daysRemaining,
      };
    }
  }

  // Check admin overrides
  const overrides = await db.query(
    `SELECT * FROM admin_overrides
     WHERE wallet_address = ? AND expires_at > datetime('now')
     ORDER BY expires_at DESC LIMIT 1`,
    [walletAddress],
  );

  if (overrides.length > 0 && overrides[0].rows.length > 0) {
    const obj = rowToObject(overrides[0].columns, overrides[0].rows[0]);

    const expiresAt = new Date(obj.expires_at as string);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000));

    return {
      wallet_address: obj.wallet_address as string,
      tier: obj.tier as Tier,
      plan_id: obj.plan_id as string,
      status: "active",
      expires_at: obj.expires_at as string,
      days_remaining: daysRemaining,
    };
  }

  return null; // No active subscription — basic tier
}

/* ── Write ────────────────────────────────────────────────────────── */

/**
 * Activate a subscription after payment is confirmed.
 *
 * Renewal-aware: if the wallet already has an active/grace subscription for
 * the same plan, the new duration is stacked on top of the existing expiry
 * so the user doesn't lose unused days when renewing early.
 */
export async function activateSubscription(params: {
  walletAddress: string;
  planId: string;
  amountTao: number;
  txHash: string;
  memo: string;
  durationDays?: number;
}): Promise<Subscription> {
  const db = await getDb();
  const { walletAddress, planId, amountTao, txHash, memo, durationDays = MONTHLY_DURATION_DAYS } = params;

  const tier = getTierForPlan(planId);
  const now = new Date();

  // ── Renewal stacking ────────────────────────────────────────────────
  // Find any still-valid subscription for this wallet + plan (active or
  // grace, not yet past expires_at). If one exists, extend from its
  // existing expiry; otherwise start the new period from `now`.
  const existing = await db.query(
    `SELECT expires_at FROM subscriptions
     WHERE wallet_address = ? AND plan_id = ?
       AND status IN ('active', 'grace')
       AND expires_at > datetime('now')
     ORDER BY expires_at DESC LIMIT 1`,
    [walletAddress, planId],
  );

  let baseTime = now.getTime();
  if (existing.length > 0 && existing[0].rows.length > 0) {
    const existingExpiry = new Date(
      existing[0].rows[0][0] as string,
    ).getTime();
    if (existingExpiry > baseTime) baseTime = existingExpiry;
  }

  const expiresAt = new Date(baseTime + durationDays * 86_400_000);

  await db.execute(
    `INSERT INTO subscriptions (wallet_address, plan_id, tier, status, amount_tao, tx_hash, memo, activated_at, expires_at)
     VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
    [
      walletAddress,
      planId,
      tier,
      amountTao,
      txHash,
      memo,
      now.toISOString(),
      expiresAt.toISOString(),
    ],
  );

  // Return the created subscription
  const rows = await db.query(
    "SELECT * FROM subscriptions WHERE wallet_address = ? ORDER BY id DESC LIMIT 1",
    [walletAddress],
  );

  if (!rows.length || !rows[0].rows.length) {
    throw new Error(`Failed to retrieve subscription after INSERT for ${walletAddress}`);
  }

  return rowToObject(rows[0].columns, rows[0].rows[0]) as unknown as Subscription;
}

/**
 * Process subscription lifecycle transitions:
 * 1. active → grace: when expires_at has passed
 * 2. grace → expired: when grace period (7 days after expiry) has passed
 */
export async function expireSubscriptions(): Promise<number> {
  const db = await getDb();
  let totalChanged = 0;

  // Step 1: Move expired active subscriptions to grace period
  await db.execute(
    `UPDATE subscriptions SET status = 'grace', updated_at = datetime('now')
     WHERE status = 'active' AND expires_at <= datetime('now')`,
  );
  const graceResult = await db.query("SELECT changes() as count");
  const graceCount = graceResult.length > 0 && graceResult[0].rows.length > 0 ? (graceResult[0].rows[0][0] as number) : 0;
  totalChanged += graceCount;

  // Step 2: Expire grace-period subscriptions after GRACE_PERIOD_DAYS
  await db.execute(
    `UPDATE subscriptions SET status = 'expired', updated_at = datetime('now')
     WHERE status = 'grace'
     AND datetime(expires_at, '+${GRACE_PERIOD_DAYS} days') <= datetime('now')`,
  );
  const expiredResult = await db.query("SELECT changes() as count");
  const expiredCount = expiredResult.length > 0 && expiredResult[0].rows.length > 0 ? (expiredResult[0].rows[0][0] as number) : 0;
  totalChanged += expiredCount;

  return totalChanged;
}

/**
 * Admin override — manually grant a subscription to a wallet.
 */
export async function adminGrantSubscription(params: {
  walletAddress: string;
  planId: string;
  reason: string;
  durationDays?: number;
  grantedBy?: string;
}): Promise<void> {
  const db = await getDb();
  const { walletAddress, planId, reason, durationDays = MONTHLY_DURATION_DAYS, grantedBy = "admin" } = params;

  const tier = getTierForPlan(planId);
  const expiresAt = new Date(Date.now() + durationDays * 86_400_000);

  await db.execute(
    `INSERT INTO admin_overrides (wallet_address, plan_id, tier, reason, granted_by, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [walletAddress, planId, tier, reason, grantedBy, expiresAt.toISOString()],
  );
}

/* ── Payment Intents ──────────────────────────────────────────────── */

/**
 * Store a payment intent in the database.
 */
export async function storePaymentIntent(params: {
  id: string;
  walletAddress: string;
  planId: string;
  amountTao: number;
  memo: string;
  billingCycle: "monthly" | "annual";
  durationDays: number;
  expiresAt: string;
}): Promise<void> {
  const db = await getDb();

  await db.execute(
    `INSERT INTO payment_intents (id, wallet_address, plan_id, amount_tao, memo, billing_cycle, duration_days, status, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'awaiting_payment', ?)`,
    [params.id, params.walletAddress, params.planId, params.amountTao, params.memo, params.billingCycle, params.durationDays, params.expiresAt],
  );
}

/**
 * Find a payment intent by memo (used for matching incoming transfers).
 */
export async function findPaymentIntentByMemo(memo: string): Promise<{
  id: string;
  wallet_address: string;
  plan_id: string;
  amount_tao: number;
  memo: string;
  status: string;
  billing_cycle: string;
  duration_days: number;
} | null> {
  const db = await getDb();

  const rows = await db.query(
    `SELECT * FROM payment_intents
     WHERE memo = ?
       AND status = 'awaiting_payment'
       AND expires_at > datetime('now')
     LIMIT 1`,
    [memo],
  );

  if (rows.length === 0 || rows[0].rows.length === 0) return null;

  return rowToObject(rows[0].columns, rows[0].rows[0]) as unknown as {
    id: string;
    wallet_address: string;
    plan_id: string;
    amount_tao: number;
    memo: string;
    status: string;
    billing_cycle: string;
    duration_days: number;
  };
}

/**
 * Find a pending payment intent by sender address + amount.
 * Used when memo is unavailable (Substrate transfers don't carry memos natively).
 * Matches within 1% tolerance and only considers intents created in the last 24h.
 */
export async function findPaymentIntentByAmount(
  senderAddress: string,
  amountTao: number,
): Promise<{
  id: string;
  wallet_address: string;
  plan_id: string;
  amount_tao: number;
  memo: string;
  status: string;
  billing_cycle: string;
  duration_days: number;
} | null> {
  const db = await getDb();
  const minAmount = amountTao - PAYMENT_AMOUNT_TOLERANCE_TAO;
  const maxAmount = amountTao + PAYMENT_AMOUNT_TOLERANCE_TAO;

  const rows = await db.query(
    `SELECT * FROM payment_intents
     WHERE wallet_address = ?
       AND status = 'awaiting_payment'
       AND amount_tao BETWEEN ? AND ?
       AND expires_at > datetime('now')
     ORDER BY created_at DESC LIMIT 1`,
    [senderAddress, minAmount, maxAmount],
  );

  if (rows.length === 0 || rows[0].rows.length === 0) return null;

  return rowToObject(rows[0].columns, rows[0].rows[0]) as unknown as {
    id: string;
    wallet_address: string;
    plan_id: string;
    amount_tao: number;
    memo: string;
    status: string;
    billing_cycle: string;
    duration_days: number;
  };
}

/**
 * Find ALL pending payment intents matching sender address + amount.
 * Used by the collision guard — if this returns more than one match,
 * the verifier rejects the match to avoid false-positive confirmations.
 */
export async function findAllPaymentIntentsByAmount(
  senderAddress: string,
  amountTao: number,
): Promise<Array<{
  id: string;
  wallet_address: string;
  plan_id: string;
  amount_tao: number;
  memo: string;
  status: string;
  billing_cycle: string;
  duration_days: number;
}>> {
  const db = await getDb();
  const minAmount = amountTao - PAYMENT_AMOUNT_TOLERANCE_TAO;
  const maxAmount = amountTao + PAYMENT_AMOUNT_TOLERANCE_TAO;

  const rows = await db.query(
    `SELECT * FROM payment_intents
     WHERE wallet_address = ?
       AND status = 'awaiting_payment'
       AND amount_tao BETWEEN ? AND ?
       AND expires_at > datetime('now')
     ORDER BY created_at DESC`,
    [senderAddress, minAmount, maxAmount],
  );

  if (rows.length === 0 || rows[0].rows.length === 0) return [];

  return rows[0].rows.map((row: any[]) =>
    rowToObject(rows[0].columns, row) as unknown as {
      id: string;
      wallet_address: string;
      plan_id: string;
      amount_tao: number;
      memo: string;
      status: string;
      billing_cycle: string;
      duration_days: number;
    },
  );
}

/**
 * Has this on-chain tx hash already been credited to a subscription?
 *
 * Durable double-claim guard — complements the in-memory
 * `processedTxHashes` set in payment-verifier.ts, which is wiped on
 * serverless cold starts. A tx that has already activated a
 * subscription must never activate a second one, even if the process
 * restarts and re-encounters the same chain event.
 */
export async function isTxHashAlreadyProcessed(txHash: string): Promise<boolean> {
  if (!txHash) return false;
  const db = await getDb();
  const rows = await db.query(
    `SELECT 1 FROM subscriptions WHERE tx_hash = ? LIMIT 1`,
    [txHash],
  );
  return rows.length > 0 && rows[0].rows.length > 0;
}

/**
 * Mark a payment intent as confirmed and activate the subscription.
 *
 * Uses a conditional UPDATE on `status = 'awaiting_payment'` followed by a
 * `changes()` check as the atomic claim. If two overlapping verifier cycles
 * race on the same intent, only the first UPDATE will flip the row and win
 * the right to insert the subscription — the loser returns `false` without
 * duplicating the activation.
 */
export async function confirmPaymentIntent(memo: string, txHash: string): Promise<boolean> {
  const intent = await findPaymentIntentByMemo(memo);
  if (!intent) return false;

  const db = await getDb();

  await db.execute(
    `UPDATE payment_intents
       SET status = 'confirmed', tx_hash = ?, confirmed_at = datetime('now')
     WHERE memo = ? AND status = 'awaiting_payment'`,
    [txHash, memo],
  );

  const changeRes = await db.query("SELECT changes() as count");
  const changed =
    changeRes.length > 0 && changeRes[0].rows.length > 0
      ? (changeRes[0].rows[0][0] as number)
      : 0;

  if (changed === 0) {
    // Another verifier cycle already claimed this intent; do not double-activate.
    return false;
  }

  await activateSubscription({
    walletAddress: intent.wallet_address,
    planId: intent.plan_id,
    amountTao: intent.amount_tao,
    txHash,
    memo,
    durationDays: intent.duration_days || MONTHLY_DURATION_DAYS,
  });

  return true;
}
