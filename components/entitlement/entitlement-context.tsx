"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type TierLevel = "explorer" | "analyst" | "strategist" | "institutional";

interface EntitlementCtx {
  tier: TierLevel;
  isEntitled: (feature: string) => boolean;
}

/**
 * Map of features and which tiers have access to them.
 * Extend this as new tiers/features are added.
 */
const TIER_FEATURES: Record<TierLevel, Set<string>> = {
  explorer: new Set([
    "view-dashboard",
    "view-recommendations",
    "view-watchlist",
    "basic-analytics",
  ]),
  analyst: new Set([
    "view-dashboard",
    "view-recommendations",
    "view-watchlist",
    "advanced-analytics",
    "portfolio-tracking",
    "custom-alerts",
  ]),
  strategist: new Set([
    "view-dashboard",
    "view-recommendations",
    "view-watchlist",
    "advanced-analytics",
    "portfolio-tracking",
    "custom-alerts",
    "api-access",
    "priority-support",
  ]),
  institutional: new Set([
    "view-dashboard",
    "view-recommendations",
    "view-watchlist",
    "advanced-analytics",
    "portfolio-tracking",
    "custom-alerts",
    "api-access",
    "priority-support",
    "white-label",
    "dedicated-manager",
  ]),
};

/* ─────────────────────────────────────────────────────────────────── */
/* Context                                                              */
/* ─────────────────────────────────────────────────────────────────── */

const EntitlementContext = createContext<EntitlementCtx | null>(null);

export function EntitlementProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [tier, setTier] = useState<TierLevel>("explorer");

  // Load tier from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTier = localStorage.getItem("tyvera_tier");
      if (savedTier && ["explorer", "analyst", "strategist", "institutional"].includes(savedTier)) {
        setTier(savedTier as TierLevel);
      }
    }
  }, []);

  const isEntitled = (feature: string): boolean => {
    return TIER_FEATURES[tier]?.has(feature) ?? false;
  };

  return (
    <EntitlementContext.Provider value={{ tier, isEntitled }}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlement(): EntitlementCtx {
  const ctx = useContext(EntitlementContext);
  if (!ctx) {
    throw new Error("useEntitlement must be used inside <EntitlementProvider>");
  }
  return ctx;
}
