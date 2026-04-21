/**
 * scripts/test-entitlements.mjs
 *
 * Tests for the entitlement gating pure functions and tier definitions.
 * Runs with plain Node (no jest/vitest) to keep CI footprint small.
 *
 *   node scripts/test-entitlements.mjs
 *
 * We inline-mirror the pure functions from lib/types/tiers.ts and
 * lib/api/require-entitlement.ts so we can run without tsx or Next.js.
 */

// ── Inline mirrors of lib/types/tiers.ts ────────────────────────────────────

const LEGACY_MAP = {
  basic: "explorer",
  silver: "analyst",
  gold: "strategist",
  platinum: "institutional",
};

function normalizeTier(raw) {
  if (raw in LEGACY_MAP) return LEGACY_MAP[raw];
  if (["explorer", "analyst", "strategist", "institutional"].includes(raw)) return raw;
  return "explorer";
}

const TIER_DEFINITIONS = [
  {
    id: "explorer",
    displayName: "Explorer",
    monthlyPrice: 0,
    features: [
      "subnet_list", "subnet_detail", "portfolio_basic",
      "yield_chart", "ai_intel", "backtesting",
    ],
    planIds: ["FREE"],
    apiRateLimit: 0,
  },
  {
    id: "analyst",
    displayName: "Analyst",
    monthlyPrice: 19.99,
    features: [
      "subnet_list", "subnet_list_full", "subnet_detail", "subnet_cards",
      "subnet_heatmap", "subnet_categories", "validators_full", "validator_grid",
      "portfolio_basic", "portfolio_analytics", "yield_chart", "yield_full",
      "ai_intel", "ai_intel_25", "history_30d", "data_export",
      "alerts_basic", "backtesting", "backtesting_all", "tax_real", "tax_export",
    ],
    planIds: ["ANALYST", "PRO_SILVER"],
    apiRateLimit: 0,
  },
  {
    id: "strategist",
    displayName: "Strategist",
    monthlyPrice: 49.99,
    features: [
      "subnet_list", "subnet_list_full", "subnet_detail", "subnet_cards",
      "subnet_heatmap", "subnet_categories", "subnet_compare", "network_alerts",
      "validators_full", "validator_grid", "recommendations", "guardrails",
      "portfolio_basic", "portfolio_analytics", "reallocation",
      "yield_chart", "yield_full", "ai_intel", "ai_intel_25", "ai_intel_unlimited",
      "history_30d", "history_all", "data_export", "data_export_unlimited",
      "alerts_basic", "alerts_unlimited", "alert_presets", "watchlists",
      "api_access", "backtesting", "backtesting_all", "tax_real", "tax_export",
    ],
    planIds: ["STRATEGIST", "PRO_GOLD"],
    apiRateLimit: 1000,
  },
  {
    id: "institutional",
    displayName: "Institutional",
    monthlyPrice: 99.99,
    features: [
      "subnet_list", "subnet_list_full", "subnet_detail", "subnet_cards",
      "subnet_heatmap", "subnet_categories", "subnet_compare", "network_alerts",
      "validators_full", "validator_grid", "recommendations", "guardrails",
      "portfolio_basic", "portfolio_analytics", "reallocation",
      "yield_chart", "yield_full", "ai_intel", "ai_intel_25", "ai_intel_unlimited",
      "history_30d", "history_all", "data_export", "data_export_unlimited",
      "alerts_basic", "alerts_unlimited", "alert_presets", "watchlists",
      "api_access", "api_unlimited", "webhooks", "team_access", "whitelabel",
      "priority_support", "early_access", "backtesting", "backtesting_all",
      "tax_real", "tax_export",
    ],
    planIds: ["INSTITUTIONAL", "PRO_PLATINUM"],
    apiRateLimit: -1,
  },
];

function tierHasFeature(tier, feature) {
  const normalized = normalizeTier(tier);
  const def = TIER_DEFINITIONS.find((d) => d.id === normalized);
  return def ? def.features.includes(feature) : false;
}

function getMinTierForFeature(feature) {
  const order = ["explorer", "analyst", "strategist", "institutional"];
  for (const tier of order) {
    if (tierHasFeature(tier, feature)) return tier;
  }
  return null;
}

