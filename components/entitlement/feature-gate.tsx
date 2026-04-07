"use client";

import React from "react";
import { Lock } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { useEntitlement } from "@/lib/hooks/use-entitlement";
import { getMinTierForFeature, TIER_DEFINITIONS } from "@/lib/types/tiers";
import type { GatedFeature } from "@/lib/types/tiers";

/* ─────────────────────────────────────────────────────────────────── */
/* Phase 2E — FeatureGate component                                    */
/*                                                                     */
/* Wraps content that requires a specific feature entitlement.         */
/* Shows the content if the user's tier includes the feature,          */
/* otherwise shows an upgrade prompt.                                  */
/*                                                                     */
/* Usage:                                                              */
/*   <FeatureGate feature="recommendations">                          */
/*     <RecommendationsList />                                        */
/*   </FeatureGate>                                                   */
/*                                                                     */
/* NOTE: Do not gate features that still use mock data.                */
/* Build the capability first, then gate.                              */
/* ─────────────────────────────────────────────────────────────────── */

interface FeatureGateProps {
  feature: GatedFeature;
  children: React.ReactNode;
  /** Optional custom fallback instead of the default upgrade prompt */
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { walletState, address } = useWallet();
  const { hasFeature, loading } = useEntitlement(
    walletState === "disconnected" ? null : address,
  );

  // While loading, show nothing (prevents flash of locked content)
  if (loading) return null;

  // If the user has the feature, render children
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // Custom fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade prompt
  const minTier = getMinTierForFeature(feature);
  const tierDef = minTier
    ? TIER_DEFINITIONS.find((d) => d.id === minTier)
    : null;

  return (
    <div
      className="flex flex-col items-center justify-center py-16 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.018)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: "rgba(251,191,36,0.08)",
          border: "1px solid rgba(251,191,36,0.2)",
        }}
      >
        <Lock className="w-5 h-5" style={{ color: "#fbbf24" }} />
      </div>
      <p
        className="text-[15px] font-semibold text-white mb-2"
        style={{ letterSpacing: "-0.01em" }}
      >
        {tierDef ? `${tierDef.displayName} feature` : "Premium feature"}
      </p>
      <p className="text-[13px] text-slate-500 text-center max-w-xs leading-relaxed">
        {tierDef
          ? `This feature requires the ${tierDef.displayName} tier. Upgrade your subscription to unlock it.`
          : "Upgrade your subscription to unlock this feature."}
      </p>
    </div>
  );
}
