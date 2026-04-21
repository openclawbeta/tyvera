/* ─────────────────────────────────────────────────────────────────── */
/* Phase 3 — Tier definitions & feature flags                          */
/* ─────────────────────────────────────────────────────────────────── */

export type Tier = "explorer" | "analyst" | "strategist" | "institutional";

/** Legacy tier aliases — maps old names used in DB to new tier IDs */
const LEGACY_MAP: Record<string, Tier> = {
  basic: "explorer",
  silver: "analyst",
  gold: "strategist",
  platinum: "institutional",
};

export function normalizeTier(raw: string): Tier {
  if (raw in LEGACY_MAP) return LEGACY_MAP[raw];
  if (["explorer", "analyst", "strategist", "institutional"].includes(raw)) return raw as Tier;
  return "explorer";
}

/** Features that can be gated behind a tier */
export type GatedFeature =
  | "subnet_list"
  | "subnet_list_full"
  | "subnet_detail"
  | "subnet_cards"
  | "subnet_heatmap"
  | "subnet_categories"
  | "subnet_compare"
  | "network_alerts"
  | "validators_full"
  | "validator_grid"
  | "recommendations"
  | "guardrails"
  | "portfolio_basic"
  | "portfolio_analytics"
  | "reallocation"
  | "yield_chart"
  | "yield_full"
  | "ai_intel"
  | "ai_intel_25"
  | "ai_intel_unlimited"
  | "history_30d"
  | "history_all"
  | "data_export"
  | "data_export_unlimited"
  | "alerts_basic"
  | "alerts_unlimited"
  | "alert_presets"
  | "watchlists"
  | "api_access"
  | "api_unlimited"
  | "webhooks"
  | "team_access"
  | "whitelabel"
  | "priority_support"
  | "early_access"
  | "backtesting"
  | "backtesting_all"
  | "tax_real"
  | "tax_export";

export interface TierDefinition {
  id: Tier;
  displayName: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: GatedFeature[];
  planIds: string[];
  apiRateLimit: number; // requests per day, 0 = no access
}

/** Tier config — single source of truth for what each tier unlocks */
export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    id: "explorer",
    displayName: "Explorer",
    description: "Free — browse subnets and public metrics",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "subnet_list",
      "subnet_detail",
      "portfolio_basic",
      "yield_chart",
      "ai_intel",
      "backtesting",
    ],
    planIds: ["FREE"],
    apiRateLimit: 0,
  },
  {
    id: "analyst",
    displayName: "Analyst",
    description: "Full data access for active stakers",
    monthlyPrice: 19.99,
    annualPrice: 191.90,
    features: [
      "subnet_list",
      "subnet_list_full",
      "subnet_detail",
      "subnet_cards",
      "subnet_heatmap",
      "subnet_categories",
      "validators_full",
      "validator_grid",
      "portfolio_basic",
      "portfolio_analytics",
      "yield_chart",
      "yield_full",
      "ai_intel",
      "ai_intel_25",
      "history_30d",
      "data_export",
      "alerts_basic",
      "backtesting",
      "backtesting_all",
      "tax_real",
      "tax_export",
    ],
    planIds: ["ANALYST", "PRO_SILVER"],
    apiRateLimit: 0,
  },
  {
    id: "strategist",
    displayName: "Strategist",
    description: "AI-powered edge for power users",
    monthlyPrice: 49.99,
    annualPrice: 479.90,
    features: [
      "subnet_list",
      "subnet_list_full",
      "subnet_detail",
      "subnet_cards",
      "subnet_heatmap",
      "subnet_categories",
      "subnet_compare",
      "network_alerts",
      "validators_full",
      "validator_grid",
      "recommendations",
      "guardrails",
      "portfolio_basic",
      "portfolio_analytics",
      "reallocation",
      "yield_chart",
      "yield_full",
      "ai_intel",
      "ai_intel_25",
      "ai_intel_unlimited",
      "history_30d",
      "history_all",
      "data_export",
      "data_export_unlimited",
      "alerts_basic",
      "alerts_unlimited",
      "alert_presets",
      "watchlists",
      "api_access",
      "backtesting",
      "backtesting_all",
      "tax_real",
      "tax_export",
    ],
    planIds: ["STRATEGIST", "PRO_GOLD"],
    apiRateLimit: 1000,
  },
  {
    id: "institutional",
    displayName: "Institutional",
    description: "For funds, DAOs, and subnet teams",
    monthlyPrice: 99.99,
    annualPrice: 959.90,
    features: [
      "subnet_list",
      "subnet_list_full",
      "subnet_detail",
      "subnet_cards",
      "subnet_heatmap",
      "subnet_categories",
      "subnet_compare",
      "network_alerts",
      "validators_full",
      "validator_grid",
      "recommendations",
      "guardrails",
      "portfolio_basic",
      "portfolio_analytics",
      "reallocation",
      "yield_chart",
      "yield_full",
      "ai_intel",
      "ai_intel_25",
      "ai_intel_unlimited",
      "history_30d",
      "history_all",
      "data_export",
      "data_export_unlimited",
      "alerts_basic",
      "alerts_unlimited",
      "alert_presets",
      "watchlists",
      "api_access",
      "api_unlimited",
      "webhooks",
      "team_access",
      "whitelabel",
      "priority_support",
      "early_access",
      "backtesting",
      "backtesting_all",
      "tax_real",
      "tax_export",
    ],
    planIds: ["INSTITUTIONAL", "PRO_PLATINUM"],
    apiRateLimit: -1, // unlimited
  },
];

