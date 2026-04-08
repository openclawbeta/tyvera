/* ─────────────────────────────────────────────────────────────────── */
/* Centralized configuration constants                                  */
/*                                                                     */
/* All magic numbers, cache TTLs, refresh intervals, and configurable  */
/* limits in one place. Import from here instead of scattering         */
/* literals across the codebase.                                       */
/* ─────────────────────────────────────────────────────────────────── */

/* ── Cache TTLs ──────────────────────────────────────────────────── */

/** TAO/USD rate cache — 5 minutes */
export const TAO_RATE_CACHE_TTL_MS = 5 * 60 * 1000;

/** Market data (alpha prices, volume, flows) cache — 10 minutes */
export const MARKET_DATA_CACHE_TTL_MS = 10 * 60 * 1000;

/** Subnet snapshot max age before considered stale — 10 minutes */
export const SUBNET_CACHE_TTL_MS = 10 * 60 * 1000;

/** Metagraph data cache — 5 minutes */
export const METAGRAPH_CACHE_TTL_MS = 5 * 60 * 1000;

/** Validator list cache — 10 minutes */
export const VALIDATOR_CACHE_TTL_MS = 10 * 60 * 1000;

/** Wallet auth signature window — 5 minutes */
export const AUTH_WINDOW_MS = 5 * 60 * 1000;

/* ── Refresh intervals ───────────────────────────────────────────── */

/** Ticker bar data refresh — 60 seconds */
export const TICKER_REFRESH_MS = 60_000;

/** Live ticker subnet data refresh — 5 minutes */
export const LIVE_TICKER_REFRESH_MS = 5 * 60 * 1000;

/** Alert badge unread count refresh — 60 seconds */
export const ALERT_BADGE_REFRESH_MS = 60_000;

/** Payment verification polling — 60 seconds */
export const PAYMENT_VERIFY_INTERVAL_MS = 60_000;

/* ── Limits ──────────────────────────────────────────────────────── */

/** Maximum active API keys per wallet */
export const MAX_API_KEYS_PER_WALLET = 5;

/** Maximum AI chat query results */
export const MAX_CHAT_RESULTS = 50;

/* ── Metagraph synthetic data ────────────────────────────────────── */

/** Number of validators in synthetic metagraph */
export const SYNTHETIC_VALIDATOR_COUNT = 32;

/** Number of miners in synthetic metagraph */
export const SYNTHETIC_MINER_COUNT = 224;

/* ── Subscription ────────────────────────────────────────────────── */

/** Monthly subscription duration in days */
export const MONTHLY_DURATION_DAYS = 30;

/** Annual subscription duration in days */
export const ANNUAL_DURATION_DAYS = 365;

/** Payment intent expiry — 24 hours */
export const PAYMENT_INTENT_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** Grace period after subscription expires before full downgrade — 7 days */
export const GRACE_PERIOD_DAYS = 7;
