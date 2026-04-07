"use client";

import { useState, useEffect } from "react";
import type { Tier } from "@/lib/types/tiers";
import { tierHasFeature } from "@/lib/types/tiers";
import type { GatedFeature } from "@/lib/types/tiers";

/* ─────────────────────────────────────────────────────────────────── */
/* Phase 2E — useEntitlement hook                                      */
/*                                                                     */
/* Fetches the current wallet's entitlement from /api/entitlement      */
/* and provides helper methods for feature gating.                     */
/* ─────────────────────────────────────────────────────────────────── */

interface EntitlementState {
  tier: Tier;
  plan: string | null;
  status: "active" | "grace" | "expired" | "none";
  expiresAt: string | null;
  daysRemaining: number | null;
  loading: boolean;
  /** Check if the current entitlement grants access to a feature */
  hasFeature: (feature: GatedFeature) => boolean;
}

const DEFAULT_STATE: EntitlementState = {
  tier: "explorer",
  plan: null,
  status: "none",
  expiresAt: null,
  daysRemaining: null,
  loading: false,
  hasFeature: (feature: GatedFeature) => tierHasFeature("explorer", feature),
};

export function useEntitlement(address: string | null): EntitlementState {
  const [state, setState] = useState<EntitlementState>(DEFAULT_STATE);

  useEffect(() => {
    if (!address) {
      setState(DEFAULT_STATE);
      return;
    }

    let cancelled = false;

    setState((prev) => ({ ...prev, loading: true }));

    fetch(`/api/entitlement?address=${encodeURIComponent(address)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Entitlement fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const tier: Tier = data.tier ?? "explorer";
        setState({
          tier,
          plan: data.plan ?? null,
          status: data.status ?? "none",
          expiresAt: data.expiresAt ?? null,
          daysRemaining: data.daysRemaining ?? null,
          loading: false,
          hasFeature: (feature: GatedFeature) => tierHasFeature(tier, feature),
        });
      })
      .catch(() => {
        if (cancelled) return;
        // On error, default to explorer tier (fail-open for free features)
        setState(DEFAULT_STATE);
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  return state;
}
