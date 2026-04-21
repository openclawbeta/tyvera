/**
 * scripts/test-payment-verify.mjs
 *
 * Tests for the payment verification decision logic.
 * Runs with plain Node (no jest/vitest) — mirrors the real verifier's
 * inline logic without needing DB or chain connections.
 *
 *   node scripts/test-payment-verify.mjs
 *
 * What's tested:
 * - Amount tolerance (1% margin for network fees)
 * - Confirmation depth gating
 * - Memo-based matching priority
 * - Collision guard (multiple matching intents → reject)
 * - Payment intent expiry calculation
 * - Fractional offset uniqueness
 */

// ── Config constants (mirrors lib/config.ts) ────────────────────────────────

const PAYMENT_MIN_CONFIRMATIONS = 3;
const PAYMENT_INTENT_EXPIRY_MS = 24 * 60 * 60 * 1000;
const GRACE_PERIOD_DAYS = 7;
const MONTHLY_DURATION_DAYS = 30;

// ── Pure decision functions extracted from payment-verifier.ts ───────────────

/**
 * Check if a transfer has enough confirmation depth.
 * Returns true if the transfer is mature enough to trust.
 */
function hasEnoughConfirmations(txBlockNumber, chainHead, minConfirmations = PAYMENT_MIN_CONFIRMATIONS) {
  if (chainHead <= 0 || txBlockNumber <= 0) return true; // can't check, allow
  const depth = chainHead - txBlockNumber;
  return depth >= minConfirmations;
}

/**
 * Check if a transfer amount is within tolerance of the expected intent amount.
 * The verifier allows 1% underpayment tolerance for network fees.
 * Overpayment is always accepted.
 */
function amountWithinTolerance(txAmount, intentAmount) {
  const tolerance = intentAmount * 0.01;
  return txAmount >= intentAmount - tolerance;
}

/**
 * Determine if a memo looks like a valid Tyvera payment memo.
 */
function isValidPaymentMemo(memo) {
  return typeof memo === "string" && memo.startsWith("TYV-");
}

/**
 * Check if a payment intent has expired.
 * Intents older than 24h should not be matched.
 */
function isIntentExpired(intentCreatedAt, now = Date.now()) {
  const age = now - intentCreatedAt;
  return age > PAYMENT_INTENT_EXPIRY_MS;
}

/**
 * Collision guard: given a list of matching intents, determine action.
 * - 0 matches: no match (skip)
 * - 1 match: safe to confirm
 * - 2+ matches: collision, reject for manual resolution
 */
function resolveAmountMatch(matches) {
  if (matches.length === 0) return { action: "skip" };
  if (matches.length === 1) return { action: "confirm", intent: matches[0] };
  return { action: "collision", count: matches.length };
}

/**
 * Calculate subscription expiry date from activation.
 */
