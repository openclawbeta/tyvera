/* ─────────────────────────────────────────────────────────────────── */
/* Database layer — Turso (libsql) for production, sql.js for local   */
/*                                                                     */
/* When TURSO_DATABASE_URL is set, connects to Turso's edge SQLite     */
/* (persistent, globally replicated). Otherwise falls back to local    */
/* sql.js (in-memory, no persistence across serverless cold starts).   */
/*                                                                     */
/* Exports a thin abstraction so consumers don't need to know which    */
/* backend is in use. Both expose:                                     */
/*   query(sql, params)  → { columns: string[], rows: any[][] }        */
/*   execute(sql, params) → void                                       */
/* ─────────────────────────────────────────────────────────────────── */

import { SCHEMA_SQL } from "./schema";

async function addColumnIfMissing(
  db: DbClient,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const info = await db.query(`PRAGMA table_info(${table})`);
  const existing = new Set(
    (info[0]?.rows ?? []).map((row) => String(row[1])),
  );

  if (existing.has(column)) return;

  console.log(`[db] Adding missing column ${table}.${column}`);
  await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

/* ── Shared interface ────────────────────────────────────────────── */

export interface QueryResult {
  columns: string[];
  rows: any[][];
}

export interface DbClient {
  query(sql: string, params?: any[]): Promise<QueryResult[]>;
  execute(sql: string, params?: any[]): Promise<void>;
}

/* ── Turso (libsql) backend ──────────────────────────────────────── */

async function createTursoClient(): Promise<DbClient> {
  const { createClient } = await import("@libsql/client");

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  return {
    async query(sql: string, params: any[] = []): Promise<QueryResult[]> {
      const result = await client.execute({ sql, args: params });
      if (!result.columns.length) return [];
      return [
        {
          columns: result.columns,
          rows: result.rows.map((row) =>
            result.columns.map((col) => (row as any)[col]),
          ),
        },
      ];
    },
    async execute(sql: string, params: any[] = []): Promise<void> {
      await client.execute({ sql, args: params });
    },
  };
}

/* ── sql.js (local fallback) backend ─────────────────────────────── */

async function createSqlJsClient(): Promise<DbClient> {
  const initSqlJs = (await import("sql.js")).default;
  const { readFileSync, writeFileSync, existsSync, mkdirSync } = await import("fs");
  const { join } = await import("path");

  const DB_DIR = join(process.cwd(), "data");
  const DB_PATH = join(DB_DIR, "tyvera.db");

  const SQL = await initSqlJs();

  let db: any;
  if (existsSync(DB_PATH)) {
    db = new SQL.Database(readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  function persist() {
    const data = db.export();
    const buffer = Buffer.from(data);
    if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
    writeFileSync(DB_PATH, buffer);
  }

  return {
    async query(sql: string, params: any[] = []): Promise<QueryResult[]> {
      return db.exec(sql, params);
    },
    async execute(sql: string, params: any[] = []): Promise<void> {
      db.run(sql, params);
      persist();
    },
  };
}

/* ── Singleton ───────────────────────────────────────────────────── */

let _client: DbClient | null = null;
let _initPromise: Promise<DbClient> | null = null;

/**
 * Get the database client. Creates and migrates on first call.
 * Uses Turso when TURSO_DATABASE_URL is set, sql.js otherwise.
 */
export async function getDb(): Promise<DbClient> {
  if (_client) return _client;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const useTurso = !!process.env.TURSO_DATABASE_URL;

    if (useTurso) {
      console.log("[db] Using Turso (libsql) database");
      _client = await createTursoClient();
    } else {
      console.log("[db] Using local sql.js database (no TURSO_DATABASE_URL set)");
      _client = await createSqlJsClient();
    }

    // Run schema migrations (CREATE IF NOT EXISTS is idempotent)
    // Split on semicolons and run each statement separately for Turso compatibility
    const statements = SCHEMA_SQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await _client.execute(stmt);
    }

    // Backward-compatible column migrations for previously created tables.
    await addColumnIfMissing(_client, "payment_intents", "billing_cycle", "TEXT NOT NULL DEFAULT 'monthly'");
    await addColumnIfMissing(_client, "payment_intents", "duration_days", "INTEGER NOT NULL DEFAULT 30");

    return _client;
  })();

  return _initPromise;
}

/**
 * @deprecated Use db.execute() instead. Kept for backward compatibility.
 */
export function saveDb(): void {
  // No-op — Turso persists automatically, sql.js persists on execute()
}
