/**
 * lib/db/subnet-history.ts
 *
 * CRUD for the subnet_history table — one row per (netuid, UTC day)
 * populated by the sync-chain cron. Used by the subnet detail page
 * to plot yield / TAO-in / emissions over time.
 */

import { getDb } from "./index";

export interface SubnetHistoryRow {
  netuid: number;
  snapshot_date: string;
  yield_pct: number;
  tao_in: number;
  emission_per_day: number;
  stakers: number;
  alpha_price: number | null;
  captured_at: string;
}

export interface SubnetHistoryInput {
  netuid: number;
  yieldPct: number;
  taoIn: number;
  emissionPerDay: number;
  stakers: number;
  alphaPrice?: number | null;
}

function utcDayKey(date = new Date()): string {
  return date.toISOString().split("T")[0];
}

/**
 * Upsert a day's snapshot for many subnets at once. Meant to be called
 * from cron with the fresh ChainSnapshot — idempotent per UTC day.
 */
export async function recordSubnetHistoryBatch(
  entries: SubnetHistoryInput[],
): Promise<number> {
  if (entries.length === 0) return 0;
  const db = await getDb();
  const day = utcDayKey();
  let count = 0;

  for (const e of entries) {
    try {
      // Delete-then-insert keeps "latest wins" without needing ON CONFLICT.
      await db.execute(
        `DELETE FROM subnet_history WHERE netuid = ? AND snapshot_date = ?`,
        [e.netuid, day],
      );
      await db.execute(
        `INSERT INTO subnet_history
           (netuid, snapshot_date, yield_pct, tao_in, emission_per_day, stakers, alpha_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          e.netuid,
          day,
          e.yieldPct,
          e.taoIn,
          e.emissionPerDay,
          e.stakers,
          e.alphaPrice ?? null,
        ],
      );
      count++;
    } catch (err) {
      console.warn("[subnet-history] write failed for netuid", e.netuid, err);
    }
  }

  return count;
}

/**
 * Fetch the last `days` rows for a single netuid, oldest-first.
 */
export async function getSubnetHistory(
  netuid: number,
  days: number,
): Promise<SubnetHistoryRow[]> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const cutoffKey = utcDayKey(cutoff);

  const rows = await db.query(
    `SELECT netuid, snapshot_date, yield_pct, tao_in, emission_per_day,
            stakers, alpha_price, captured_at
     FROM subnet_history
     WHERE netuid = ? AND snapshot_date >= ?
     ORDER BY snapshot_date ASC`,
    [netuid, cutoffKey],
  );

  if (!rows.length || !rows[0].rows.length) return [];

  return rows[0].rows.map((row): SubnetHistoryRow => ({
    netuid: Number(row[0]),
    snapshot_date: String(row[1]),
    yield_pct: Number(row[2]) || 0,
    tao_in: Number(row[3]) || 0,
    emission_per_day: Number(row[4]) || 0,
    stakers: Number(row[5]) || 0,
    alpha_price: row[6] == null ? null : Number(row[6]),
    captured_at: String(row[7]),
  }));
}

/**
 * Drop subnet_history rows older than `retentionDays` (all netuids).
 * Called from the daily reset cron to bound table size.
 */
export async function pruneSubnetHistory(retentionDays = 365): Promise<void> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  await db
    .execute(`DELETE FROM subnet_history WHERE snapshot_date < ?`, [utcDayKey(cutoff)])
    .catch(() => {});
}
