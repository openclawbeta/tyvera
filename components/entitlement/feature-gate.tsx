"use client";

import React from "react";
import { Lock, ArrowRight } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { useEntitlement } from "@/lib/hooks/use-entitlement";
import { getMinTierForFeature, TIER_DEFINITIONS } from "@/lib/types/tiers";
import type { GatedFeature } from "@/lib/types/tiers";

/* ─────────────────────────────────────────────────────────────────── */
/* Phase 2E — FeatureGate component                                    */
/*                                                                     */
/* Wraps content that requires a specific feature entitlement.         */
/* Shows the content if the user's tier includes the feature,          */
/* otherwise renders it with a blurred lock overlay so free-tier       */
/* users can see what they're paying for.                              */
/*                                                                     */
/* Usage:                                                              */
/*   <FeatureGate feature="recommendations">                          */
/*     <RecommendationsList />                                        */
/*   </FeatureGate>                                                   */
/* ─────────────────────────────────────────────────────────────────── */

interface FeatureGateProps {
  feature: GatedFeature;
  children: React.ReactNode;
  /** Optional custom fallback instead of the blurred preview */
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

  // Locked preview — render the feature blurred with a lock overlay
  const minTier = getMinTierForFeature(feature);
  const tierDef = minTier
    ? TIER_DEFINITIONS.find((d) => d.id === minTier)
    : null;
  const tierName = tierDef?.displayName ?? "Premium";

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Blurred feature preview */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none"
        style={{ filter: "blur(6px)", opacity: 0.5 }}
      >
        {children}
      </div>

      {/* Lock overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.25)",
            boxShadow: "0 0 24px rgba(251,191,36,0.08)",
          }}
        >
          <Lock className="w-6 h-6" style={{ color: "#fbbf24" }} />
        </div>
        <p
          className="text-[15px] font-semibold text-white mb-1.5"
          style={{ letterSpacing: "-0.01em" }}
        >
          {tierName} Feature
        </p>
        <p className="text-[12px] text-slate-400 text-center max-w-xs leading-relaxed mb-4">
          Upgrade to {tierName} to unlock this feature.
        </p>
        <a
          href="/billing"
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: "linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.08) 100%)",
            border: "1px solid rgba(251,191,36,0.3)",
            color: "#fbbf24",
          }}
        >
          View Plans
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
