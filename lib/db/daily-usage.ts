/**
 * lib/db/daily-usage.ts
 *
 * Per-wallet daily usage counters for rate limiting.
 *
 * Uses a date_bucket (YYYY-MM-DD) so counters auto-reset daily
 * without needing a separate cron job. Old rows are cleaned up
 * lazily or via the existing reset-counters cron.
 */

import { getDb } from "./index";

/**
 * Increment a daily usage counter and return the new count.
 * Creates the row if it doesn't exist (upsert pattern).
 */
export async function incrementDailyUsage(
  walletAddress: string,
  counterType: string,
): Promise<number> {
  const db = await getDb();
  const dateBucket = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  await db.execute(
    `INSERT INTO daily_usage (wallet_address, counter_type, date_bucket, count)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(wallet_address, counter_type, date_bucket)
     DO UPDATE SET count = count + 1`,
    [walletAddress, counterType, dateBucket],
  );

  const rows = await db.query(
    `SELECT count FROM daily_usage
     WHERE wallet_address = ? AND counter_type = ? AND date_bucket = ?`,
    [walletAddress, counterType, dateBucket],
  );

  return Number(rows[0]?.rows?.[0]?.[0] ?? 1);
}

/**
 * Get the current daily count without incrementing.
 */
export async function getDailyUsage(
  walletAddress: string,
  counterType: string,
): Promise<number> {
  const db = await getDb();
  const dateBucket = new Date().toISOString().slice(0, 10);

  const rows = await db.query(
    `SELECT count FROM daily_usage
     WHERE wallet_address = ? AND counter_type = ? AND date_bucket = ?`,
    [walletAddress, counterType, dateBucket],
  );

  return Number(rows[0]?.rows?.[0]?.[0] ?? 0);
}

/**
 * Prune old daily_usage rows (older than 7 days).
 * Called from the reset-counters cron for hygiene.
 */
export async function pruneDailyUsage(): Promise<void> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  await db.execute(`DELETE FROM daily_usage WHERE date_bucket < ?`, [cutoff]);
}
