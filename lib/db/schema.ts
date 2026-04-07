/* ─────────────────────────────────────────────────────────────────── */
/* SQLite database schema for Tyvera subscriptions                     */
/*                                                                     */
/* Uses sql.js (pure-JS SQLite) for portability.                       */
/* Database file: data/tyvera.db (gitignored)                          */
/* ─────────────────────────────────────────────────────────────────── */

export const SCHEMA_SQL = `
  -- Subscriptions: active, expired, and cancelled plans per wallet
  CREATE TABLE IF NOT EXISTS subscriptions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT    NOT NULL,
    plan_id       TEXT    NOT NULL,           -- PRO_SILVER, PRO_GOLD, PRO_PLATINUM
    tier          TEXT    NOT NULL,           -- silver, gold, platinum
    status        TEXT    NOT NULL DEFAULT 'active',  -- active, expired, cancelled, grace
    amount_tao    REAL    NOT NULL DEFAULT 0,
    tx_hash       TEXT,
    memo          TEXT,
    activated_at  TEXT    NOT NULL,           -- ISO 8601
    expires_at    TEXT    NOT NULL,           -- ISO 8601
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sub_wallet ON subscriptions(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_sub_status ON subscriptions(status);
  CREATE INDEX IF NOT EXISTS idx_sub_expires ON subscriptions(expires_at);

  -- Payment intents: tracks pending and completed payments
  CREATE TABLE IF NOT EXISTS payment_intents (
    id              TEXT PRIMARY KEY,
    wallet_address  TEXT NOT NULL,
    plan_id         TEXT NOT NULL,
    amount_tao      REAL NOT NULL,
    memo            TEXT NOT NULL UNIQUE,      -- unique memo for matching transfers
    status          TEXT NOT NULL DEFAULT 'awaiting_payment',
    tx_hash         TEXT,
    confirmations   INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at      TEXT NOT NULL,
    confirmed_at    TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_pi_memo ON payment_intents(memo);
  CREATE INDEX IF NOT EXISTS idx_pi_wallet ON payment_intents(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_pi_status ON payment_intents(status);

  -- Admin overrides: manual subscription grants
  CREATE TABLE IF NOT EXISTS admin_overrides (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address  TEXT NOT NULL,
    plan_id         TEXT NOT NULL,
    tier            TEXT NOT NULL,
    reason          TEXT,
    granted_by      TEXT NOT NULL DEFAULT 'admin',
    expires_at      TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_ao_wallet ON admin_overrides(wallet_address);

  -- API keys: developer access keys tied to wallet subscriptions
  CREATE TABLE IF NOT EXISTS api_keys (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash        TEXT    NOT NULL UNIQUE,     -- SHA-256 hash of the key (never store plaintext)
    key_prefix      TEXT    NOT NULL,            -- first 8 chars for display (tyv_xxxxxxxx)
    wallet_address  TEXT    NOT NULL,
    label           TEXT    NOT NULL DEFAULT 'default',
    tier            TEXT    NOT NULL,            -- tier at time of creation
    status          TEXT    NOT NULL DEFAULT 'active',  -- active, revoked
    requests_today  INTEGER NOT NULL DEFAULT 0,
    last_used_at    TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    revoked_at      TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_ak_hash ON api_keys(key_hash);
  CREATE INDEX IF NOT EXISTS idx_ak_wallet ON api_keys(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_ak_status ON api_keys(status);
`;
