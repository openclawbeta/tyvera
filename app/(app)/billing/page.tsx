"use client";

import { useState, useCallback } from "react";
import {
  Zap, Shield, CheckCircle, Clock, Copy, ExternalLink,
  Lock, ChevronRight, Wallet, Sparkles, Info, Loader2, AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionTitle } from "@/components/ui-custom/section-title";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { PremiumBadge } from "@/components/ui-custom/premium-badge";
import { getBillingStatus, getPlans, getLegacyBillingStatus, getBillingHistory, createPaymentIntent } from "@/lib/api/billing";
import type { BillingPlanModel, BillingHistoryItem } from "@/lib/types/billing";
import type { PaymentIntent } from "@/lib/types/payment";
import { useWallet } from "@/lib/wallet-context";
import { useTaoRate } from "@/lib/hooks/use-tao-rate";
import { cn, formatDate, truncateAddress } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────── */
/* Helpers                                                              */
/* ─────────────────────────────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────────────────────────── */
/* Shared plan section (used by both connected_free and active)         */
/* ─────────────────────────────────────────────────────────────────── */

function PlanSelectionSection({
  plans,
  selectedPlan,
  setSelectedPlan,
  taoRate,
  rateLoading,
  rateFallback,
  onInitiatePayment,
  walletConnected,
}: {
  plans: BillingPlanModel[];
  selectedPlan: string | null;
  setSelectedPlan: (id: string | null) => void;
  taoRate: number | null;
  rateLoading: boolean;
  rateFallback: boolean;
  onInitiatePayment?: () => void;
  walletConnected?: boolean;
}) {
  const nonFreePlans = plans.filter((p) => p.id !== "FREE");
  const featuredPlan = nonFreePlans.find((p) => p.badge === "Best Value") ?? nonFreePlans[0];
  const selectedPlanData = plans.find((p) => p.id === selectedPlan);

  return (
    <FadeIn delay={0.07}>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.028) 0%, rgba(255,255,255,0.014) 100%)",
          border: "1px solid rgba(255,255,255,0.068)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.045), 0 4px 24px rgba(0,0,0,0.28)",
        }}
      >
        {/* Section header */}
        <div className="px-6 pt-6 pb-5">
          <SectionTitle
            title="Extend or Upgrade"
            subtitle="Pay in TAO. No auto-renewal. New days stack on top of any remaining time."
          />
        </div>

        {/* Plan rows */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}>
          {nonFreePlans.map((plan: BillingPlanModel, idx: number) => {
            const isSelected = selectedPlan === plan.id;
            const isBestValue = plan.badge === "Best Value";
            const isLast = idx === nonFreePlans.length - 1;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(isSelected ? null : plan.id)}
                className="flex items-center gap-4 cursor-pointer transition-all duration-150"
                style={{
                  padding: "15px 24px",
                  borderLeft: isSelected
                    ? "3px solid rgba(34,211,238,0.7)"
                    : isBestValue
                    ? "3px solid rgba(251,191,36,0.45)"
                    : "3px solid transparent",
                  background: isSelected
                    ? "rgba(34,211,238,0.035)"
                    : isBestValue
                    ? "rgba(251,191,36,0.018)"
                    : "transparent",
                  borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.background = isBestValue
                      ? "rgba(251,191,36,0.03)"
                      : "rgba(255,255,255,0.02)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.background = isBestValue
                      ? "rgba(251,191,36,0.018)"
                      : "transparent";
                  }
                }}
              >
                {/* Plan name */}
                <div className="flex-1 min-w-0">
                  <span
                    className="font-semibold text-white"
                    style={{ fontSize: "13px", letterSpacing: "-0.01em" }}
                  >
                    {plan.displayName}
                  </span>
                </div>

                {/* TAO price — derived from live rate when available */}
                <div className="flex items-baseline gap-1 w-28 flex-shrink-0">
                  {rateLoading ? (
                    <span className="text-[13px] text-slate-600 tabular-nums">{"\u2026"}</span>
                  ) : (
                    <>
                      <span
                        className="font-black text-white tabular-nums"
                        style={{ fontSize: "22px", letterSpacing: "-0.03em" }}
                      >
                        {taoRate ? (plan.priceUsd / taoRate).toFixed(2) : plan.priceTao}
                      </span>
                      <span
                        className="font-bold"
                        style={{ fontSize: "14px", color: isSelected ? "#22d3ee" : "#67e8f9" }}
                      >
                        τ
                      </span>
                      {taoRate && (
                        <span className="text-[9px] text-slate-600 ml-0.5">
                          {rateFallback ? "(est.)" : "(live)"}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* USD equiv */}
                <div className="w-28 flex-shrink-0">
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    ≈ ${plan.priceUsd.toLocaleString()} USD
                  </span>
                </div>

                {/* Best value tag */}
                <div className="w-24 flex-shrink-0">
                  {isBestValue && !isSelected && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                      style={{
                        background: "rgba(251,191,36,0.08)",
                        border: "1px solid rgba(251,191,36,0.2)",
                        color: "#fbbf24",
                      }}
                    >
                      Best value
                    </span>
                  )}
                </div>

                {/* Radio indicator */}
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isSelected ? "rgba(34,211,238,0.12)" : "transparent",
                    border: isSelected
                      ? "1px solid rgba(34,211,238,0.55)"
                      : "1px solid rgba(255,255,255,0.15)",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  {isSelected && (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: "#22d3ee" }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* What's included */}
        {featuredPlan?.features?.length > 0 && (
          <div
            className="px-6 py-5"
            style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}
          >
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.1em] mb-3">
              Included in all Premium plans
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
              {featuredPlan.features.map((f: string) => (
                <div key={f} className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 flex-shrink-0 mt-[2px]" style={{ color: "#34d399" }} />
                  <span className="text-[11px] text-slate-400 leading-snug">{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Instructions — revealed when a plan is selected */}
        {selectedPlanData && (
          <div
            className="mx-6 mb-6 rounded-xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.018)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-white">
                  Payment Instructions — {selectedPlanData.displayName}
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold" style={{ color: "#22d3ee" }}>
                {taoRate ? (selectedPlanData.priceUsd / taoRate).toFixed(2) : selectedPlanData.priceTao} τ
              </span>
            </div>

            <div className="px-5 py-4 space-y-3">
              {[
                { n: 1, title: "Generate a payment address", body: "Click the button below and we\u2019ll derive a unique TAO deposit address for your account." },
                { n: 2, title: `Send exactly ${taoRate ? (selectedPlanData.priceUsd / taoRate).toFixed(2) : selectedPlanData.priceTao} τ`, body: "Send the exact amount to the address shown. Partial or over-payments require manual review." },
                { n: 3, title: "Automatic on-chain activation", body: "Our chain watcher confirms the transaction (typically 3\u20136 blocks). Premium activates automatically \u2014 no action needed on your part." },
                { n: 4, title: "Your existing time is preserved", body: "If you\u2019re already premium, the new period is added on top of your remaining days. Nothing is overwritten." },
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
              style={{ background: "rgba(34,211,238,0.04)", border: "1px solid rgba(34,211,238,0.12)" }}
            >
              <Info className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-[1px]" />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Payment activation is in development. The plan structure and pricing above reflect the intended model.
              </p>
            </div>

            {/* CTA */}
            <div className="px-5 pb-5">
              {walletConnected && onInitiatePayment ? (
                <button
                  onClick={onInitiatePayment}
                  className="w-full flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150"
                  style={{
                    height: "44px",
                    fontSize: "13px",
                    background: "linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(34,211,238,0.08) 100%)",
                    border: "1px solid rgba(34,211,238,0.3)",
                    color: "#67e8f9",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(34,211,238,0.22) 0%, rgba(34,211,238,0.12) 100%)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(34,211,238,0.08) 100%)";
                  }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Generate Payment Address
                </button>
              ) : (
                <div
                  className="w-full flex items-center justify-center gap-2 font-semibold rounded-xl cursor-not-allowed select-none"
                  style={{
                    height: "44px",
                    fontSize: "13px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#475569",
                  }}
                >
                  <Lock className="w-3.5 h-3.5" />
                  {walletConnected ? "Select a plan above" : "Connect wallet to purchase"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </FadeIn>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Phase 2D — Payment intent panel                                     */
/* ─────────────────────────────────────────────────────────────────── */

function PaymentIntentPanel({
  intent,
  onCancel,
  taoRate,
  rateFallback,
}: {
  intent: PaymentIntent;
  onCancel: () => void;
  taoRate: number | null;
  rateFallback: boolean;
}) {
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);

  const liveAmount = taoRate
    ? (intent.amountUsd / taoRate).toFixed(2)
    : intent.amountTao.toString();

  function copyText(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text).catch(() => {});
    setter(true);
    setTimeout(() => setter(false), 1800);
  }

  const isWaiting = intent.status === "awaiting_payment";
  const isConfirming = intent.status === "confirming";
  const isConfirmed = intent.status === "confirmed";
  const isFailed = intent.status === "failed" || intent.status === "expired";

  return (
    <FadeIn>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: isConfirmed
            ? "linear-gradient(145deg, rgba(52,211,153,0.06) 0%, rgba(255,255,255,0.018) 100%)"
            : isFailed
            ? "linear-gradient(145deg, rgba(244,63,94,0.06) 0%, rgba(255,255,255,0.018) 100%)"
            : "linear-gradient(145deg, rgba(34,211,238,0.05) 0%, rgba(255,255,255,0.018) 100%)",
          border: isConfirmed
            ? "1px solid rgba(52,211,153,0.25)"
            : isFailed
            ? "1px solid rgba(244,63,94,0.25)"
            : "1px solid rgba(34,211,238,0.2)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.045), 0 4px 24px rgba(0,0,0,0.28)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.055)" }}
        >
          <div className="flex items-center gap-2.5">
            {isWaiting && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
            {isConfirming && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
            {isConfirmed && <CheckCircle className="w-4 h-4 text-emerald-400" />}
            {isFailed && <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span className="text-sm font-semibold text-white">
              {isWaiting && "Awaiting Payment"}
              {isConfirming && `Confirming (${intent.confirmations}/${intent.requiredConfirmations} blocks)`}
              {isConfirmed && "Payment Confirmed"}
              {isFailed && (intent.status === "expired" ? "Payment Expired" : "Payment Failed")}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {intent.planName}
          </span>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Amount */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Amount</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-white tabular-nums">{liveAmount}</span>
              <span className="text-sm font-bold text-cyan-400">τ</span>
              {taoRate && (
                <span className="text-[9px] text-slate-600 ml-0.5">
                  {rateFallback ? "(est.)" : "(live)"}
                </span>
              )}
              <span className="text-xs text-slate-600 ml-2">
                ≈ ${intent.amountUsd.toLocaleString()} USD
              </span>
            </div>
          </div>

          {/* Deposit address */}
          {(isWaiting || isConfirming) && (
            <div>
              <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">
                Deposit Address
              </div>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                style={{
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <code className="text-xs text-slate-300 font-mono flex-1 truncate">
                  {intent.depositAddress}
                </code>
                <button
                  onClick={() => copyText(intent.depositAddress, setCopiedAddr)}
                  className="transition-colors flex-shrink-0"
                  style={{ color: copiedAddr ? "#22d3ee" : "#475569" }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Memo */}
          {(isWaiting || isConfirming) && (
            <div>
              <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">
                Payment Memo (required)
              </div>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                style={{
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <code className="text-xs text-cyan-300 font-mono font-bold flex-1">
                  {intent.memo}
                </code>
                <button
                  onClick={() => copyText(intent.memo, setCopiedMemo)}
                  className="transition-colors flex-shrink-0"
                  style={{ color: copiedMemo ? "#22d3ee" : "#475569" }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Tx hash when available */}
          {intent.txHash && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Transaction</span>
              <code className="text-[10px] font-mono text-slate-400">
                {intent.txHash.slice(0, 20)}…
              </code>
            </div>
          )}

          {/* Expiration warning */}
          {isWaiting && (
            <div
              className="flex items-start gap-2.5 p-3 rounded-lg"
              style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.12)" }}
            >
              <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-[1px]" />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Send the exact amount with the memo above. This payment window expires in 24 hours.
                Payment infrastructure is in development — this is a preview of the intended flow.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {(isWaiting || isFailed) && (
          <div
            className="px-6 pb-5"
          >
            <button
              onClick={onCancel}
              className="text-[11px] font-semibold transition-colors"
              style={{ color: "#475569" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#94a3b8")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#475569")}
            >
              {isFailed ? "Dismiss" : "Cancel payment"}
            </button>
          </div>
        )}
      </div>
    </FadeIn>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Trust strip (shared)                                                 */
/* ─────────────────────────────────────────────────────────────────── */

function TrustStrip() {
  return (
    <FadeIn delay={0.12}>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.022) 0%, rgba(255,255,255,0.01) 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.035), 0 2px 12px rgba(0,0,0,0.18)",
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {[
            { icon: Shield, color: "#34d399", title: "On-chain payments", desc: "Every payment is a verifiable TAO transaction on the Bittensor network. No intermediaries." },
            { icon: Sparkles, color: "#a78bfa", title: "Time stacks, never resets", desc: "Renewing while active always adds days on top. Your existing premium balance is never lost." },
            { icon: Lock, color: "#22d3ee", title: "No card. No bank. Just TAO.", desc: "We accept only TAO. No credit cards, no bank connections, no personal financial data." },
          ].map(({ icon: Icon, color, title, desc }, idx, arr) => (
            <div
              key={title}
              className={cn(
                "flex items-start gap-3.5 px-6 py-5",
                idx < arr.length - 1 && "border-b sm:border-b-0 sm:border-r",
              )}
              style={idx < arr.length - 1 ? { borderColor: "rgba(255,255,255,0.055)" } : {}}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-[2px]" style={{ color }} />
              <div>
                <p className="font-semibold text-white mb-1" style={{ fontSize: "11px", letterSpacing: "-0.01em" }}>
                  {title}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Page                                                                 */
/* ─────────────────────────────────────────────────────────────────── */

export default function BillingPage() {
  const { walletState, address } = useWallet();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);

  const billingState = getBillingStatus(walletState === "disconnected" ? null : address);
  const plans = getPlans() as unknown as BillingPlanModel[];
  const { rate: taoRate, loading: rateLoading, fallback: rateFallback } = useTaoRate();

  const handleInitiatePayment = useCallback(() => {
    if (!selectedPlan || !address) return;
    const intent = createPaymentIntent(selectedPlan, address);
    setPaymentIntent(intent);
  }, [selectedPlan, address]);

  const handleCancelPayment = useCallback(() => {
    setPaymentIntent(null);
  }, []);

  /* ── Disconnected: no wallet — still show plans ── */
  if (billingState.status === "disconnected") {
    return (
      <div className="max-w-5xl mx-auto space-y-7">
        <PageHeader
          title="Billing"
          subtitle="Manage your premium subscription \u2014 paid in TAO, activated on-chain"
        />

        {/* Wallet prompt */}
        <FadeIn>
          <div
            className="flex flex-col items-center justify-center py-12 rounded-2xl"
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
              Connect your wallet to purchase a plan and check your subscription status.
            </p>
          </div>
        </FadeIn>

        {/* Show plans even when disconnected */}
        <PlanSelectionSection
          plans={plans}
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          taoRate={taoRate}
          rateLoading={rateLoading}
          rateFallback={rateFallback}
          walletConnected={false}
        />

        <TrustStrip />
      </div>
    );
  }

  /* ── Connected but no subscription ── */
  if (billingState.status === "connected_free") {
    return (
      <div className="max-w-5xl mx-auto space-y-7">
        <PageHeader
          title="Billing"
          subtitle="Manage your premium subscription \u2014 paid in TAO, activated on-chain"
        />

        {/* Honest empty state */}
        <FadeIn>
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
                background: "rgba(34,211,238,0.08)",
                border: "1px solid rgba(34,211,238,0.2)",
              }}
            >
              <Wallet className="w-5 h-5" style={{ color: "#22d3ee" }} />
            </div>
            <p className="text-[15px] font-semibold text-white mb-2" style={{ letterSpacing: "-0.01em" }}>
              No active subscription
            </p>
            <p className="text-[13px] text-slate-500 text-center max-w-xs leading-relaxed">
              Browse the plan options below to get started.
            </p>
          </div>
        </FadeIn>

        {/* Payment intent (if active) */}
        {paymentIntent && (
          <PaymentIntentPanel
            intent={paymentIntent}
            onCancel={handleCancelPayment}
            taoRate={taoRate}
            rateFallback={rateFallback}
          />
        )}

        {/* Plan browser */}
        {!paymentIntent && (
          <PlanSelectionSection
            plans={plans}
            selectedPlan={selectedPlan}
            setSelectedPlan={setSelectedPlan}
            taoRate={taoRate}
            rateLoading={rateLoading}
            rateFallback={rateFallback}
            onInitiatePayment={selectedPlan ? handleInitiatePayment : undefined}
            walletConnected
          />
        )}

        <TrustStrip />
      </div>
    );
  }

  /* ── Active subscription (or grace/expired — full billing view) ── */
  const legacyState = getLegacyBillingStatus();
  const paymentHistory = getBillingHistory();

  const pct = Math.round(((legacyState.daysRemaining ?? 0) / 30) * 100);

  function copyAddress() {
    navigator.clipboard.writeText(legacyState.walletAddress).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-7">

      <PageHeader
        title="Billing"
        subtitle="Manage your premium subscription \u2014 paid in TAO, activated on-chain"
      />

      {/* ── Current Plan Hero ── */}
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
          <div
            className="absolute top-0 right-0 w-56 h-40 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at top right, rgba(251,191,36,0.1) 0%, transparent 70%)" }}
          />

          <div className="flex flex-wrap items-start justify-between gap-4 relative">
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
                  <span className="font-bold text-white" style={{ fontSize: "15px", letterSpacing: "-0.01em" }}>
                    1 Month Premium
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}
                  >
                    ACTIVE
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-600" />
                    Expires{" "}
                    <span className="text-white font-semibold ml-0.5">
                      {legacyState.premiumExpiresAt ? formatDate(legacyState.premiumExpiresAt) : "\u2014"}
                    </span>
                  </span>
                  <span className="text-slate-700">\u00b7</span>
                  <span className="flex items-center gap-1.5">
                    <Wallet className="w-3 h-3 text-slate-600" />
                    <code className="text-slate-400 font-mono">{truncateAddress(legacyState.walletAddress)}</code>
                    <button onClick={copyAddress} className="transition-colors" style={{ color: copied ? "#22d3ee" : "#475569" }}>
                      <Copy className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div
                className="font-black text-white leading-none"
                style={{ fontSize: "40px", letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}
              >
                {legacyState.daysRemaining}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5 mb-3">days remaining</div>
              <div className="w-36 h-[3px] rounded-full overflow-hidden ml-auto" style={{ background: "rgba(255,255,255,0.06)" }}>
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

      {/* Payment intent (if active) */}
      {paymentIntent && (
        <PaymentIntentPanel
          intent={paymentIntent}
          onCancel={handleCancelPayment}
          taoRate={taoRate}
          rateFallback={rateFallback}
        />
      )}

      {/* ── Plan Selection ── */}
      {!paymentIntent && (
        <PlanSelectionSection
          plans={plans}
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          taoRate={taoRate}
          rateLoading={rateLoading}
          rateFallback={rateFallback}
          onInitiatePayment={selectedPlan ? handleInitiatePayment : undefined}
          walletConnected
        />
      )}

      <TrustStrip />

      {/* ── Payment History ── */}
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

          <div className="rounded-xl overflow-x-auto mt-5" style={{ border: "1px solid rgba(255,255,255,0.055)" }}>
            <div
              className="grid items-center px-4 py-2.5"
              style={{
                gridTemplateColumns: "140px 1fr 80px 70px 100px 1fr 90px",
                minWidth: "700px",
                background: "rgba(255,255,255,0.025)",
                borderBottom: "1px solid rgba(255,255,255,0.055)",
              }}
            >
              {["Date", "Plan", "\u03c4 Amount", "USD", "Type", "Tx Hash", "Status"].map((h) => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{h}</span>
              ))}
            </div>

            {paymentHistory.map((p: BillingHistoryItem, i: number) => (
              <div
                key={p.id}
                className="grid items-center px-4 py-3.5 transition-colors duration-150"
                style={{
                  gridTemplateColumns: "140px 1fr 80px 70px 100px 1fr 90px",
                  minWidth: "700px",
                  borderBottom: i < paymentHistory.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                <span className="text-xs text-slate-400 font-mono tabular-nums">{formatDate(p.date)}</span>
                <span className="text-xs font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>{p.plan}</span>
                <span className="text-xs font-mono font-bold" style={{ color: "#22d3ee", fontVariantNumeric: "tabular-nums" }}>{p.amountTao} τ</span>
                <span className="text-xs text-slate-500 tabular-nums">${p.amountUsd}</span>
                <EntitlementTag type={p.entitlementType} />
                <div className="flex items-center gap-1.5">
                  <code className="text-[10px] font-mono text-slate-600">{p.txHash.slice(0, 14)}\u2026</code>
                  <button
                    className="transition-colors duration-150"
                    style={{ color: "#334155" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#94a3b8")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#334155")}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <StatusDot status={p.status} />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-[11px] text-slate-600">
              {paymentHistory.length} transactions \u00b7 all confirmed on-chain
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
