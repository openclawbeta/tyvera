/**
 * lib/db/chain-kv.ts
 *
 * Durable key-value store for chain-derived metrics that need to survive
 * across Vercel lambda invocations.
 *
 * The in-memory caches in lib/chain/* live only inside a single lambda
 * instance. On serverless, the cron writer and the HTTP request reader
 * are almost always different instances, so the reader sees an empty
 * cache and falls through to the stale JSON snapshot — which doesn't
 * contain live root metrics.
 *
 * This module gives us a cheap, durable hand-off. Writes happen in the
 * sync-chain cron; reads happen in /api/subnets (and anywhere else that
 * needs to surface fresh root data without paying to re-query chain).
 *
 * Values are serialized as JSON; callers are responsible for shape.
 */

import { getDb } from "./index";

/** Persist a value under `key`. Overwrites existing rows. */
export async function setChainKv(
  key: string,
  value: unknown,
): Promise<void> {
  const db = await getDb();
  const payload = JSON.stringify(value);
  const now = new Date().toISOString();

  // Delete + insert keeps the write path portable across Turso/sql.js
  // without depending on ON CONFLICT support for primary-key upserts.
  await db.execute(`DELETE FROM chain_kv WHERE key = ?`, [key]);
  await db.execute(
    `INSERT INTO chain_kv (key, value_json, updated_at) VALUES (?, ?, ?)`,
    [key, payload, now],
  );
}

export interface ChainKvRow<T> {
  value: T;
  updatedAt: string;
  ageMs: number;
}

/**
 * Read + parse a single key. Returns null if missing or malformed.
 * `ageMs` is computed from `updated_at`.
 */
export async function getChainKv<T>(
  key: string,
): Promise<ChainKvRow<T> | null> {
  const db = await getDb();
  try {
    const res = await db.query(
      `SELECT value_json, updated_at FROM chain_kv WHERE key = ? LIMIT 1`,
      [key],
    );
    const rows = res[0]?.rows ?? [];
    if (!rows.length) return null;

    const raw = String(rows[0][0] ?? "");
    const updatedAt = String(rows[0][1] ?? "");
    if (!raw) return null;

    let value: T;
    try {
      value = JSON.parse(raw) as T;
    } catch {
      return null;
    }

    const ts = Date.parse(updatedAt);
    const ageMs = Number.isFinite(ts) ? Date.now() - ts : Infinity;

    return { value, updatedAt, ageMs };
  } catch (err) {
    console.warn("[chain-kv] read failed for", key, err);
    return null;
  }
}
