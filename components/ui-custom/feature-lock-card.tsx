/**
 * components/ui-custom/feature-lock-card.tsx
 *
 * Drop-in replacement for the terse "X tier required" locks scattered
 * across the app. Accepts a GatedFeature name, looks up the minimum
 * tier required, and renders a consistent panel with:
 *   - a clear "why you're seeing this"
 *   - the tier that unlocks it (with price)
 *   - a deep-link CTA to /pricing?plan=<tier> — no more dead-ends
 *
 * Usage:
 *   <FeatureLockCard
 *     feature="team_access"
 *     title="Team Management"
 *     subtitle="Manage team members who share your subscription."
 *   />
 */

"use client";

import Link from "next/link";
import { ArrowUpRight, Lock, Sparkles } from "lucide-react";
import {
  FEATURE_LABELS,
  TIER_DEFINITIONS,
  getMinTierForFeature,
  type GatedFeature,
  type Tier,
} from "@/lib/types/tiers";

interface FeatureLockCardProps {
  feature: GatedFeature;
  /** Optional headline — defaults to the feature's human-readable label. */
  title?: string;
  /** Optional subtitle shown under the title. */
  subtitle?: string;
  /** Compact variant for inline use inside tables/dropdowns. */
  compact?: boolean;
}

function tierDisplayName(tier: Tier | null): string {
  if (!tier) return "Paid tier";
  const def = TIER_DEFINITIONS.find((d) => d.id === tier);
  return def?.displayName ?? tier;
}

function tierPrice(tier: Tier | null): number | null {
  if (!tier) return null;
  const def = TIER_DEFINITIONS.find((d) => d.id === tier);
  return def?.monthlyPrice ?? null;
}

export function FeatureLockCard({
  feature,
  title,
  subtitle,
  compact = false,
}: FeatureLockCardProps) {
  const requiredTier = getMinTierForFeature(feature);
  const tierLabel = tierDisplayName(requiredTier);
  const price = tierPrice(requiredTier);
  const featureLabel = FEATURE_LABELS[feature] ?? feature;
  const displayTitle = title ?? featureLabel;
  const displaySubtitle =
    subtitle ??
    `Unlock ${featureLabel.toLowerCase()} when you upgrade your plan.`;

  const pricingHref = requiredTier
    ? `/pricing?plan=${requiredTier}`
    : "/pricing";

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
        style={{
          borderColor: "rgba(34,211,238,0.22)",
          background: "rgba(34,211,238,0.06)",
          color: "#22d3ee",
        }}
      >
        <Lock className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="flex-1 text-slate-300">
          Requires <span className="font-semibold text-white">{tierLabel}</span>
        </span>
        <Link
          href={pricingHref}
          className="inline-flex items-center gap-1 font-semibold hover:underline"
        >
          Upgrade <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:gap-6"
      style={{
        borderColor: "rgba(34,211,238,0.18)",
        background:
          "linear-gradient(135deg, rgba(34,211,238,0.06), rgba(14,165,233,0.04))",
      }}
    >
      <div
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
        style={{
          background: "rgba(34,211,238,0.12)",
          border: "1px solid rgba(34,211,238,0.22)",
        }}
      >
        <Sparkles className="h-5 w-5" style={{ color: "#22d3ee" }} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-slate-500" />
          <p className="text-sm font-semibold text-white">{displayTitle}</p>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          {displaySubtitle}
        </p>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Unlocks with {tierLabel}
          {price != null && price > 0 ? ` · ${price}τ/month` : ""}
        </p>
      </div>

      <Link
        href={pricingHref}
        className="inline-flex flex-shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all hover:scale-[1.02]"
        style={{
          background: "linear-gradient(135deg, #22d3ee, #0ea5e9)",
          color: "#04060d",
        }}
      >
        Upgrade to {tierLabel}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
