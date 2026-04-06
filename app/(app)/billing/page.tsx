"use client";

import { useState } from "react";
import {
  Zap, Shield, CheckCircle, Clock, Copy, ExternalLink,
  Lock, ChevronRight, Wallet, ArrowRight, Sparkles, Info,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionTitle } from "@/components/ui-custom/section-title";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui-custom/fade-in";
import { PremiumBadge } from "@/components/ui-custom/premium-badge";
import { getBillingHistory, getBillingStatus, createPaymentRequest } from "@/lib/api/billing";
import type { BillingPlanModel, BillingHistoryItem } from "@/lib/types/billing";
import { useWallet } from "@/lib/wallet-context";
import { cn, formatDate, truncateAddress } from "@/lib/utils";

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
/* Helpers                                                              */
/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

function StatusDot({ status }: { status: "CONFIRMED" | "PENDING" | "FAILED" }) {
  const map = {
    CONFIRMED: { bg: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.35)", dot: "#34d399", label: "Confirmed" },
    PENDING:   { bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)",   dot: "#fbbf24", label: "Pending"   },
    FAILED:    { bg: "rgba(244,63,94,0.12)",   border: "rgba(244,63,94,0.3)",    dot: "#f43f5e", label: "Failed"    },
  }[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: map.bg, border: `1px solid ${map.border}`, color: map.dot }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: map.dot }} />
      {map.label}
    </span>
  );
}

function EntitlementTag({ type }: { type: "ACTIVATED" | "EXTENDED" | "REACTIVATED" }) {
  const map = {
    ACTIVATED:   { bg: "rgba(34,211,238,0.09)",  border: "rgba(34,211,238,0.22)", color: "#67e8f9", label: "Activated"   },
    EXTENDED:    { bg: "rgba(167,139,250,0.09)",  border: "rgba(167,139,250,0.22)", color: "#c4b5fd", label: "Extended"    },
    REACTIVATED: { bg: "rgba(251,191,36,0.09)",   border: "rgba(251,191,36,0.22)",  color: "#fde68a", label: "Reactivated" },
  }[type];
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
      style={{ background: map.bg, border: `1px solid ${map.border}`, color: map.color }}
    >
      {map.label}
    </span>
  );
}

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
/* Page                                                                 */
/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

export default function BillingPage() {
  const { walletState } = useWallet();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (walletState === "disconnected") {
    return (
      <div className="max-w-5xl mx-auto space-y-7">
        <PageHeader
          title="Billing"
          subtitle="Manage your premium subscription — paid in TAO, activated on-chain"
        />
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
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
            <Wallet className="w-5 h-5" style={{ color: "#fbbf24" }} />
          </div>
          <p className="text-[15px] font-semibold text-white mb-2" style={{ letterSpacing: "-0.01em" }}>
            No wallet connected
          </p>
          <p className="text-[13px] text-slate-500 text-center max-w-xs leading-relaxed">
            Connect your wallet to check your subscription status and payment history.
          </p>
        </div>
      </div>
    );
  }

  const state = getBillingStatus();
  const paymentHistory = getBillingHistory();
  const plans = state.plans ?? [];

  const pct = Math.round(((state.daysRemaining ?? 0) / 30) * 100);
  const selectedPlanData = plans.find((p: BillingPlanModel) => p.id === selectedPlan);

  function copyAddress() {
    navigator.clipboard.writeText(state.walletAddress).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-7">

      <PageHeader
        title="Billing"
        subtitle="Manage your premium subscription â paid in TAO, activated on-chain"
      />

      {/* ââ Current Plan Hero ââ */}
      <FadeIn>
        <div
          className="rounded-2xl relative overflow-hidden"
          style={{
            background: "linear-gradient(145deg, rgba(251,191,36,0.07) 0%, rgba(245,158,11,0.03) 60%, rgba(255,255,255,0.018) 100%)",
            border: "1px solid rgba(251,191,36,0.22)",
            boxShadow: "0 0 48px rgba(251,191,36,0.06), inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.3)",
            padding: "28px 28px 24px",
          }}
        >
          {/* Subtle top-right glow orb */}
          <div
            className="absolute top-0 right-0 w-56 h-40 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at top right, rgba(251,191,36,0.1) 0%, transparent 70%)",
            }}
          />

          <div className="flex flex-wrap items-start justify-between gap-4 relative">
            {/* Left: icon + plan info */}
            <div className="flex items-center gap-5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(145deg, rgba(251,191,36,0.18) 0%, rgba(245,158,11,0.1) 100%)",
                  border: "1px solid rgba(251,191,36,0.3)",
                  boxShadow: "0 0 16px rgba(251,191,36,0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              >
                <Zap className="w-6 h-6 fill-amber-400 text-amber-400" />
              </div>

              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <PremiumBadge size="md" />
                  <span
                    className="font-bold text-white"
                    style={{ fontSize: "15px", letterSpacing: "-0.01em" }}
                  >
                    1 Month Premium
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(52,211,153,0.12)",
                      border: "1px solid rgba(52,211,153,0.25)",
                      color: "#34d399",
                    }}
                  >
                    ACTIVE
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-600" />
                    Expires{" "}
                    <span className="text-white font-semibold ml-0.5">
                      {state.premiumExpiresAt ? formatDate(state.premiumExpiresAt) : "â"}
                    </span>
                  </span>
                  <span className="text-slate-700">Â·</span>
                  <span className="flex items-center gap-1.5">
                    <Wallet className="w-3 h-3 text-slate-600" />
                    <code className="text-slate-400 font-mono">{truncateAddress(state.walletAddress)}</code>
                    <button
                      onClick={copyAddress}
                      className="transition-colors"
                      style={{ color: copied ? "#22d3ee" : "#475569" }}
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: days countdown */}
            <div className="text-right flex-shrink-0">
              <div
                className="font-black text-white leading-none"
                style={{ fontSize: "40px", letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}
              >
                {state.daysRemaining}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5 mb-3">days remaining</div>
              <div
                className="w-36 h-[3px] rounded-full overflow-hidden ml-auto"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                    boxShadow: "0 0 6px rgba(251,191,36,0.4)",
                    transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                />
              </div>
              <div className="text-[10px] text-slate-600 mt-1.5 tabular-nums">{pct}% of period used</div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* ââ Plan Selection ââ */}
      <FadeIn delay={0.07}>
        <div
          className="rounded-2xl"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.028) 0%, rgba(255,255,255,0.014) 100%)",
            border: "1px solid rgba(255,255,255,0.068)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.045), 0 4px 24px rgba(0,0,0,0.28)",
            padding: "24px 24px 28px",
          }}
        >
          <SectionTitle
            title="Extend or Upgrade"
            subtitle="Pay in TAO. No auto-renewal. New days stack on top of any remaining time."
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
            {plans.filter((p: BillingPlanModel) => p.