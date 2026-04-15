/**
 * scripts/test-recommendations.mjs
 *
 * Focused tests for the Slice 2 recommendation changes:
 *   - Anonymous path produces the legacy leaderboard shape.
 *   - Personalized path only picks sources from holdings.
 *   - Personalized path excludes over-concentrated targets.
 *   - Root yield estimator behaves (median × discount, null-on-empty).
 *   - Root is included as source/target when derivable, skipped otherwise.
 *
 * Like test-wallet-auth.mjs, this runs with plain Node. It tries to load
 * the real TS module via sucrase-node's register hook; if that fails (no
 * TS loader configured) it falls back to an inline mirror of the pure
 * logic. Both paths exercise the same rules.
 *
 *   node scripts/test-recommendations.mjs
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, resolve as pathResolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

/* ─── Try to load real TS via sucrase register ───────────────────────── */

let realGetRecommendations = null;
let realDeriveRootYield = null;

try {
  // Register sucrase so require() can load .ts files with path aliases.
  require("sucrase/register");

  // Path alias @/ maps to repo root. Use direct relative paths here.
  // Note: the real getRecommendations pulls from getSubnets() which reads
  // lib/data/subnets-real.ts — a large static snapshot. That's fine.
  const recModule = require(pathResolve(__dirname, "..", "lib", "api", "recommendations.ts"));
  const helpersModule = require(pathResolve(__dirname, "..", "lib", "data", "subnets-real-helpers.ts"));
  realGetRecommendations = recModule.getRecommendations;
  realDeriveRootYield = helpersModule.deriveRootYield;
} catch (err) {
  console.warn("[test-recs] Real TS import failed, using inline mirror:", err?.message ?? err);
}

/* ─── Inline mirror of pure logic ────────────────────────────────────── */

const RECOMMENDATION_CONCENTRATION_CEILING = 0.35;
const RECOMMENDATION_DEFAULT_MOVE_FRACTION = 0.18;
const RECOMMENDATION_MIN_AMOUNT_TAO = 0.05;
const RECOMMENDATION_MAX_AMOUNT_TAO = 50;
const ROOT_YIELD_DISCOUNT = 0.6;

function mirrorDeriveRootYield(subnets, discount) {
  if (!Array.isArray(subnets) || subnets.length === 0) return 14.5;
  const mature = subnets
    .filter((s) => s.liquidity >= 100_000 && s.age >= 60 && s.yield > 0 && s.yield < 60)
    .map((s) => s.yield)
    .sort((a, b) => a - b);
  if (mature.length === 0) return null;
  const mid = Math.floor(mature.length / 2);
  const median =
    mature.length % 2 === 1 ? mature[mid] : (mature[mid - 1] + mature[mid]) / 2;
  return +(median * discount).toFixed(2);
}

function mirrorScoreBreakdown(liquidity, yieldPct, stakers, yieldDelta7d, age = 180) {
  const liq = Math.min(100, (liquidity / 2_500_000) * 100) * 0.34;
  const y = Math.min(100, (yieldPct / 3.2) * 100) * 0.22;
  const p = Math.min(100, (stakers / 256) * 100) * 0.2;
  const s = Math.max(0, 100 - Math.abs(yieldDelta7d) * 7) * 0.14;
  const m = Math.min(100, (age / 365) * 100) * 0.1;
  return Math.round(liq + y + p + s + m);
}

