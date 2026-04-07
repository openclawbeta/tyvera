/* ─────────────────────────────────────────────────────────────────── */
/* Phase 3 — Tier definitions & feature flags                          */
/* ─────────────────────────────────────────────────────────────────── */

export type Tier = "explorer" | "pro" | "operator";

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
  | "data_export"
  | "api_access"
  | "priority_support"
  | "backtesting";

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
    id: "explorer",
    displayName: "Explorer",
    description: "Discovery layer — free for all connected wallets",
    features: [
      "subnet_list",
      "subnet_detail",
      "portfolio_basic",
    ],
    planIds: ["FREE"],
  },
  {
    id: "pro",
    displayName: "Pro",
    description: "Decision-support layer — requires active Premium subscription",
    features: [
      "subnet_list",
      "subnet_detail",
      "subnet_compare",
      "recommendations",
      "portfolio_basic",
      "portfolio_analytics",
      "yield_chart",
      "data_export",
      "priority_support",
    ],
    planIds: ["PREMIUM_MONTHLY", "PREMIUM_QUARTERLY", "PREMIUM_ANNUAL"],
  },
  {
    id: "operator",
    displayName: "Operator",
    description: "Execution layer — advanced workflow for power users",
    features: [
      "subnet_list",
      "subnet_detail",
      "subnet_compare",
      "recommendations",
      "portfolio_basic",
      "portfolio_analytics",
      "reallocation",
      "yield_chart",
      "data_export",
      "api_access",
      "priority_support",
      "backtesting",
    ],
    planIds: [], // not yet available for purchase
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
export function tierHasFeature(tier: Tier, feature: GatedFeature): boolean {
  const def = TIER_DEFINITIONS.find((d) => d.id === tier);
  return def ? def.features.includes(feature) : false;
}

/**
 * Get the minimum tier required for a feature.
 * Returns null if no tier grants this feature (shouldn't happen).
 */
export function getMinTierForFeature(feature: GatedFeature): Tier | null {
  const order: Tier[] = ["explorer", "pro", "operator"];
  for (const tier of order) {
    if (tierHasFeature(tier, feature)) return tier;
  }
  return null;
}
