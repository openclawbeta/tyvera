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
    billing_cycle   TEXT NOT NULL DEFAULT 'monthly',  -- 'monthly' or 'annual'
    duration_days   INTEGER NOT NULL DEFAULT 30,
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

  -- Alert rules: user-configured thresholds per wallet
  CREATE TABLE IF NOT EXISTS alert_rules (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address  TEXT    NOT NULL,
    alert_type      TEXT    NOT NULL,           -- yield_drop, yield_spike, emission_change, validator_take,
                                                -- dereg_risk, liquidity_drop, risk_change,
                                                -- whale_inflow, whale_outflow, coldkey_swap,
                                                -- tao_price_above, tao_price_below, alpha_price_change
    subnet_filter   TEXT,                       -- NULL = all staked subnets, or comma-separated netuids
    threshold       REAL    NOT NULL,           -- percentage or absolute value depending on type
    enabled         INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_ar_wallet ON alert_rules(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_ar_type ON alert_rules(alert_type);

  -- Alerts: fired alert instances per wallet
  CREATE TABLE IF NOT EXISTS alerts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address  TEXT    NOT NULL,
    rule_id         INTEGER,                   -- FK to alert_rules (NULL for system-generated)
    alert_type      TEXT    NOT NULL,
    severity        TEXT    NOT NULL DEFAULT 'info',  -- info, warning, critical
    title           TEXT    NOT NULL,
    message         TEXT    NOT NULL,
    metadata        TEXT,                      -- JSON: netuid, old_value, new_value, tx_hash, etc.
    read            INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_alerts_wallet ON alerts(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(wallet_address, read);
  CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);

  -- Chain events: persisted on-chain activity (transfers, stakes, etc.)
  -- Populated by the transfer-scanner during cron/sync-chain.
  -- Survives cold starts — the in-memory buffer is a hot cache only.
  CREATE TABLE IF NOT EXISTS chain_events (
    id              TEXT PRIMARY KEY,
    block_number    INTEGER NOT NULL,
    timestamp       TEXT    NOT NULL,
    type            TEXT    NOT NULL,
    from_address    TEXT    NOT NULL,
    to_address      TEXT    NOT NULL,
    amount_tao      REAL    NOT NULL DEFAULT 0,
    fee             REAL    NOT NULL DEFAULT 0,
    subnet          TEXT,
    memo            TEXT,
    tx_hash         TEXT    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'CONFIRMED',
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_ce_from ON chain_events(from_address, block_number DESC);
  CREATE INDEX IF NOT EXISTS idx_ce_to ON chain_events(to_address, block_number DESC);
  CREATE INDEX IF NOT EXISTS idx_ce_block ON chain_events(block_number DESC);

  -- Cron run log: records each cron job execution for observability.
  -- Used by /api/health to detect stale or failing cron jobs.
  CREATE TABLE IF NOT EXISTS cron_runs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    job_name        TEXT    NOT NULL,
    started_at      TEXT    NOT NULL,
    duration_ms     INTEGER,
    status          TEXT    NOT NULL,
    result_json     TEXT,
    error_message   TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_cron_runs_job ON cron_runs(job_name, started_at DESC);
`;
