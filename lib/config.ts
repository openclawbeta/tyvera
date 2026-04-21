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

/* ── Recommendations ─────────────────────────────────────────────────────── */

/**
 * Ceiling for a target subnet's post-move share of the caller's wallet.
 * Targets already at or above this fraction are excluded from recommendations.
 * Personalized path only — no effect on anonymous recommendations.
 */
export const RECOMMENDATION_CONCENTRATION_CEILING = 0.35;

/**
 * Default fraction of a held position to propose moving per recommendation.
 * e.g. 0.18 = suggest reallocating 18% of what the caller holds in the source.
 */
export const RECOMMENDATION_DEFAULT_MOVE_FRACTION = 0.18;

/**
 * Minimum and maximum amount (in TAO) a personalized recommendation will
 * propose. Keeps dust moves and oversized moves out of the suggestion list.
 */
export const RECOMMENDATION_MIN_AMOUNT_TAO = 0.05;
export const RECOMMENDATION_MAX_AMOUNT_TAO = 50;

/**
 * Conservative discount applied to the median mature-subnet yield to estimate
 * root (netuid 0) yield when no chain-derived root APY is available.
 * This is intentionally lower than subnet yields because root delegation
 * typically produces less alpha per TAO than active subnet emissions.
 */
export const ROOT_YIELD_DISCOUNT = 0.6;

/** Payment intent expiry — 24 hours */
export const PAYMENT_INTENT_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** Grace period after subscription expires before full downgrade — 7 days */
export const GRACE_PERIOD_DAYS = 7;

/**
 * Minimum confirmation depth (in blocks) before a transfer is considered
 * final for payment verification. Prevents confirming on orphaned forks.
 * Bittensor block time is ~12s, so 3 blocks ≈ 36 seconds.
 */
export const PAYMENT_MIN_CONFIRMATIONS = 3;