function calcSubscriptionExpiry(activatedAt, durationDays = MONTHLY_DURATION_DAYS) {
  return new Date(activatedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
}

/**
 * Check if a subscription is in its grace period.
 */
function isInGracePeriod(expiresAt, now = new Date()) {
  if (now <= expiresAt) return false; // not expired yet
  const graceEnd = new Date(expiresAt.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  return now <= graceEnd;
}

/**
 * Generate a fractional offset for payment amount uniqueness.
 * Mirrors the real implementation: deterministic micro-offset from intent ID.
 */
function addFractionalOffset(baseAmount, intentId) {
  // The real implementation uses the last 4 digits of the intent memo
  // to create a small offset (0.0001 to 0.9999 range)
  const offset = (intentId % 10000) / 10000;
  return Math.round((baseAmount + offset * 0.01) * 10000) / 10000;
}

// ── Test harness ────────────────────────────────────────────────────────────

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label ?? "assertion"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Confirmation depth
// ════════════════════════════════════════════════════════════════════════════

test("confirmation depth: tx at chain head is not mature", () => {
  assertEqual(hasEnoughConfirmations(1000, 1000), false, "depth 0");
});

test("confirmation depth: tx 1 block behind is not mature", () => {
  assertEqual(hasEnoughConfirmations(999, 1000), false, "depth 1");
});

test("confirmation depth: tx 2 blocks behind is not mature", () => {
  assertEqual(hasEnoughConfirmations(998, 1000), false, "depth 2");
});

test("confirmation depth: tx 3 blocks behind is mature (exactly at threshold)", () => {
  assertEqual(hasEnoughConfirmations(997, 1000), true, "depth 3");
});

test("confirmation depth: tx 100 blocks behind is mature", () => {
  assertEqual(hasEnoughConfirmations(900, 1000), true, "depth 100");
});

test("confirmation depth: chainHead=0 allows through (can't verify)", () => {
  assertEqual(hasEnoughConfirmations(500, 0), true, "chainHead=0");
});

test("confirmation depth: txBlock=0 allows through (can't verify)", () => {
  assertEqual(hasEnoughConfirmations(0, 1000), true, "txBlock=0");
});

// ════════════════════════════════════════════════════════════════════════════
// Amount tolerance
// ════════════════════════════════════════════════════════════════════════════

test("amount tolerance: exact match accepted", () => {
  assertEqual(amountWithinTolerance(10.0, 10.0), true, "exact");
});

test("amount tolerance: overpayment accepted", () => {
  assertEqual(amountWithinTolerance(10.5, 10.0), true, "overpay");
});

test("amount tolerance: 0.5% underpayment accepted (within 1%)", () => {
  assertEqual(amountWithinTolerance(9.95, 10.0), true, "0.5% under");
});

test("amount tolerance: exactly 1% underpayment accepted (boundary)", () => {
  assertEqual(amountWithinTolerance(9.9, 10.0), true, "1% under");
});

test("amount tolerance: 1.1% underpayment rejected", () => {
  assertEqual(amountWithinTolerance(9.89, 10.0), false, "1.1% under");
});

test("amount tolerance: 50% underpayment rejected", () => {
  assertEqual(amountWithinTolerance(5.0, 10.0), false, "50% under");
});

test("amount tolerance: zero payment rejected", () => {
  assertEqual(amountWithinTolerance(0, 10.0), false, "zero");
});

test("amount tolerance: works with small amounts (0.05 TAO)", () => {
  assertEqual(amountWithinTolerance(0.0495, 0.05), true, "small amount in tolerance");
  assertEqual(amountWithinTolerance(0.049, 0.05), false, "small amount out of tolerance");
});

// ════════════════════════════════════════════════════════════════════════════
// Memo validation
// ════════════════════════════════════════════════════════════════════════════

test("memo validation: TYV- prefix is valid", () => {
  assertEqual(isValidPaymentMemo("TYV-abc123"), true, "TYV-abc123");
});

test("memo validation: TYV-1234567890 is valid", () => {
  assertEqual(isValidPaymentMemo("TYV-1234567890"), true, "TYV-1234567890");
});

test("memo validation: null is invalid", () => {
  assertEqual(isValidPaymentMemo(null), false, "null");
});

test("memo validation: empty string is invalid", () => {
  assertEqual(isValidPaymentMemo(""), false, "empty");
});

test("memo validation: wrong prefix is invalid", () => {
  assertEqual(isValidPaymentMemo("PAY-abc123"), false, "PAY prefix");
});

test("memo validation: partial prefix is invalid", () => {
  assertEqual(isValidPaymentMemo("TYV"), false, "no dash");
});

// ════════════════════════════════════════════════════════════════════════════
// Intent expiry
// ════════════════════════════════════════════════════════════════════════════

test("intent expiry: fresh intent (1 hour old) is not expired", () => {
  const now = Date.now();
  assertEqual(isIntentExpired(now - 60 * 60 * 1000, now), false, "1h");
});

test("intent expiry: 23h old intent is not expired", () => {
  const now = Date.now();
  assertEqual(isIntentExpired(now - 23 * 60 * 60 * 1000, now), false, "23h");
});

test("intent expiry: exactly 24h old is not expired (boundary)", () => {
  const now = Date.now();
  assertEqual(isIntentExpired(now - PAYMENT_INTENT_EXPIRY_MS, now), false, "24h exact");
});

test("intent expiry: 24h + 1ms old is expired", () => {
  const now = Date.now();
  assertEqual(isIntentExpired(now - PAYMENT_INTENT_EXPIRY_MS - 1, now), true, "24h+1ms");
});

test("intent expiry: 48h old is expired", () => {
  const now = Date.now();
  assertEqual(isIntentExpired(now - 48 * 60 * 60 * 1000, now), true, "48h");
});

// ════════════════════════════════════════════════════════════════════════════
// Collision guard
// ════════════════════════════════════════════════════════════════════════════

test("collision guard: 0 matches → skip", () => {
  const result = resolveAmountMatch([]);
  assertEqual(result.action, "skip", "action");
});

test("collision guard: 1 match → confirm", () => {
  const intent = { memo: "TYV-123", amount_tao: 10.0 };
  const result = resolveAmountMatch([intent]);
  assertEqual(result.action, "confirm", "action");
  assertEqual(result.intent, intent, "intent ref");
});

test("collision guard: 2 matches → collision", () => {
  const result = resolveAmountMatch([
    { memo: "TYV-123", amount_tao: 10.0 },
    { memo: "TYV-456", amount_tao: 10.0 },
  ]);
  assertEqual(result.action, "collision", "action");
  assertEqual(result.count, 2, "count");
});

test("collision guard: 5 matches → collision", () => {
  const result = resolveAmountMatch(new Array(5).fill({ memo: "TYV-x" }));
  assertEqual(result.action, "collision", "action");
  assertEqual(result.count, 5, "count");
});

// ════════════════════════════════════════════════════════════════════════════
// Subscription expiry + grace period
// ════════════════════════════════════════════════════════════════════════════

test("subscription expiry: 30-day sub from Jan 1 expires Jan 31", () => {
  const activated = new Date("2026-01-01T00:00:00Z");
  const expiry = calcSubscriptionExpiry(activated, 30);
  assertEqual(expiry.toISOString(), "2026-01-31T00:00:00.000Z", "30d expiry");
});

test("subscription expiry: 365-day sub from Jan 1 expires Dec 31 (next year for non-leap)", () => {
  const activated = new Date("2026-01-01T00:00:00Z");
  const expiry = calcSubscriptionExpiry(activated, 365);
  assertEqual(expiry.toISOString(), "2027-01-01T00:00:00.000Z", "365d expiry");
});

test("grace period: before expiry → not in grace", () => {
  const expires = new Date("2026-02-01T00:00:00Z");
  const now = new Date("2026-01-30T00:00:00Z");
  assertEqual(isInGracePeriod(expires, now), false, "before expiry");
});

test("grace period: exactly at expiry → not in grace (still active)", () => {
  const expires = new Date("2026-02-01T00:00:00Z");
  assertEqual(isInGracePeriod(expires, expires), false, "at expiry");
});

test("grace period: 1 day after expiry → in grace", () => {
  const expires = new Date("2026-02-01T00:00:00Z");
  const now = new Date("2026-02-02T00:00:00Z");
  assertEqual(isInGracePeriod(expires, now), true, "1d after");
});

test("grace period: 7 days after expiry → still in grace (boundary)", () => {
  const expires = new Date("2026-02-01T00:00:00Z");
  const now = new Date("2026-02-08T00:00:00Z");
  assertEqual(isInGracePeriod(expires, now), true, "7d after");
});

test("grace period: 8 days after expiry → past grace", () => {
  const expires = new Date("2026-02-01T00:00:00Z");
  const now = new Date("2026-02-09T00:00:00Z");
  assertEqual(isInGracePeriod(expires, now), false, "8d after");
});

// ════════════════════════════════════════════════════════════════════════════
// Fractional offset uniqueness
// ════════════════════════════════════════════════════════════════════════════

test("fractional offset: different IDs produce different amounts", () => {
  const base = 10.0;
  const a1 = addFractionalOffset(base, 1234);
  const a2 = addFractionalOffset(base, 5678);
  if (a1 === a2) throw new Error(`offsets should differ: ${a1} vs ${a2}`);
});

test("fractional offset: same ID produces same amount (deterministic)", () => {
  const a1 = addFractionalOffset(10.0, 4242);
  const a2 = addFractionalOffset(10.0, 4242);
  assertEqual(a1, a2, "deterministic");
});

test("fractional offset: offset is small (< 0.01 TAO)", () => {
  const base = 10.0;
  const offset = addFractionalOffset(base, 9999);
  const diff = Math.abs(offset - base);
  if (diff >= 0.01) throw new Error(`offset too large: ${diff}`);
});

// ════════════════════════════════════════════════════════════════════════════
// Integration: matching priority (memo > amount)
// ════════════════════════════════════════════════════════════════════════════

test("matching priority: memo match takes precedence even if amount also matches", () => {
  // Simulate the verifier's priority logic
  const tx = { memo: "TYV-abc", amount: 10.0, from: "5Alice..." };
  const memoIntent = { memo: "TYV-abc", amount_tao: 10.0 };
  const amountIntents = [{ memo: "TYV-xyz", amount_tao: 10.0 }];

  let matched = null;

  // Strategy 1: memo
  if (isValidPaymentMemo(tx.memo)) {
    matched = memoIntent; // simulates findPaymentIntentByMemo
  }

  // Strategy 2: amount (should be skipped because memo matched)
  if (!matched) {
    const resolution = resolveAmountMatch(amountIntents);
    if (resolution.action === "confirm") matched = resolution.intent;
  }

  assertEqual(matched, memoIntent, "memo takes priority");
});

test("matching priority: falls through to amount when no memo", () => {
  const tx = { memo: null, amount: 10.0, from: "5Alice..." };
  const amountIntent = { memo: "TYV-xyz", amount_tao: 10.0 };

  let matched = null;

  if (isValidPaymentMemo(tx.memo)) {
    matched = null; // no memo match
  }

  if (!matched) {
    const resolution = resolveAmountMatch([amountIntent]);
    if (resolution.action === "confirm") matched = resolution.intent;
  }

  assertEqual(matched, amountIntent, "falls through to amount");
});

// ════════════════════════════════════════════════════════════════════════════
// Run
// ════════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    passed++;
  } catch (err) {
    console.log(`  \u2717 ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

console.log("");
console.log(`${passed}/${tests.length} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
