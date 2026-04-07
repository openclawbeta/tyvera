/* ─────────────────────────────────────────────────────────────────── */
/* Phase 3 — Tier definitions & feature flags                          */
/* ─────────────────────────────────────────────────────────────────── */

export type Tier = "basic" | "silver" | "gold" | "platinum";

/** Features that can be gated behind a tier */
export type GatedFeature =
  | "subnet_list"
  | "subnet_detail"
  | "subnet_compare"
  | "recommendations"
  | "portfolio_basic"
  | "portfolio_analytics"
  | "reallocation"
  | "yield_chart"
  | "history_30d"
  | "history_90d"
  | "history_365d"
  | "data_export"
  | "alerts"
  | "watchlists"
  | "api_access"
  | "priority_support"
  | "backtesting"
  | "tax_export";

export interface TierDefinition {
  id: Tier;
  displayName: string;
  description: string;
  features: GatedFeature[];
  planIds: string[]; // maps to billing plan IDs that grant this tier
}

/** Tier config — single source of truth for what each tier unlocks */
export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    id: "basic",
    displayName: "Basic",
    description: "Free for all users — browse subnets and basic portfolio",
    features: [
      "subnet_list",
      "subnet_detail",
      "portfolio_basic",
    ],
    planIds: ["FREE"],
  },
  {
    id: "silver",
    displayName: "Pro Silver",
    description: "Decision-support — compare, recommendations, 30-day history",
    features: [
      "subnet_list",
      "subnet_detail",
      "subnet_compare",
      "recommendations",
      "portfolio_basic",
      "portfolio_analytics",
      "yield_chart",
      "history_30d",
      "data_export",
    ],
    planIds: ["PRO_SILVER"],
  },
  {
    id: "gold",
    displayName: "Pro Gold",
    description: "Active management — alerts, reallocation, 90-day history",
    features: [
      "subnet_list",
      "subnet_detail",
      "subnet_compare",
      "recommendations",
      "portfolio_basic",
      "portfolio_analytics",
      "reallocation",
      "yield_chart",
      "history_30d",
      "history_90d",
      "data_export",
      "alerts",
      "watchlists",
      "priority_support",
    ],
    planIds: ["PRO_GOLD"],
  },
  {
    id: "platinum",
    displayName: "Pro Platinum",
    description: "Power user — API, backtesting, full history, tax export",
    features: [
      "subnet_list",
      "subnet_detail",
      "subnet_compare",
      "recommendations",
      "portfolio_basic",
      "portfolio_analytics",
      "reallocation",
      "yield_chart",
      "history_30d",
      "history_90d",
      "history_365d",
      "data_export",
      "alerts",
      "watchlists",
      "api_access",
      "priority_support",
      "backtesting",
      "tax_export",
    ],
    planIds: ["PRO_PLATINUM"],
  },
];

/**
 * Resolve which tier a plan ID maps to.
 * Returns "basic" as the default for unknown/free plans.
 */
export function getTierForPlan(planId: string | null): Tier {
  if (!planId) return "basic";
  for (const def of TIER_DEFINITIONS) {
    if (def.planIds.includes(planId)) return def.id;
  }
  return "basic";
}

/**
 * Check whether a tier grants access to a specific feature.
 */
export function tierHasFeature(tier: Tier, feature: GatedFeature): boolean {
  const def = TIER_DEFINITIONS.find((d) => d.id === tier);
  return def ? def.features.includes(feature) : false;
}

/**
 * Get the minimum tier required for a feature.
 * Returns null if no tier grants this feature.
 */
export function getMinTierForFeature(feature: GatedFeature): Tier | null {
  const order: Tier[] = ["basic", "silver", "gold", "platinum"];
  for (const tier of order) {
    if (tierHasFeature(tier, feature)) return tier;
  }
  return null;
}