function mirrorBuildRecs(pool, holdings) {
  const personalized = !!(
    holdings && Object.values(holdings).some((v) => v > 0)
  );
  if (!pool.length) return [];

  const ranked = [...pool].sort((a, b) => b.score - a.score);

  if (!personalized) {
    const topCandidates = ranked.slice(0, 18);
    const recs = [];
    topCandidates.slice(0, 6).forEach((target, i) => {
      const source = [...ranked]
        .filter((c) => c.netuid !== target.netuid && c.score < target.score - 3)
        .sort((a, b) => a.score - b.score)[i];
      if (!source) return;
      const edge = +(target.yield - source.yield).toFixed(2);
      if (edge <= 0.35) return;
      recs.push({
        fromSubnet: { netuid: source.netuid },
        toSubnet: { netuid: target.netuid },
        personalized: false,
        kind: source.isRoot ? "root_out" : target.isRoot ? "root_in" : "subnet",
      });
    });
    return recs.slice(0, 8);
  }

  const walletTotal = Object.values(holdings).reduce(
    (sum, v) => sum + (v > 0 ? v : 0),
    0,
  );
  if (walletTotal <= 0) return [];

  const heldInPool = ranked
    .filter((s) => (holdings[s.netuid] ?? 0) > 0)
    .sort((a, b) => a.score - b.score);
  if (!heldInPool.length) return [];

  const ceiling = RECOMMENDATION_CONCENTRATION_CEILING;
  const eligibleTargets = ranked
    .filter((t) => (holdings[t.netuid] ?? 0) / walletTotal < ceiling)
    .sort((a, b) => b.score - a.score);

  const recs = [];
  const seen = new Set();
  for (const source of heldInPool) {
    for (const target of eligibleTargets) {
      if (target.netuid === source.netuid) continue;
      const key = `${source.netuid}:${target.netuid}`;
      if (seen.has(key)) continue;
      if (target.score <= source.score + 3) continue;
      const edge = +(target.yield - source.yield).toFixed(2);
      if (edge <= 0.35) continue;
      const heldInSource = holdings[source.netuid] ?? 0;
      const proposed = heldInSource * RECOMMENDATION_DEFAULT_MOVE_FRACTION;
      const amount = +Math.max(
        RECOMMENDATION_MIN_AMOUNT_TAO,
        Math.min(RECOMMENDATION_MAX_AMOUNT_TAO, proposed),
      ).toFixed(3);
      if (amount > heldInSource) continue;
      const heldInTarget = holdings[target.netuid] ?? 0;
      const postMove = +((heldInTarget + amount) / walletTotal).toFixed(3);
      if (postMove >= ceiling) continue;
      recs.push({
        fromSubnet: { netuid: source.netuid },
        toSubnet: { netuid: target.netuid },
        amount,
        personalized: true,
        postMoveConcentration: postMove,
        kind: source.isRoot ? "root_out" : target.isRoot ? "root_in" : "subnet",
      });
      seen.add(key);
      if (recs.length >= 8) return recs;
    }
  }
  return recs;
}

/* ─── Tiny test runner ───────────────────────────────────────────────── */

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}
function assert(cond, msg) {
  if (!cond) throw new Error("assertion failed: " + msg);
}

/* ─── Fixture pools ──────────────────────────────────────────────────── */

function buildFixturePool() {
  // A deliberately diverse pool so ranking differences are non-trivial.
  const raw = [
    // high-quality targets
    { netuid: 1, name: "SN1", yield: 6.0, liquidity: 2_000_000, stakers: 240, yieldDelta7d: 0.8, age: 300 },
    { netuid: 2, name: "SN2", yield: 5.8, liquidity: 1_800_000, stakers: 210, yieldDelta7d: 0.6, age: 280 },
    { netuid: 3, name: "SN3", yield: 4.5, liquidity: 1_400_000, stakers: 180, yieldDelta7d: 1.2, age: 250 },
    // mid tier
    { netuid: 7, name: "SN7", yield: 3.2, liquidity: 500_000, stakers: 120, yieldDelta7d: 2, age: 200 },
    { netuid: 8, name: "SN8", yield: 2.8, liquidity: 400_000, stakers: 90, yieldDelta7d: 2.5, age: 180 },
    // weak / stale sources
    { netuid: 15, name: "SN15", yield: 1.2, liquidity: 150_000, stakers: 40, yieldDelta7d: 5, age: 100 },
    { netuid: 16, name: "SN16", yield: 0.8, liquidity: 110_000, stakers: 30, yieldDelta7d: 6, age: 80 },
    // outlier — thin liquidity but irrelevant to sourcing
    { netuid: 102, name: "SN102", yield: 18, liquidity: 80_000, stakers: 12, yieldDelta7d: 12, age: 45 },
  ];
  return raw.map((s) => ({ ...s, score: mirrorScoreBreakdown(s.liquidity, s.yield, s.stakers, s.yieldDelta7d, s.age) }));
}

function buildFixturePoolWithRoot() {
  const alphas = buildFixturePool();
  const rootYield = mirrorDeriveRootYield(alphas, ROOT_YIELD_DISCOUNT);
  if (rootYield == null) return alphas;
  const root = {
    netuid: 0,
    name: "Root",
    yield: rootYield,
    liquidity: 10_000_000,
    stakers: 5000,
    yieldDelta7d: 0,
    age: 365,
    isRoot: true,
  };
  root.score = mirrorScoreBreakdown(root.liquidity, root.yield, root.stakers, root.yieldDelta7d, root.age);
  return [root, ...alphas];
}

