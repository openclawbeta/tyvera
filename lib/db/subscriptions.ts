/* ─────────────────────────────────────────────────────────────────── */
/* Subscription CRUD operations                                        */
/*                                                                     */
/* All functions are async because getDb() is async on first call.     */
/* After first call, the db is cached and returns instantly.           */
/* ─────────────────────────────────────────────────────────────────── */

import { getDb, saveDb } from "./index";
import { getTierForPlan } from "@/lib/types/tiers";
import type { Tier } from "@/lib/types/tiers";

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

/* ── Read ─────────────────────────────────────────────────────────── */

/**
 * Get the current active entitlement for a wallet.
 * Checks: active subscriptions > admin overrides > basic (free).
 */
export async function getEntitlement(walletAddress: string): Promise<ActiveEntitlement | null> {
  const db = await getDb();

  // Check for active subscription (most specific first — platinum > gold > silver)
  const tierOrder = ["PRO_PLATINUM", "PRO_GOLD", "PRO_SILVER"];

  for (const planId of tierOrder) {
    const rows = db.exec(
      `SELECT * FROM subscriptions
       WHERE wallet_address = ? AND plan_id = ? AND status IN ('active', 'grace')
       AND expires_at > datetime('now')
       ORDER BY expires_at DESC LIMIT 1`,
      [walletAddress, planId],
    );

    if (rows.length > 0 && rows[0].values.length > 0) {
      const row = rows[0];
      const cols = row.columns;
      const vals = row.values[0];
      const obj = Object.fromEntries(cols.map((c: string, i: number) => [c, vals[i]])) as Record<string, unknown>;

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
  const overrides = db.exec(
    `SELECT * FROM admin_overrides
     WHERE wallet_address = ? AND expires_at > datetime('now')
     ORDER BY expires_at DESC LIMIT 1`,
    [walletAddress],
  );

  if (overrides.length > 0 && overrides[0].values.length > 0) {
    const row = overrides[0];
    const cols = row.columns;
    const vals = row.values[0];
    const obj = Object.fromEntries(cols.map((c: string, i: number) => [c, vals[i]])) as Record<string, unknown>;

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
  const { walletAddress, planId, amountTao, txHash, memo, durationDays = 30 } = params;

  const tier = getTierForPlan(planId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 86_400_000);

  db.run(
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

  saveDb();

  // Return the created subscription
  const rows = db.exec(
    "SELECT * FROM subscriptions WHERE wallet_address = ? ORDER BY id DESC LIMIT 1",
    [walletAddress],
  );

  const row = rows[0];
  const cols = row.columns;
  const vals = row.values[0];
  return Object.fromEntries(cols.map((c: string, i: number) => [c, vals[i]])) as unknown as Subscription;
}

/**
 * Expire subscriptions that are past their expiry date.
 * Should be called periodically (e.g., via cron or on each API request).
 */
export async function expireSubscriptions(): Promise<number> {
  const db = await getDb();

  // Move active subscriptions past expiry to "expired"
  db.run(
    `UPDATE subscriptions SET status = 'expired', updated_at = datetime('now')
     WHERE status = 'active' AND expires_at <= datetime('now')`,
  );

  // Count how many were expired
  const result = db.exec("SELECT changes() as count");
  const count = result.length > 0 ? (result[0].values[0][0] as number) : 0;

  if (count > 0) saveDb();
  return count;
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
  const { walletAddress, planId, reason, durationDays = 30, grantedBy = "admin" } = params;

  const tier = getTierForPlan(planId);
  const expiresAt = new Date(Date.now() + durationDays * 86_400_000);

  db.run(
    `INSERT INTO admin_overrides (wallet_address, plan_id, tier, reason, granted_by, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [walletAddress, planId, tier, reason, grantedBy, expiresAt.toISOString()],
  );

  saveDb();
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
  expiresAt: string;
}): Promise<void> {
  const db = await getDb();

  db.run(
    `INSERT INTO payment_intents (id, wallet_address, plan_id, amount_tao, memo, status, expires_at)
     VALUES (?, ?, ?, ?, ?, 'awaiting_payment', ?)`,
    [params.id, params.walletAddress, params.planId, params.amountTao, params.memo, params.expiresAt],
  );

  saveDb();
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
} | null> {
  const db = await getDb();

  const rows = db.exec(
    `SELECT * FROM payment_intents WHERE memo = ? AND status = 'awaiting_payment' LIMIT 1`,
    [memo],
  );

  if (rows.length === 0 || rows[0].values.length === 0) return null;

  const cols = rows[0].columns;
  const vals = rows[0].values[0];
  return Object.fromEntries(cols.map((c: string, i: number) => [c, vals[i]])) as unknown as {
    id: string;
    wallet_address: string;
    plan_id: string;
    amount_tao: number;
    memo: string;
    status: string;
  };
}

/**
 * Mark a payment intent as confirmed and activate the subscription.
 */
export async function confirmPaymentIntent(memo: string, txHash: string): Promise<boolean> {
  const intent = await findPaymentIntentByMemo(memo);
  if (!intent) return false;

  const db = await getDb();

  // Update payment intent
  db.run(
    `UPDATE payment_intents SET status = 'confirmed', tx_hash = ?, confirmed_at = datetime('now')
     WHERE memo = ?`,
    [txHash, memo],
  );

  // Activate subscription
  await activateSubscription({
    walletAddress: intent.wallet_address,
    planId: intent.plan_id,
    amountTao: intent.amount_tao,
    txHash,
    memo,
  });

  saveDb();
  return true;
}
