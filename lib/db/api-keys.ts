/* ─────────────────────────────────────────────────────────────────── */
/* API Key CRUD operations                                             */
/*                                                                     */
/* Keys are stored as SHA-256 hashes. The plaintext key is only        */
/* returned once at creation time.                                     */
/* ─────────────────────────────────────────────────────────────────── */

import { getDb, saveDb } from "./index";
import { createHash, randomBytes } from "crypto";
import type { Tier } from "@/lib/types/tiers";
import { getApiRateLimit, normalizeTier } from "@/lib/types/tiers";

/* ── Types ────────────────────────────────────────────────────────── */

export interface ApiKeyRecord {
  id: number;
  key_prefix: string;
  wallet_address: string;
  label: string;
  tier: Tier;
  status: "active" | "revoked";
  requests_today: number;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiKeyValidation {
  valid: boolean;
  wallet_address?: string;
  tier?: Tier;
  rate_limit?: number;
  requests_today?: number;
  error?: string;
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function generateKey(): string {
  const bytes = randomBytes(32);
  return `tyv_${bytes.toString("hex")}`;
}

/* ── Create ──────────────────────────────────────────────────────── */

/**
 * Generate a new API key for a wallet.
 * Returns the plaintext key (only time it's available).
 */
export async function createApiKey(params: {
  walletAddress: string;
  tier: Tier;
  label?: string;
}): Promise<{ key: string; prefix: string; id: number }> {
  const db = await getDb();
  const { walletAddress, tier, label = "default" } = params;

  // Limit to 5 active keys per wallet
  const countResult = db.exec(
    "SELECT COUNT(*) as cnt FROM api_keys WHERE wallet_address = ? AND status = 'active'",
    [walletAddress],
  );
  const activeCount = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;
  if (activeCount >= 5) {
    throw new Error("Maximum 5 active API keys per wallet");
  }

  const key = generateKey();
  const keyHash = hashKey(key);
  const prefix = key.slice(0, 12); // tyv_xxxxxxxx

  db.run(
    `INSERT INTO api_keys (key_hash, key_prefix, wallet_address, label, tier)
     VALUES (?, ?, ?, ?, ?)`,
    [keyHash, prefix, walletAddress, label, tier],
  );

  saveDb();

  // Get the inserted ID
  const idResult = db.exec("SELECT last_insert_rowid() as id");
  const id = idResult.length > 0 ? (idResult[0].values[0][0] as number) : 0;

  return { key, prefix, id };
}

/* ── Validate ────────────────────────────────────────────────────── */

/**
 * Validate an API key and check rate limits.
 * Returns validation result with tier info.
 */
export async function validateApiKey(key: string): Promise<ApiKeyValidation> {
  const db = await getDb();
  const keyHash = hashKey(key);

  const rows = db.exec(
    "SELECT * FROM api_keys WHERE key_hash = ? AND status = 'active' LIMIT 1",
    [keyHash],
  );

  if (rows.length === 0 || rows[0].values.length === 0) {
    return { valid: false, error: "Invalid or revoked API key" };
  }

  const cols = rows[0].columns;
  const vals = rows[0].values[0];
  const record = Object.fromEntries(cols.map((c: string, i: number) => [c, vals[i]])) as unknown as ApiKeyRecord;

  const tier = normalizeTier(record.tier);
  const rateLimit = getApiRateLimit(tier);

  if (rateLimit === 0) {
    return { valid: false, error: "API access not included in your tier" };
  }

  // Check rate limit (skip for unlimited = -1)
  if (rateLimit > 0 && record.requests_today >= rateLimit) {
    return {
      valid: false,
      error: `Rate limit exceeded (${rateLimit}/day). Upgrade for higher limits.`,
      tier,
      rate_limit: rateLimit,
      requests_today: record.requests_today,
    };
  }

  // Increment request count and update last_used_at
  db.run(
    `UPDATE api_keys SET requests_today = requests_today + 1, last_used_at = datetime('now')
     WHERE key_hash = ?`,
    [keyHash],
  );
  saveDb();

  return {
    valid: true,
    wallet_address: record.wallet_address,
    tier,
    rate_limit: rateLimit,
    requests_today: record.requests_today + 1,
  };
}

/* ── List ─────────────────────────────────────────────────────────── */

/**
 * List all API keys for a wallet (without hashes).
 */
export async function listApiKeys(walletAddress: string): Promise<ApiKeyRecord[]> {
  const db = await getDb();

  const rows = db.exec(
    `SELECT id, key_prefix, wallet_address, label, tier, status, requests_today, last_used_at, created_at
     FROM api_keys WHERE wallet_address = ? ORDER BY created_at DESC`,
    [walletAddress],
  );

  if (rows.length === 0) return [];

  return rows[0].values.map((vals) => {
    const cols = rows[0].columns;
    return Object.fromEntries(cols.map((c: string, i: number) => [c, vals[i]])) as unknown as ApiKeyRecord;
  });
}

/* ── Revoke ───────────────────────────────────────────────────────── */

/**
 * Revoke an API key by ID (must belong to the wallet).
 */
export async function revokeApiKey(id: number, walletAddress: string): Promise<boolean> {
  const db = await getDb();

  db.run(
    `UPDATE api_keys SET status = 'revoked', revoked_at = datetime('now')
     WHERE id = ? AND wallet_address = ?`,
    [id, walletAddress],
  );

  const result = db.exec("SELECT changes() as count");
  const count = result.length > 0 ? (result[0].values[0][0] as number) : 0;

  if (count > 0) saveDb();
  return count > 0;
}

/* ── Daily Reset ─────────────────────────────────────────────────── */

/**
 * Reset daily request counters. Call from cron at midnight UTC.
 */
export async function resetDailyCounters(): Promise<void> {
  const db = await getDb();
  db.run("UPDATE api_keys SET requests_today = 0 WHERE requests_today > 0");
  saveDb();
}