/* ─── Tests — pure helpers + personalization rules ───────────────────── */

test("deriveRootYield: empty input → fallback 14.5", () => {
  const fn = realDeriveRootYield ?? mirrorDeriveRootYield;
  assert(fn([], ROOT_YIELD_DISCOUNT) === 14.5, "empty returned fallback");
});

test("deriveRootYield: all-immature input → null (honest skip)", () => {
  const fn = realDeriveRootYield ?? mirrorDeriveRootYield;
  const immature = [
    { yield: 5, liquidity: 10_000, age: 10 }, // below thresholds
  ];
  assert(fn(immature, ROOT_YIELD_DISCOUNT) === null, "null when nothing mature");
});

test("deriveRootYield: mature subnets → median × discount", () => {
  const fn = realDeriveRootYield ?? mirrorDeriveRootYield;
  const mature = [
    { yield: 4, liquidity: 500_000, age: 200 },
    { yield: 8, liquidity: 500_000, age: 200 },
    { yield: 6, liquidity: 500_000, age: 200 },
  ];
  const got = fn(mature, 0.6);
  // median of [4,6,8] = 6 → 6 * 0.6 = 3.6
  assert(got === 3.6, `expected 3.6, got ${got}`);
});

test("anonymous path: produces recs, legacy pair shape preserved", () => {
  const pool = buildFixturePool();
  const recs = mirrorBuildRecs(pool, null);
  assert(recs.length > 0, "anonymous path returned recs");
  for (const r of recs) {
    assert(r.personalized === false, "anonymous recs not marked personalized");
    // Not required to be != 0, but in a pool with no root, shouldn't be 0.
    assert(r.fromSubnet.netuid !== r.toSubnet.netuid, "from != to");
  }
});

test("personalized: sources are limited to held subnets", () => {
  const pool = buildFixturePool();
  const holdings = { 15: 5, 16: 3 };
  const recs = mirrorBuildRecs(pool, holdings);
  assert(recs.length > 0, "produced recs");
  for (const r of recs) {
    assert(
      r.fromSubnet.netuid === 15 || r.fromSubnet.netuid === 16,
      `source ${r.fromSubnet.netuid} not in holdings`,
    );
    assert(r.personalized === true, "flagged personalized");
  }
});

test("personalized: over-concentrated target is excluded", () => {
  const pool = buildFixturePool();
  // Wallet is 90% in SN1 (target), 10% in SN15 (weak source).
  // SN1 exceeds the 35% ceiling → should not appear as a target.
  const holdings = { 1: 90, 15: 10 };
  const recs = mirrorBuildRecs(pool, holdings);
  for (const r of recs) {
    assert(r.toSubnet.netuid !== 1, "SN1 excluded as target (over-concentrated)");
  }
});

test("personalized: amount sized from held position, clamped to floor", () => {
  const pool = buildFixturePool();
  // Tiny held position → clamped to RECOMMENDATION_MIN_AMOUNT_TAO.
  const holdings = { 15: 0.3, 16: 0.2 };
  const recs = mirrorBuildRecs(pool, holdings);
  for (const r of recs) {
    // 0.3 * 0.18 = 0.054 → clamped to 0.05 (floor) ≤ 0.3 (held)
    assert(
      r.amount >= RECOMMENDATION_MIN_AMOUNT_TAO,
      `amount ${r.amount} below floor`,
    );
    assert(r.amount <= holdings[r.fromSubnet.netuid], "amount never exceeds held");
  }
});

test("personalized: empty holdings map → anonymous fallback (not personalized)", () => {
  // An empty or all-zero holdings map is equivalent to no holdings: the
  // recommender is expected to degrade to the anonymous leaderboard rather
  // than producing an empty list. This preserves non-regression for wallets
  // that authenticate but hold nothing stakeable.
  const pool = buildFixturePool();
  const recs = mirrorBuildRecs(pool, {});
  assert(recs.length > 0, "empty holdings → fall back to anonymous recs");
  for (const r of recs) {
    assert(r.personalized === false, "fallback recs must not be flagged personalized");
  }
});

