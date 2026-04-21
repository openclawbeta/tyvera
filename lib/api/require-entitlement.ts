/**
 * lib/api/require-entitlement.ts
 *
 * Server-side entitlement gate for API routes.
 *
 * Checks the wallet's subscription tier against a required GatedFeature.
 * Returns { tier, allowed } on success, or a 403 NextResponse on denial.
 *
 * Usage:
 *   const gate = await checkEntitlement(address, "recommendations");
 *   if (gate.denied) return gate.denied;
 *   // gate.tier is now available
 */

import { NextResponse } from "next/server";
import { getEntitlement } from "@/lib/db/subscriptions";
import {
  normalizeTier,
  tierHasFeature,
  getMinTierForFeature,
  getApiRateLimit,
  TIER_DEFINITIONS,
  type Tier,
  type GatedFeature,
} from "@/lib/types/tiers";

export interface EntitlementGateResult {
  tier: Tier;
  allowed: true;
  denied?: undefined;
}

export interface EntitlementDeniedResult {
  tier: Tier;
  allowed: false;
  denied: NextResponse;
}

export type EntitlementCheckResult = EntitlementGateResult | EntitlementDeniedResult;

/**
 * Resolve the wallet's current tier from the DB.
 * Returns "explorer" on DB failure (fail-open for free features).
 */
export async function resolveWalletTier(address: string): Promise<Tier> {
  try {
    const ent = await getEntitlement(address);
    if (ent) return normalizeTier(ent.tier);
  } catch (err) {
    console.error("[entitlement-gate] DB error resolving tier:", err);
  }
  return "explorer";
}

/**
 * Check if a wallet has access to a specific feature.
 * Returns allowed: true with the resolved tier, or denied with a 403 response.
 */
export async function checkEntitlement(
  address: string | null,
  feature: GatedFeature,
): Promise<EntitlementCheckResult> {
  if (!address) {
    const minTier = getMinTierForFeature(feature);
    const minDef = minTier ? TIER_DEFINITIONS.find((d) => d.id === minTier) : null;
    return {
      tier: "explorer",
      allowed: false,
      denied: NextResponse.json(
        {
          error: "Authentication required",
          requiredTier: minTier,
          upgrade: minDef ? `${minDef.displayName} ($${minDef.monthlyPrice}/mo)` : undefined,
        },
        { status: 401 },
      ),
    };
  }

  const tier = await resolveWalletTier(address);

  if (tierHasFeature(tier, feature)) {
    return { tier, allowed: true };
  }

  const minTier = getMinTierForFeature(feature);
  const minDef = minTier ? TIER_DEFINITIONS.find((d) => d.id === minTier) : null;

  return {
    tier,
    allowed: false,
    denied: NextResponse.json(
      {
        error: "Upgrade required",
        currentTier: tier,
        requiredTier: minTier,
        feature,
        upgrade: minDef
          ? `Upgrade to ${minDef.displayName} ($${minDef.monthlyPrice}/mo) to access this feature`
          : undefined,
      },
      { status: 403 },
    ),
  };
}

/**
 * Get the alert rule quota for a tier.
 * Explorer: 0 (no alerts), Analyst: 5 (alerts_basic), Strategist+: unlimited (alerts_unlimited).
 */
export function getAlertRuleQuota(tier: Tier): number {
  if (tierHasFeature(tier, "alerts_unlimited")) return -1; // unlimited
  if (tierHasFeature(tier, "alerts_basic")) return 5;
  return 0;
}

/**
 * Get the daily AI chat query limit for a tier.
 * Explorer: 3 (ai_intel), Analyst: 25 (ai_intel_25), Strategist+: unlimited (ai_intel_unlimited).
 */
export function getChatQueryLimit(tier: Tier): number {
  if (tierHasFeature(tier, "ai_intel_unlimited")) return -1; // unlimited
  if (tierHasFeature(tier, "ai_intel_25")) return 25;
  if (tierHasFeature(tier, "ai_intel")) return 3;
  return 0;
}

/**
 * Get the activity history cutoff for a tier.
 * Explorer: 0 (no history), Analyst: 30 days, Strategist+: all time.
 */
export function getHistoryCutoffDays(tier: Tier): number {
  if (tierHasFeature(tier, "history_all")) return -1; // all time
  if (tierHasFeature(tier, "history_30d")) return 30;
  return 0; // no access
}