/**
 * Resolve which tier a plan ID maps to.
 * Returns "explorer" as the default for unknown/free plans.
 */
export function getTierForPlan(planId: string | null): Tier {
  if (!planId) return "explorer";
  for (const def of TIER_DEFINITIONS) {
    if (def.planIds.includes(planId)) return def.id;
  }
  return "explorer";
}

/**
 * Check whether a tier grants access to a specific feature.
 */
export function tierHasFeature(tier: Tier | string, feature: GatedFeature): boolean {
  const normalized = normalizeTier(tier as string);
  const def = TIER_DEFINITIONS.find((d) => d.id === normalized);
  return def ? def.features.includes(feature) : false;
}

/**
 * Get the minimum tier required for a feature.
 * Returns null if no tier grants this feature.
 */
export function getMinTierForFeature(feature: GatedFeature): Tier | null {
  const order: Tier[] = ["explorer", "analyst", "strategist", "institutional"];
  for (const tier of order) {
    if (tierHasFeature(tier, feature)) return tier;
  }
  return null;
}

/**
 * Get the API rate limit for a tier (requests per day).
 * Returns 0 for no access, -1 for unlimited.
 */
export function getApiRateLimit(tier: Tier | string): number {
  const normalized = normalizeTier(tier as string);
  const def = TIER_DEFINITIONS.find((d) => d.id === normalized);
  return def?.apiRateLimit ?? 0;
}

/** Ordered tier hierarchy for upgrade comparisons */
export const TIER_ORDER: Tier[] = ["explorer", "analyst", "strategist", "institutional"];

/**
 * Human-readable labels for every gated feature. Used wherever we show
 * feature lists to end users (billing page, upgrade prompts, tier cards).
 */
export const FEATURE_LABELS: Record<GatedFeature, string> = {
  subnet_list: "Subnet explorer (top 50)",
  subnet_list_full: "Full subnet list (128+)",
  subnet_detail: "Subnet detail pages",
  subnet_cards: "Card and heatmap views",
  subnet_heatmap: "Subnet heatmap",
  subnet_categories: "Category filtering",
  subnet_compare: "Side-by-side subnet comparison",
  network_alerts: "Network-wide alerts",
  validators_full: "Full validator analytics",
  validator_grid: "Validator grid view",
  recommendations: "AI reallocation recommendations",
  guardrails: "Risk guardrails",
  portfolio_basic: "Portfolio overview",
  portfolio_analytics: "Portfolio analytics & history",
  reallocation: "One-click reallocation",
  yield_chart: "Yield chart (basic)",
  yield_full: "Full yield analytics",
  ai_intel: "Tyvera AI (5 questions/day)",
  ai_intel_25: "Tyvera AI (25 questions/day)",
  ai_intel_unlimited: "Tyvera AI (unlimited)",
  history_30d: "30-day history",
  history_all: "Unlimited history",
  data_export: "CSV data export",
  data_export_unlimited: "Unlimited data exports",
  alerts_basic: "Smart alerts (5 active)",
  alerts_unlimited: "Unlimited smart alerts",
  alert_presets: "Alert presets",
  watchlists: "Watchlists",
  api_access: "API access (1,000 req/day)",
  api_unlimited: "Unlimited API access",
  webhooks: "Webhook integrations",
  team_access: "Team seat management",
  whitelabel: "White-label branding",
  priority_support: "Priority support",
  early_access: "Early access to new features",
  backtesting: "Backtesting (7-day history)",
  backtesting_all: "Full-history backtesting",
  tax_real: "On-chain tax events",
  tax_export: "Tax report CSV export",
};

/** Resolve a tier definition by id. */
export function getTierDefinition(tier: Tier | string): TierDefinition | undefined {
  const normalized = normalizeTier(tier as string);
  return TIER_DEFINITIONS.find((d) => d.id === normalized);
}

/** Next tier above the given one, or null if already at the top. */
export function getNextTier(tier: Tier | string): Tier | null {
  const normalized = normalizeTier(tier as string);
  const idx = TIER_ORDER.indexOf(normalized);
  if (idx < 0 || idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}