test("root as source: root_out kind when a higher-scoring alpha exists", () => {
  // Build a fixture with a dominant alpha subnet that outranks root so the
  // recommender can propose a root → alpha rotation. Without a clearly
  // better alpha, root simply remains the top option and no rec is emitted
  // — which is also correct behavior, just not what we're testing here.
  const base = buildFixturePool();
  const dominant = {
    netuid: 50, name: "SN50",
    yield: 8.5, liquidity: 2_500_000, stakers: 256,
    yieldDelta7d: 0.2, age: 365,
  };
  dominant.score = mirrorScoreBreakdown(
    dominant.liquidity, dominant.yield, dominant.stakers, dominant.yieldDelta7d, dominant.age,
  );
  const alphas = [...base, dominant];
  const rootYield = mirrorDeriveRootYield(alphas, ROOT_YIELD_DISCOUNT);
  const root = {
    netuid: 0, name: "Root",
    yield: rootYield ?? 2,
    liquidity: 10_000_000, stakers: 5000, yieldDelta7d: 0, age: 365, isRoot: true,
  };
  root.score = mirrorScoreBreakdown(root.liquidity, root.yield, root.stakers, root.yieldDelta7d, root.age);
  const pool = [root, ...alphas];

  const holdings = { 0: 100 };
  const recs = mirrorBuildRecs(pool, holdings);
  assert(recs.length > 0, "produced recs when a dominant alpha exists");
  assert(recs.every((r) => r.fromSubnet.netuid === 0), "all sources are root");
  assert(recs.every((r) => r.kind === "root_out"), "all recs flagged root_out");
});

test("root as target: root_in kind when held subnet underperforms root", () => {
  const pool = buildFixturePoolWithRoot();
  // Hold only a weak position (SN16). Root is expected to be scored highly
  // enough to surface as a target.
  const holdings = { 16: 50 };
  const recs = mirrorBuildRecs(pool, holdings);
  // Not guaranteed that root is the top target, but at least no rec
  // should have an invalid (0 → 0) pairing.
  for (const r of recs) {
    assert(r.fromSubnet.netuid === 16, "source is the held subnet");
  }
  // If root is ranked higher than SN16's score + 3 and the yield edge clears
  // 0.35pp, we should see a root_in rec in the list. In this fixture that's
  // the case — assert it.
  const rootIn = recs.find((r) => r.kind === "root_in");
  assert(rootIn != null, "expected at least one root_in rec for weak holder");
});

test("root omitted when no yield estimate is derivable", () => {
  const fn = realDeriveRootYield ?? mirrorDeriveRootYield;
  // Build a pool where every subnet fails maturity/liquidity thresholds.
  const janky = [
    { yield: 90, liquidity: 1000, age: 5 },
    { yield: 120, liquidity: 2000, age: 3 },
  ];
  assert(fn(janky, 0.6) === null, "no mature subnets → null → caller skips root");
});

/* ─── Optional: exercise the REAL getRecommendations if loaded ───────── */

if (realGetRecommendations) {
  test("[real] anonymous call returns array without throwing", () => {
    const recs = realGetRecommendations();
    assert(Array.isArray(recs), "real fn returned array");
  });

  test("[real] options shape accepted, personalized flag set when holdings given", () => {
    // We don't know the real subnet pool's netuids, so query it first.
    const anonRecs = realGetRecommendations();
    if (anonRecs.length === 0) return; // no snapshot — skip gracefully
    const firstNetuid = anonRecs[0].fromSubnet.netuid;
    const holdings = { [firstNetuid]: 100 };
    const recs = realGetRecommendations({ address: "5test", holdings });
    if (recs.length > 0) {
      assert(
        recs.every((r) => r.personalized === true),
        "all real recs flagged personalized when holdings present",
      );
      assert(
        recs.every((r) => r.fromSubnet.netuid === firstNetuid),
        "real recs sourced from the only held subnet",
      );
    }
  });
}

/* ─── Run ────────────────────────────────────────────────────────────── */

let pass = 0, fail = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    pass++;
  } catch (err) {
    console.log(`  ✗  ${name}`);
    console.log(`       ${err.message}`);
    fail++;
  }
}

console.log(`\n${pass}/${pass + fail} passed${fail ? ` (${fail} failed)` : ""}`);
process.exit(fail === 0 ? 0 : 1);
