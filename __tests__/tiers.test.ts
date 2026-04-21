/**
 * Unit tests for the tier/entitlement system.
 *
 * Verifies tier normalization, feature gating, rate limits,
 * and the tier hierarchy — the foundation of the subscription model.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeTier,
  tierHasFeature,
  getMinTierForFeature,
  getApiRateLimit,
  getTierForPlan,
  TIER_DEFINITIONS,
} from "@/lib/types/tiers";
import {
  getAlertRuleQuota,
  getChatQueryLimit,
} from "@/lib/api/require-entitlement";

describe("normalizeTier", () => {
  it("passes through valid tier names", () => {
    expect(normalizeTier("explorer")).toBe("explorer");
    expect(normalizeTier("analyst")).toBe("analyst");
    expect(normalizeTier("strategist")).toBe("strategist");
    expect(normalizeTier("institutional")).toBe("institutional");
  });

  it("maps legacy tier names", () => {
    expect(normalizeTier("basic")).toBe("explorer");
    expect(normalizeTier("silver")).toBe("analyst");
    expect(normalizeTier("gold")).toBe("strategist");
    expect(normalizeTier("platinum")).toBe("institutional");
  });

  it("defaults unknown tiers to explorer", () => {
    expect(normalizeTier("nonexistent")).toBe("explorer");
    expect(normalizeTier("")).toBe("explorer");
  });
});

describe("tierHasFeature", () => {
  it("explorer has basic features", () => {
    expect(tierHasFeature("explorer", "subnet_list")).toBe(true);
    expect(tierHasFeature("explorer", "subnet_detail")).toBe(true);
    expect(tierHasFeature("explorer", "ai_intel")).toBe(true);
  });

  it("explorer lacks premium features", () => {
    expect(tierHasFeature("explorer", "recommendations")).toBe(false);
    expect(tierHasFeature("explorer", "api_access")).toBe(false);
    expect(tierHasFeature("explorer", "webhooks")).toBe(false);
    expect(tierHasFeature("explorer", "team_access")).toBe(false);
  });

  it("analyst has data export but not unlimited", () => {
    expect(tierHasFeature("analyst", "data_export")).toBe(true);
    expect(tierHasFeature("analyst", "data_export_unlimited")).toBe(false);
  });

  it("strategist has API access but not unlimited", () => {
    expect(tierHasFeature("strategist", "api_access")).toBe(true);
    expect(tierHasFeature("strategist", "api_unlimited")).toBe(false);
  });

  it("institutional has everything", () => {
    expect(tierHasFeature("institutional", "webhooks")).toBe(true);
    expect(tierHasFeature("institutional", "team_access")).toBe(true);
    expect(tierHasFeature("institutional", "whitelabel")).toBe(true);
    expect(tierHasFeature("institutional", "api_unlimited")).toBe(true);
  });
});

describe("getMinTierForFeature", () => {
  it("subnet_list is available from explorer", () => {
    expect(getMinTierForFeature("subnet_list")).toBe("explorer");
  });

  it("recommendations requires strategist", () => {
    expect(getMinTierForFeature("recommendations")).toBe("strategist");
  });

  it("webhooks requires institutional", () => {
    expect(getMinTierForFeature("webhooks")).toBe("institutional");
  });
});

describe("getApiRateLimit", () => {
  it("explorer and analyst have no API access", () => {
    expect(getApiRateLimit("explorer")).toBe(0);
    expect(getApiRateLimit("analyst")).toBe(0);
  });

  it("strategist has 1000 requests/day", () => {
    expect(getApiRateLimit("strategist")).toBe(1000);
  });

  it("institutional has unlimited", () => {
    expect(getApiRateLimit("institutional")).toBe(-1);
  });
});

describe("getTierForPlan", () => {
  it("maps plan IDs to tiers", () => {
    expect(getTierForPlan("ANALYST")).toBe("analyst");
    expect(getTierForPlan("PRO_SILVER")).toBe("analyst");
    expect(getTierForPlan("STRATEGIST")).toBe("strategist");
    expect(getTierForPlan("INSTITUTIONAL")).toBe("institutional");
  });

  it("defaults to explorer for unknown plans", () => {
    expect(getTierForPlan("UNKNOWN")).toBe("explorer");
    expect(getTierForPlan(null)).toBe("explorer");
  });
});

describe("getAlertRuleQuota", () => {
  it("explorer gets 0 alerts", () => {
    expect(getAlertRuleQuota("explorer")).toBe(0);
  });

  it("analyst gets 5 alerts", () => {
    expect(getAlertRuleQuota("analyst")).toBe(5);
  });

  it("strategist gets unlimited", () => {
    expect(getAlertRuleQuota("strategist")).toBe(-1);
  });
});

describe("getChatQueryLimit", () => {
  it("explorer gets 3 queries", () => {
    expect(getChatQueryLimit("explorer")).toBe(3);
  });

  it("analyst gets 25 queries", () => {
    expect(getChatQueryLimit("analyst")).toBe(25);
  });

  it("strategist gets unlimited", () => {
    expect(getChatQueryLimit("strategist")).toBe(-1);
  });
});

describe("TIER_DEFINITIONS integrity", () => {
  it("has exactly 4 tiers", () => {
    expect(TIER_DEFINITIONS).toHaveLength(4);
  });

  it("tiers are in ascending price order", () => {
    const prices = TIER_DEFINITIONS.map((t) => t.monthlyPrice);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it("each tier has at least one planId", () => {
    for (const tier of TIER_DEFINITIONS) {
      expect(tier.planIds.length).toBeGreaterThan(0);
    }
  });

  it("higher tiers have superset features of lower tiers", () => {
    // Each tier should include all features of lower tiers
    for (let i = 1; i < TIER_DEFINITIONS.length; i++) {
      const current = new Set(TIER_DEFINITIONS[i].features);
      const previous = TIER_DEFINITIONS[i - 1].features;
      for (const feat of previous) {
        expect(current.has(feat)).toBe(true);
      }
    }
  });
});
