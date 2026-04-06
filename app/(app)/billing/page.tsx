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
            {plans.filter((p: BillingPlanModel) => p.id !== "FREE").map((plan: BillingPlanModel) => {
              const isSelected = selectedPlan === plan.id;
              const isBestValue = plan.badge === "Best Value";

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(isSelected ? null : plan.id)}
                  className="relative rounded-xl cursor-pointer"
                  style={{
                    padding: "20px",
                    transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
                    background: isSelected
                      ? "rgba(34,211,238,0.05)"
                      : isBestValue
                        ? "rgba(167,139,250,0.04)"
                        : "rgba(255,255,255,0.02)",
                    border: isSelected
                      ? "1px solid rgba(34,211,238,0.35)"
                      : isBestValue
                        ? "1px solid rgba(167,139,250,0.22)"
                        : "1px solid rgba(255,255,255,0.07)",
                    boxShadow: isSelected
                      ? "0 0 0 1px rgba(34,211,238,0.12), 0 0 24px rgba(34,211,238,0.08)"
                      : "none",
                  }}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span
                        className="text-[10px] font-bold px-3 py-[3px] rounded-full"
                        style={{
                          background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                          color: "#fff",
                          boxShadow: "0 0 12px rgba(167,139,250,0.3)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Selected ring overlay */}
                  {isSelected && (
                    <div
                      className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: "rgba(34,211,238,0.15)",
                        border: "1px solid rgba(34,211,238,0.4)",
                      }}
                    >
                      <CheckCircle className="w-3 h-3" style={{ color: "#22d3ee" }} />
                    </div>
                  )}

                  {/* Name + price */}
                  <div className="mt-1 mb-4">
                    <div
                      className="font-semibold text-white mb-2"
                      style={{ fontSize: "13px", letterSpacing: "-0.01em" }}
                    >
                      {plan.displayName}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span
                        className="font-black text-white leading-none"
                        style={{ fontSize: "28px", letterSpacing: "-0.035em", fontVariantNumeric: "tabular-nums" }}
                      >
                        {plan.priceTao}
                      </span>
                      <span
                        className="font-bold"
                        style={{ fontSize: "15px", color: isSelected ? "#22d3ee" : "#67e8f9" }}
                      >
                        Ï
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-600 mt-0.5">
                      â ${plan.priceUsd.toLocaleString()} USD
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle
                          className="w-3 h-3 flex-shrink-0 mt-[1px]"
                          style={{ color: isSelected ? "#22d3ee" : "#34d399" }}
                        />
                        <span className="text-[11px] text-slate-400 leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* ââ Payment Instructions (revealed on select) ââ */}
          {selectedPlanData && (
            <div
              className="mt-6 rounded-xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.018)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-semibold text-white">
                    Payment Instructions â {selectedPlanData.displayName}
                  </span>
                </div>
                <span
                  className="text-[11px] font-mono font-bold"
                  style={{ color: "#22d3ee" }}
                >
                  {selectedPlanData.priceTao} Ï
                </span>
              </div>

              {/* Steps */}
              <div className="px-5 py-4 space-y-3">
                {[
                  {
                    n: 1,
                    title: "Generate a payment address",
                    body: "Click the button below and we'll derive a unique TAO deposit address for your account.",
                  },
                  {
                    n: 2,
                    title: `Send exactly ${selectedPlanData.priceTao} Ï`,
                    body: "Send the exact amount to the address shown. Partial or over-payments require manual review.",
                  },
                  {
                    n: 3,
                    title: "Automatic on-chain activation",
                    body: "Our chain watcher confirms the transaction (typically 3â6 blocks). Premium activates automatically â no action needed on your part.",
                  },
                  {
                    n: 4,
                    title: "Your existing time is preserved",
                    body: "If you're already premium, the new period is added on top of your remaining days. Nothing is overwritten.",
                  },
                ].map(({ n, title, body }) => (
                  <div key={n} className="flex gap-3.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-[1px]"
                      style={{
                        background: "rgba(34,211,238,0.1)",
                        border: "1px solid rgba(34,211,238,0.25)",
                        color: "#67e8f9",
                        fontSize: "9px",
                        fontWeight: 700,
                      }}
                    >
                      {n}
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-200 mb-0.5">{title}</div>
                      <div className="text-[11px] text-slate-500 leading-relaxed">{body}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust note */}
              <div
                className="flex items-start gap-2.5 mx-5 mb-4 p-3 rounded-lg"
                style={{
                  background: "rgba(34,211,238,0.04)",
                  border: "1px solid rgba(34,211,238,0.12)",
                }}
              >
                <Info className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0 mt-[1px]" />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Premium activates once your transaction is confirmed on the Bittensor network. This typically
                  takes under 60 seconds. If it doesn&apos;t activate within 10 minutes, contact support with your tx hash.
                </p>
              </div>

              {/* CTA */}
              <div className="px-5 pb-5">
                <button
                  onClick={() => selectedPlanData && createPaymentRequest(selectedPlanData.id)}
                  className="w-full flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200"
                  style={{
                    height: "44px",
                    fontSize: "13px",
                    background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                    color: "#fff",
                    boxShadow: "0 0 0 1px rgba(34,211,238,0.4), 0 4px 16px rgba(34,211,238,0.22), inset 0 1px 0 rgba(255,255,255,0.2)",
                  }}
                >
                  <Zap className="w-4 h-4" />
                  Generate Payment Address for {selectedPlanData.priceTao} Ï
                  <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                </button>
              </div>
            </div>
          )}
        </div>
      </FadeIn>

      {/* ââ Trust Pillars ââ */}
      <FadeIn delay={0.12}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: Shield,
              color: "#34d399",
              bg: "rgba(52,211,153,0.1)",
              bdr: "rgba(52,211,153,0.2)",
              title: "On-chain payments",
              desc: "Every payment is a verifiable TAO transaction on the Bittensor network. No intermediaries, no black boxes.",
            },
            {
              icon: Sparkles,
              color: "#a78bfa",
              bg: "rgba(167,139,250,0.1)",
              bdr: "rgba(167,139,250,0.2)",
              title: "Time stacks, never resets",
              desc: "Upgrading or renewing while active always adds days on top. Your existing premium balance is never lost.",
            },
            {
              icon: Lock,
              color: "#22d3ee",
              bg: "rgba(34,211,238,0.1)",
              bdr: "rgba(34,211,238,0.2)",
              title: "No card. No bank. Just TAO.",
              desc: "We accept only TAO. No credit cards, no bank connections, no personal financial data collected.",
            },
          ].map(({ icon: Icon, color, bg, bdr, title, desc }) => (
            <div
              key={title}
              className="rounded-xl"
              style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.012) 100%)",
                border: "1px solid rgba(255,255,255,0.065)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 12px rgba(0,0,0,0.2)",
                padding: "20px",
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                style={{ background: bg, border: `1px solid ${bdr}` }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p
                className="font-semibold text-white mb-1.5"
                style={{ fontSize: "12px", letterSpacing: "-0.01em" }}
              >
                {title}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* ââ Payment History ââ */}
      <FadeIn delay={0.16}>
        <div
          className="rounded-2xl"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.028) 0%, rgba(255,255,255,0.014) 100%)",
            border: "1px solid rgba(255,255,255,0.068)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.045), 0 4px 24px rgba(0,0,0,0.28)",
            padding: "24px 24px 20px",
          }}
        >
          <SectionTitle title="Payment History" subtitle="All on-chain payments for this account" />

          <div
            className="rounded-xl overflow-x-auto mt-5"
            style={{ border: "1px solid rgba(255,255,255,0.055)" }}
          >
            {/* Table header */}
            <div
              className="grid items-center px-4 py-2.5"
              style={{
                gridTemplateColumns: "140px 1fr 80px 70px 100px 1fr 90px",
                minWidth: "700px",
                background: "rgba(255,255,255,0.025)",
                borderBottom: "1px solid rgba(255,255,255,0.055)",
              }}
            >
              {["Date", "Plan", "Ï Amount", "USD", "Type", "Tx Hash", "Status"].map((h) => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {paymentHistory.map((p: BillingHistoryItem, i: number) => (
              <div
                key={p.id}
                className="grid items-center px-4 py-3.5 transition-colors duration-150"
                style={{
                  gridTemplateColumns: "140px 1fr 80px 70px 100px 1fr 90px",
                minWidth: "700px",
                  borderBottom: i < paymentHistory.length - 1
                    ? "1px solid rgba(255,255,255,0.04)"
                    : "none",
                }}
              >
                {/* Date */}
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  {formatDate(p.date)}
                </span>

                {/* Plan */}
                <span className="text-xs font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>
                  {p.plan}
                </span>

                {/* TAO */}
                <span className="text-xs font-mono font-bold" style={{ color: "#22d3ee", fontVariantNumeric: "tabular-nums" }}>
                  {p.amountTao} Ï
                </span>

                {/* USD */}
                <span className="text-xs text-slate-500 tabular-nums">${p.amountUsd}</span>

                {/* Type */}
                <EntitlementTag type={p.entitlementType} />

                {/* Tx Hash */}
                <div className="flex items-center gap-1.5">
                  <code className="text-[10px] font-mono text-slate-600">
                    {p.txHash.slice(0, 14)}â¦
                  </code>
                  <button
                    className="transition-colors duration-150"
                    style={{ color: "#334155" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#94a3b8")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#334155")}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Status */}
                <StatusDot status={p.status} />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-[11px] text-slate-600">
              {paymentHistory.length} transactions Â· all confirmed on-chain
            </p>
            <button
              className="flex items-center gap-1.5 text-[11px] font-semibold transition-colors duration-150"
              style={{ color: "#475569" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#94a3b8")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#475569")}
            >
              Export CSV
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
