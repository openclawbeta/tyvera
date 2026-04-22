/**
 * lib/db/portfolio-snapshots.ts
 *
 * CRUD for the portfolio_snapshots table. Stores one rollup row per
 * wallet per UTC day. Used by the portfolio history chart.
 */

import { getDb } from "./index";

export interface PortfolioSnapshot {
  wallet_address: string;
  snapshot_date: string; // YYYY-MM-DD
  total_staked_tao: number;
  total_value_usd: number;
  weighted_yield: number;
  position_count: number;
  tao_price_usd: number;
  captured_at: string;
}

function utcDayKey(date = new Date()): string {
  return date.toISOString().split("T")[0];
}

/**
 * Record a portfolio snapshot for the given wallet. Deduped on
 * (wallet_address, snapshot_date): subsequent calls on the same UTC
 * day overwrite the earlier row so the stored value reflects the
 * latest known state.
 */
export async function recordPortfolioSnapshot(input: {
  walletAddress: string;
  totalStakedTao: number;
  totalValueUsd: number;
  weightedYield: number;
  positionCount: number;
  taoPriceUsd: number;
}): Promise<void> {
  if (!input.walletAddress) return;

  const db = await getDb();
  const day = utcDayKey();

  // Upsert-style write: delete same-day row then insert. Keeps the
  // "latest wins" semantics without needing ON CONFLICT support.
  try {
    await db.execute(
      `DELETE FROM portfolio_snapshots WHERE wallet_address = ? AND snapshot_date = ?`,
      [input.walletAddress, day],
    );
    await db.execute(
      `INSERT INTO portfolio_snapshots
         (wallet_address, snapshot_date, total_staked_tao, total_value_usd,
          weighted_yield, position_count, tao_price_usd)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.walletAddress,
        day,
        input.totalStakedTao,
        input.totalValueUsd,
        input.weightedYield,
        input.positionCount,
        input.taoPriceUsd,
      ],
    );
  } catch (err) {
    console.warn("[portfolio-snapshots] recordPortfolioSnapshot failed:", err);
  }
}

/**
 * Fetch the last N daily snapshots for a wallet, oldest-first.
 */
export async function getPortfolioSnapshots(
  walletAddress: string,
  days: number,
): Promise<PortfolioSnapshot[]> {
  if (!walletAddress) return [];
  const db = await getDb();

  const cutoff = new Date(Date.now() - days * 86_400_000);
  const cutoffKey = utcDayKey(cutoff);

  const rows = await db.query(
    `SELECT wallet_address, snapshot_date, total_staked_tao, total_value_usd,
            weighted_yield, position_count, tao_price_usd, captured_at
     FROM portfolio_snapshots
     WHERE wallet_address = ? AND snapshot_date >= ?
     ORDER BY snapshot_date ASC`,
    [walletAddress, cutoffKey],
  );

  if (!rows.length || !rows[0].rows.length) return [];

  return rows[0].rows.map((row): PortfolioSnapshot => ({
    wallet_address: String(row[0]),
    snapshot_date: String(row[1]),
    total_staked_tao: Number(row[2]) || 0,
    total_value_usd: Number(row[3]) || 0,
    weighted_yield: Number(row[4]) || 0,
    position_count: Number(row[5]) || 0,
    tao_price_usd: Number(row[6]) || 0,
    captured_at: String(row[7]),
  }));
}

/**
 * List distinct wallet addresses that have recorded at least one
 * snapshot in the last `lookbackDays` days. Used by the daily backfill
 * cron to continue the series even when the user doesn't visit.
 */
export async function getActiveSnapshotWallets(
  lookbackDays = 30,
): Promise<string[]> {
  const db = await getDb();
  const cutoff = utcDayKey(new Date(Date.now() - lookbackDays * 86_400_000));
  try {
    const rows = await db.query(
      `SELECT DISTINCT wallet_address
       FROM portfolio_snapshots
       WHERE snapshot_date >= ?`,
      [cutoff],
    );
    if (!rows.length || !rows[0].rows.length) return [];
    return rows[0].rows
      .map((row) => String(row[0] ?? ""))
      .filter((addr) => addr.length > 0);
  } catch (err) {
    console.warn("[portfolio-snapshots] getActiveSnapshotWallets failed:", err);
    return [];
  }
}

/**
 * True when a same-UTC-day snapshot already exists for the wallet.
 * Used by the backfill cron to avoid duplicate chain RPC work.
 */
export async function hasSnapshotForToday(
  walletAddress: string,
): Promise<boolean> {
  if (!walletAddress) return false;
  const db = await getDb();
  try {
    const rows = await db.query(
      `SELECT 1 FROM portfolio_snapshots
       WHERE wallet_address = ? AND snapshot_date = ? LIMIT 1`,
      [walletAddress, utcDayKey()],
    );
    return !!rows[0]?.rows?.length;
  } catch {
    return false;
  }
}

/**
 * Prune snapshot rows older than `retentionDays` for a given wallet.
 * Caller should run this opportunistically to bound table growth.
 */
export async function pruneOldSnapshots(
  walletAddress: string,
  retentionDays = 365,
): Promise<void> {
  if (!walletAddress) return;
  const db = await getDb();
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  await db
    .execute(
      `DELETE FROM portfolio_snapshots WHERE wallet_address = ? AND snapshot_date < ?`,
      [walletAddress, utcDayKey(cutoff)],
    )
    .catch(() => {});
}
