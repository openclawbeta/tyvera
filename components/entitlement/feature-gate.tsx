"use client";

import React, { ReactNode } from "react";
import { useEntitlement } from "@/components/entitlement/entitlement-context";
import Link from "next/link";

export type TierLevel = "explorer" | "analyst" | "strategist" | "institutional";

interface FeatureGateProps {
  feature: string;
  requiredTier?: TierLevel;
  children: ReactNode;
}

/**
 * FeatureGate component that conditionally renders content based on user's tier.
 * When user's tier is below the required tier, renders content blurred with a lock overlay.
 */
export function FeatureGate({ feature, requiredTier = "analyst", children }: FeatureGateProps): React.JSX.Element {
  const { tier, isEntitled } = useEntitlement();
  const hasAccess = isEntitled(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div
        className="w-full"
        style={{
          filter: "blur(6px)",
          opacity: 0.5,
          pointerEvents: "none",
        }}
      >
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 text-center max-w-sm">
          <div className="mb-4">
            <svg
              className="w-12 h-12 mx-auto text-slate-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">
            {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} Plan Required
          </h3>

          <p className="text-sm text-slate-400 mb-6">
            This feature requires a {requiredTier} plan or higher.
            Your current plan is <span className="font-medium text-slate-300">{tier}</span>.
          </p>

          <Link
            href="/pricing"
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            View Plans
          </Link>
        </div>
      </div>
    </div>
  );
}