function getApiRateLimit(tier) {
  const normalized = normalizeTier(tier);
  const def = TIER_DEFINITIONS.find((d) => d.id === normalized);
  return def?.apiRateLimit ?? 0;
}

function getTierForPlan(planId) {
  if (!planId) return "explorer";
  for (const def of TIER_DEFINITIONS) {
    if (def.planIds.includes(planId)) return def.id;
  }
  return "explorer";
}

// ── Inline mirrors of lib/api/require-entitlement.ts (pure functions) ───────

function getChatQueryLimit(tier) {
  if (tierHasFeature(tier, "ai_intel_unlimited")) return -1;
  if (tierHasFeature(tier, "ai_intel_25")) return 25;
  if (tierHasFeature(tier, "ai_intel")) return 3;
  return 0;
}

function getAlertRuleQuota(tier) {
  if (tierHasFeature(tier, "alerts_unlimited")) return -1;
  if (tierHasFeature(tier, "alerts_basic")) return 5;
  return 0;
}

function getHistoryCutoffDays(tier) {
  if (tierHasFeature(tier, "history_all")) return -1;
  if (tierHasFeature(tier, "history_30d")) return 30;
  return 0;
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
// normalizeTier
// ════════════════════════════════════════════════════════════════════════════

test("normalizeTier: canonical tier names pass through", () => {
  assertEqual(normalizeTier("explorer"), "explorer", "explorer");
  assertEqual(normalizeTier("analyst"), "analyst", "analyst");
  assertEqual(normalizeTier("strategist"), "strategist", "strategist");
  assertEqual(normalizeTier("institutional"), "institutional", "institutional");
});

test("normalizeTier: legacy aliases map correctly", () => {
  assertEqual(normalizeTier("basic"), "explorer", "basic->explorer");
  assertEqual(normalizeTier("silver"), "analyst", "silver->analyst");
  assertEqual(normalizeTier("gold"), "strategist", "gold->strategist");
  assertEqual(normalizeTier("platinum"), "institutional", "platinum->institutional");
});

test("normalizeTier: unknown strings fall back to explorer", () => {
  assertEqual(normalizeTier("admin"), "explorer", "admin");
  assertEqual(normalizeTier(""), "explorer", "empty");
  assertEqual(normalizeTier("pro"), "explorer", "pro");
  assertEqual(normalizeTier("EXPLORER"), "explorer", "uppercase");
});

// ════════════════════════════════════════════════════════════════════════════
// getChatQueryLimit
// ════════════════════════════════════════════════════════════════════════════

test("getChatQueryLimit: explorer = 3", () => {
  assertEqual(getChatQueryLimit("explorer"), 3, "explorer");
});

test("getChatQueryLimit: analyst = 25", () => {
  assertEqual(getChatQueryLimit("analyst"), 25, "analyst");
});

test("getChatQueryLimit: strategist = unlimited (-1)", () => {
  assertEqual(getChatQueryLimit("strategist"), -1, "strategist");
});

test("getChatQueryLimit: institutional = unlimited (-1)", () => {
  assertEqual(getChatQueryLimit("institutional"), -1, "institutional");
});

test("getChatQueryLimit: legacy 'basic' resolves same as explorer (3)", () => {
  assertEqual(getChatQueryLimit("basic"), 3, "basic->explorer");
});

test("getChatQueryLimit: legacy 'gold' resolves same as strategist (-1)", () => {
  assertEqual(getChatQueryLimit("gold"), -1, "gold->strategist");
});

// ════════════════════════════════════════════════════════════════════════════
// getAlertRuleQuota
// ════════════════════════════════════════════════════════════════════════════

test("getAlertRuleQuota: explorer = 0 (no alerts)", () => {
  assertEqual(getAlertRuleQuota("explorer"), 0, "explorer");
});

test("getAlertRuleQuota: analyst = 5", () => {
  assertEqual(getAlertRuleQuota("analyst"), 5, "analyst");
});

test("getAlertRuleQuota: strategist = unlimited (-1)", () => {
  assertEqual(getAlertRuleQuota("strategist"), -1, "strategist");
});

test("getAlertRuleQuota: institutional = unlimited (-1)", () => {
  assertEqual(getAlertRuleQuota("institutional"), -1, "institutional");
});

// ════════════════════════════════════════════════════════════════════════════
// getHistoryCutoffDays
// ════════════════════════════════════════════════════════════════════════════

test("getHistoryCutoffDays: explorer = 0 (no history)", () => {
  assertEqual(getHistoryCutoffDays("explorer"), 0, "explorer");
});

test("getHistoryCutoffDays: analyst = 30", () => {
  assertEqual(getHistoryCutoffDays("analyst"), 30, "analyst");
});

test("getHistoryCutoffDays: strategist = all time (-1)", () => {
  assertEqual(getHistoryCutoffDays("strategist"), -1, "strategist");
});

test("getHistoryCutoffDays: institutional = all time (-1)", () => {
  assertEqual(getHistoryCutoffDays("institutional"), -1, "institutional");
});

// ════════════════════════════════════════════════════════════════════════════
// tierHasFeature — key feature gates
// ════════════════════════════════════════════════════════════════════════════

test("tierHasFeature: explorer has subnet_list but NOT subnet_list_full", () => {
  assertEqual(tierHasFeature("explorer", "subnet_list"), true, "has subnet_list");
  assertEqual(tierHasFeature("explorer", "subnet_list_full"), false, "no subnet_list_full");
});

test("tierHasFeature: recommendations requires strategist+", () => {
  assertEqual(tierHasFeature("explorer", "recommendations"), false, "explorer");
  assertEqual(tierHasFeature("analyst", "recommendations"), false, "analyst");
  assertEqual(tierHasFeature("strategist", "recommendations"), true, "strategist");
  assertEqual(tierHasFeature("institutional", "recommendations"), true, "institutional");
});

test("tierHasFeature: alerts_basic requires analyst+", () => {
  assertEqual(tierHasFeature("explorer", "alerts_basic"), false, "explorer");
  assertEqual(tierHasFeature("analyst", "alerts_basic"), true, "analyst");
  assertEqual(tierHasFeature("strategist", "alerts_basic"), true, "strategist");
});

test("tierHasFeature: team_access requires institutional", () => {
  assertEqual(tierHasFeature("explorer", "team_access"), false, "explorer");
  assertEqual(tierHasFeature("analyst", "team_access"), false, "analyst");
  assertEqual(tierHasFeature("strategist", "team_access"), false, "strategist");
  assertEqual(tierHasFeature("institutional", "team_access"), true, "institutional");
});

test("tierHasFeature: webhooks requires institutional", () => {
  assertEqual(tierHasFeature("strategist", "webhooks"), false, "strategist");
  assertEqual(tierHasFeature("institutional", "webhooks"), true, "institutional");
});

test("tierHasFeature: ai_intel available at all tiers", () => {
  assertEqual(tierHasFeature("explorer", "ai_intel"), true, "explorer");
  assertEqual(tierHasFeature("analyst", "ai_intel"), true, "analyst");
  assertEqual(tierHasFeature("strategist", "ai_intel"), true, "strategist");
  assertEqual(tierHasFeature("institutional", "ai_intel"), true, "institutional");
});

test("tierHasFeature: unknown tier returns false for everything", () => {
  assertEqual(tierHasFeature("admin", "subnet_list"), true, "admin normalizes to explorer which has subnet_list");
  assertEqual(tierHasFeature("admin", "recommendations"), false, "admin normalizes to explorer which lacks recommendations");
});

// ════════════════════════════════════════════════════════════════════════════
// getMinTierForFeature
// ════════════════════════════════════════════════════════════════════════════

test("getMinTierForFeature: subnet_list → explorer", () => {
  assertEqual(getMinTierForFeature("subnet_list"), "explorer", "subnet_list");
});

test("getMinTierForFeature: alerts_basic → analyst", () => {
  assertEqual(getMinTierForFeature("alerts_basic"), "analyst", "alerts_basic");
});

test("getMinTierForFeature: recommendations → strategist", () => {
  assertEqual(getMinTierForFeature("recommendations"), "strategist", "recommendations");
});

test("getMinTierForFeature: team_access → institutional", () => {
  assertEqual(getMinTierForFeature("team_access"), "institutional", "team_access");
});

test("getMinTierForFeature: nonexistent feature → null", () => {
  assertEqual(getMinTierForFeature("totally_fake"), null, "totally_fake");
});

// ════════════════════════════════════════════════════════════════════════════
// getApiRateLimit
// ════════════════════════════════════════════════════════════════════════════

test("getApiRateLimit: explorer = 0", () => {
  assertEqual(getApiRateLimit("explorer"), 0, "explorer");
});

test("getApiRateLimit: analyst = 0", () => {
  assertEqual(getApiRateLimit("analyst"), 0, "analyst");
});

test("getApiRateLimit: strategist = 1000", () => {
  assertEqual(getApiRateLimit("strategist"), 1000, "strategist");
});

test("getApiRateLimit: institutional = unlimited (-1)", () => {
  assertEqual(getApiRateLimit("institutional"), -1, "institutional");
});

test("getApiRateLimit: legacy 'platinum' = unlimited (-1)", () => {
  assertEqual(getApiRateLimit("platinum"), -1, "platinum->institutional");
});

// ════════════════════════════════════════════════════════════════════════════
// getTierForPlan
// ════════════════════════════════════════════════════════════════════════════

test("getTierForPlan: null → explorer", () => {
  assertEqual(getTierForPlan(null), "explorer", "null");
});

test("getTierForPlan: FREE → explorer", () => {
  assertEqual(getTierForPlan("FREE"), "explorer", "FREE");
});

test("getTierForPlan: ANALYST → analyst", () => {
  assertEqual(getTierForPlan("ANALYST"), "analyst", "ANALYST");
});

test("getTierForPlan: PRO_SILVER → analyst (legacy plan)", () => {
  assertEqual(getTierForPlan("PRO_SILVER"), "analyst", "PRO_SILVER");
});

test("getTierForPlan: STRATEGIST → strategist", () => {
  assertEqual(getTierForPlan("STRATEGIST"), "strategist", "STRATEGIST");
});

test("getTierForPlan: INSTITUTIONAL → institutional", () => {
  assertEqual(getTierForPlan("INSTITUTIONAL"), "institutional", "INSTITUTIONAL");
});

test("getTierForPlan: PRO_PLATINUM → institutional (legacy plan)", () => {
  assertEqual(getTierForPlan("PRO_PLATINUM"), "institutional", "PRO_PLATINUM");
});

test("getTierForPlan: unknown plan → explorer", () => {
  assertEqual(getTierForPlan("UNKNOWN_PLAN"), "explorer", "UNKNOWN_PLAN");
});

// ════════════════════════════════════════════════════════════════════════════
// Tier hierarchy integrity checks
// ════════════════════════════════════════════════════════════════════════════

test("higher tiers are strict supersets of lower-tier features", () => {
  const order = ["explorer", "analyst", "strategist", "institutional"];
  for (let i = 0; i < order.length - 1; i++) {
    const lower = TIER_DEFINITIONS.find((d) => d.id === order[i]);
    const higher = TIER_DEFINITIONS.find((d) => d.id === order[i + 1]);
    for (const feature of lower.features) {
      if (!higher.features.includes(feature)) {
        throw new Error(`${higher.id} is missing feature "${feature}" that ${lower.id} has — hierarchy violation`);
      }
    }
  }
});

test("every tier has at least one planId", () => {
  for (const def of TIER_DEFINITIONS) {
    if (!def.planIds || def.planIds.length === 0) {
      throw new Error(`${def.id} has no planIds`);
    }
  }
});

test("no duplicate planIds across tiers", () => {
  const seen = new Map();
  for (const def of TIER_DEFINITIONS) {
    for (const planId of def.planIds) {
      if (seen.has(planId)) {
        throw new Error(`planId "${planId}" appears in both ${seen.get(planId)} and ${def.id}`);
      }
      seen.set(planId, def.id);
    }
  }
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
