"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useWallet } from "@/lib/wallet-context";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

export type TierLevel = "explorer" | "analyst" | "strategist" | "institutional";

interface EntitlementCtx {
  tier: TierLevel;
  isEntitled: (feature: string) => boolean;
  refreshTier: () => void;
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

const VALID_TIERS: TierLevel[] = ["explorer", "analyst", "strategist", "institutional"];

/* ─────────────────────────────────────────────────────────────────── */
/* Context                                                              */
/* ─────────────────────────────────────────────────────────────────── */

const EntitlementContext = createContext<EntitlementCtx | null>(null);

export function EntitlementProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [tier, setTier] = useState<TierLevel>("explorer");
  const { address, walletState, getAuthHeaders } = useWallet();

  /** Fetch the user's tier from the server based on wallet address */
  const refreshTier = useCallback(async () => {
    if (!address || (walletState !== "verified" && walletState !== "pending_approval")) {
      setTier("explorer");
      return;
    }

    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetchWithTimeout(`/api/entitlement?address=${encodeURIComponent(address)}`, {
        timeoutMs: 8000,
        headers: authHeaders,
      });
      if (!res.ok) {
        setTier("explorer");
        return;
      }
      const data = await res.json();
      const serverTier = data.tier as string;

      if (serverTier && VALID_TIERS.includes(serverTier as TierLevel)) {
        setTier(serverTier as TierLevel);
      } else {
        setTier("explorer");
      }
    } catch {
      // On network error, keep current tier or default to explorer
      setTier("explorer");
    }
  }, [address, walletState, getAuthHeaders]);

  // Fetch tier when wallet connects/disconnects
  useEffect(() => {
    refreshTier();
  }, [refreshTier]);

  const isEntitled = (feature: string): boolean => {
    return TIER_FEATURES[tier]?.has(feature) ?? false;
  };

  return (
    <EntitlementContext.Provider value={{ tier, isEntitled, refreshTier }}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlementCtx(): EntitlementCtx {
  const ctx = useContext(EntitlementContext);
  if (!ctx) {
    throw new Error("useEntitlementCtx must be used inside <EntitlementProvider>");
  }
  return ctx;
}

/** @deprecated Use useEntitlementCtx instead — kept for backward compatibility */
export const useEntitlement = useEntitlementCtx;
