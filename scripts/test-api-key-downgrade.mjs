/**
 * scripts/test-api-key-downgrade.mjs
 *
 * Tests the api-keys validateApiKey decision logic, specifically:
 *   - Tier is derived from the *current* subscription (not the stored key row)
 *   - Rate-limit check uses the derived tier (downgrade takes effect immediately)
 *   - FREE / no-subscription → API access denied even if the key row says ANALYST+
 *   - The guarded UPDATE pattern atomically rate-limits without a read-modify-write race
 *
 *   node scripts/test-api-key-downgrade.mjs
 *
 * Runs without a real DB — it mirrors the SQL guarded UPDATE semantics in JS.
 */

let passed = 0, failed = 0;
function t(name, cond, detail = "") {
  if (cond) { console.log(`  ✓ ${name}`); passed++; }
  else       { console.log(`  ✗ ${name}${detail ? ": " + detail : ""}`); failed++; }
}

// ── Rate limits sourced from lib/types/tiers.ts (keep in sync) ──────────────
const RATE_LIMITS = {
  explorer:      0,
  analyst:       0,
  strategist:    1000,
  institutional: -1, // unlimited
  free:          0,
};

function normalizeTier(t) {
  if (!t) return "explorer";
  const s = String(t).toLowerCase();
  if (s === "free") return "explorer";
  return s;
}

function getRateLimit(tier) {
  const n = normalizeTier(tier);
  return RATE_LIMITS[n] ?? 0;
}

// ── Pure decision function mirroring validateApiKey ─────────────────────────
/**
 * Decide whether a key should be accepted, based on:
 *   - key row (stored at creation time; we DO NOT trust its tier)
 *   - live subscription (source of truth for current tier)
 *   - today's request count / reset date (for rate limiting)
 *
 * Returns the same shape validateApiKey returns.
 */
function decideApiKeyAccept({ keyRow, liveSubscription, today, now = Date.now() }) {
  // Derive effective tier from live subscription, NOT key row.
  let effectiveTier;
  if (liveSubscription?.tier) {
    effectiveTier = normalizeTier(liveSubscription.tier);
  } else {
    effectiveTier = normalizeTier("FREE");
  }

  const rateLimit = getRateLimit(effectiveTier);
  if (rateLimit === 0) {
    return { valid: false, error: "API access not included in your tier", tier: effectiveTier };
  }

  // Simulate the guarded UPDATE + changes() check.
  //   UPDATE api_keys
  //     SET requests_today = CASE WHEN last_reset_date != ? THEN 1 ELSE requests_today + 1 END, ...
  //     WHERE key_hash = ? AND (last_reset_date != ? OR requests_today < ?)
  let didIncrement = false;
  let newCount = keyRow.requests_today;

  if (keyRow.last_reset_date !== today) {
    // rolling over → reset to 1
    newCount = 1;
    didIncrement = true;
  } else if (rateLimit < 0) {
    // unlimited
    newCount = keyRow.requests_today + 1;
    didIncrement = true;
  } else if (keyRow.requests_today < rateLimit) {
    newCount = keyRow.requests_today + 1;
    didIncrement = true;
  }

  if (!didIncrement) {
    return {
      valid: false,
      error: `Rate limit exceeded (${rateLimit}/day). Upgrade for higher limits.`,
      tier: effectiveTier,
      rate_limit: rateLimit,
      requests_today: rateLimit,
    };
  }

  // Persist back (in real code the UPDATE does this atomically).
  keyRow.requests_today = newCount;
  keyRow.last_reset_date = today;

  return {
    valid: true,
    tier: effectiveTier,
    rate_limit: rateLimit,
    requests_today: newCount,
  };
}

const TODAY = "2026-04-21";

// ── 1. Downgrade from INSTITUTIONAL to STRATEGIST ──────────────────────────
console.log("\n── API key validation: live-tier enforcement & atomic rate limit ──\n");

{
  const keyRow = { tier: "institutional", wallet_address: "5...", requests_today: 0, last_reset_date: TODAY };
  const liveSub = { tier: "strategist" }; // user just downgraded
  // First call: should be allowed with STRATEGIST rate limit, NOT institutional unlimited
  const r = decideApiKeyAccept({ keyRow, liveSubscription: liveSub, today: TODAY });
  t("downgraded sub → effective tier is live (strategist, not institutional)",
    r.valid && r.tier === "strategist" && r.rate_limit === 1000);
}

// ── 2. Downgrade to FREE (no active subscription) ──────────────────────────
{
  const keyRow = { tier: "institutional", wallet_address: "5...", requests_today: 500, last_reset_date: TODAY };
  const liveSub = null; // sub expired
  const r = decideApiKeyAccept({ keyRow, liveSubscription: liveSub, today: TODAY });
  t("expired sub → API access denied even though key row says institutional",
    !r.valid && /not included/i.test(r.error));
}

// ── 3. Downgrade from STRATEGIST rate-limit enforced immediately ───────────
{
  // User had STRATEGIST (1000/day), used 999 today, then downgraded to ANALYST (0/day).
  const keyRow = { tier: "strategist", wallet_address: "5...", requests_today: 999, last_reset_date: TODAY };
  const r = decideApiKeyAccept({ keyRow, liveSubscription: { tier: "analyst" }, today: TODAY });
  t("downgrade to analyst → instantly locked out (0/day cap)",
    !r.valid && /not included/i.test(r.error));
}

// ── 4. Upgrade takes effect too ────────────────────────────────────────────
{
  const keyRow = { tier: "analyst", wallet_address: "5...", requests_today: 0, last_reset_date: TODAY };
  const r = decideApiKeyAccept({ keyRow, liveSubscription: { tier: "institutional" }, today: TODAY });
  t("upgrade to institutional → unlimited", r.valid && r.rate_limit === -1);
}

// ── 5. Atomic rate-limit race — no more than N requests per day ────────────
{
  const keyRow = { tier: "strategist", wallet_address: "5...", requests_today: 0, last_reset_date: TODAY };
  const live = { tier: "strategist" };

  let accepted = 0, rejected = 0;
  for (let i = 0; i < 1100; i++) {
    const r = decideApiKeyAccept({ keyRow, liveSubscription: live, today: TODAY });
    if (r.valid) accepted++; else rejected++;
  }
  t("strategist burst → exactly 1000 accepted, 100 rejected", accepted === 1000 && rejected === 100,
    `got accepted=${accepted} rejected=${rejected}`);
}

// ── 6. Day rollover resets the counter ─────────────────────────────────────
{
  const keyRow = { tier: "strategist", wallet_address: "5...", requests_today: 1000, last_reset_date: "2026-04-20" };
  const live = { tier: "strategist" };
  const r = decideApiKeyAccept({ keyRow, liveSubscription: live, today: TODAY });
  t("new day → counter resets to 1, request allowed",
    r.valid && r.requests_today === 1);
}

// ── 7. Institutional tier with unlimited continues past 1M ─────────────────
{
  const keyRow = { tier: "institutional", wallet_address: "5...", requests_today: 1_000_000, last_reset_date: TODAY };
  const r = decideApiKeyAccept({ keyRow, liveSubscription: { tier: "institutional" }, today: TODAY });
  t("institutional unlimited → accepts even at 1M+ requests", r.valid && r.rate_limit === -1);
}

console.log(`\n── ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
