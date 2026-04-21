/* ─────────────────────────────────────────────────────────────────── */
/* Chain events — DB CRUD for persisted on-chain activity              */
/*                                                                     */
/* Used by the transfer-scanner to persist events across cold starts   */
/* and by /api/activity to serve durable transaction history.          */
/* ─────────────────────────────────────────────────────────────────── */

import { getDb } from "./index";
import type { ChainEvent } from "@/lib/chain/transfer-scanner";

/* ── Write ─────────────────────────────────────────────────────────── */

/**
 * Persist an array of chain events to the database.
 * Uses INSERT OR IGNORE to skip duplicates (keyed on `id`).
 * Returns the count of newly inserted rows.
 */
export async function persistChainEvents(events: ChainEvent[]): Promise<number> {
  if (events.length === 0) return 0;

  const db = await getDb();
  let inserted = 0;

  for (const e of events) {
    try {
      await db.execute(
        `INSERT OR IGNORE INTO chain_events
         (id, block_number, timestamp, type, from_address, to_address, amount_tao, fee, subnet, tx_hash, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          e.id,
          e.blockNumber,
          e.timestamp,
          e.type,
          e.fromAddress,
          e.toAddress,
          e.amountTao,
          e.fee,
          e.subnet ?? null,
          e.txHash,
          e.status,
        ],
      );
      inserted++;
    } catch (err) {
      // Duplicate key or constraint violation — skip silently.
      // Other errors bubble.
      const msg = String(err);
      if (msg.includes("UNIQUE") || msg.includes("constraint")) continue;
      console.warn("[chain-events] Insert error:", err);
    }
  }

  return inserted;
}

/* ── Read ──────────────────────────────────────────────────────────── */

/**
 * Query chain events for a given address (as sender or receiver).
 * Returns paginated results sorted by block number descending.
 */
export async function queryChainEvents(
  address: string,
  page = 1,
  limit = 50,
): Promise<{ events: ChainEvent[]; total: number }> {
  const db = await getDb();
  const offset = (page - 1) * limit;

  // Count total matching events
  const countRows = await db.query(
    `SELECT COUNT(*) as cnt FROM chain_events
     WHERE from_address = ? OR to_address = ?`,
    [address, address],
  );
  const total = Number(countRows[0]?.rows?.[0]?.[0] ?? 0);

  if (total === 0) return { events: [], total: 0 };

  // Fetch page
  const rows = await db.query(
    `SELECT id, block_number, timestamp, type, from_address, to_address,
            amount_tao, fee, subnet, tx_hash, status
     FROM chain_events
     WHERE from_address = ? OR to_address = ?
     ORDER BY block_number DESC
     LIMIT ? OFFSET ?`,
    [address, address, limit, offset],
  );

  const events: ChainEvent[] = (rows[0]?.rows ?? []).map((row: any[]) => ({
    id: String(row[0]),
    blockNumber: Number(row[1]),
    timestamp: String(row[2]),
    type: String(row[3]) as ChainEvent["type"],
    fromAddress: String(row[4]),
    toAddress: String(row[5]),
    amountTao: Number(row[6]),
    fee: Number(row[7]),
    subnet: row[8] ? String(row[8]) : undefined,
    txHash: String(row[9]),
    status: String(row[10]) as ChainEvent["status"],
  }));

  return { events, total };
}

/**
 * Get the highest block number stored in the DB.
 * Used to seed the in-memory scanner's starting point after a cold start.
 */
export async function getLastPersistedBlock(): Promise<number> {
  const db = await getDb();
  const rows = await db.query(
    `SELECT MAX(block_number) FROM chain_events`,
  );
  return Number(rows[0]?.rows?.[0]?.[0] ?? 0);
}

/**
 * Get count of persisted events.
 */
export async function getPersistedEventCount(): Promise<number> {
  const db = await getDb();
  const rows = await db.query(`SELECT COUNT(*) FROM chain_events`);
  return Number(rows[0]?.rows?.[0]?.[0] ?? 0);
}
