/* ─────────────────────────────────────────────────────────────────── */
/* Database singleton — sql.js (pure-JS SQLite)                        */
/*                                                                     */
/* Persists to data/tyvera.db on disk. The database is created and     */
/* migrated automatically on first access.                             */
/*                                                                     */
/* Usage:                                                              */
/*   import { getDb } from "@/lib/db";                                 */
/*   const db = await getDb();                                         */
/*   const rows = db.exec("SELECT * FROM subscriptions");              */
/* ─────────────────────────────────────────────────────────────────── */

import initSqlJs, { type Database } from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { SCHEMA_SQL } from "./schema";

const DB_DIR = join(process.cwd(), "data");
const DB_PATH = join(DB_DIR, "tyvera.db");

let _db: Database | null = null;
let _initPromise: Promise<Database> | null = null;

/**
 * Save the in-memory database to disk.
 * Called after every write operation.
 */
export function saveDb(): void {
  if (!_db) return;
  const data = _db.export();
  const buffer = Buffer.from(data);
  if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
  writeFileSync(DB_PATH, buffer);
}

/**
 * Get the database instance. Creates and migrates on first call.
 */
export async function getDb(): Promise<Database> {
  if (_db) return _db;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const SQL = await initSqlJs();

    if (existsSync(DB_PATH)) {
      const fileBuffer = readFileSync(DB_PATH);
      _db = new SQL.Database(fileBuffer);
    } else {
      _db = new SQL.Database();
    }

    // Run migrations (CREATE IF NOT EXISTS is safe to re-run)
    _db.run(SCHEMA_SQL);
    saveDb();

    return _db;
  })();

  return _initPromise;
}
