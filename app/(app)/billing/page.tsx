"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wallet,
  CreditCard,
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  Clock,
  Shield,
  CheckCircle2,
  Zap,
  AlertTriangle,
  Receipt,
  Layers3,
  Lock,
  Loader2,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { useWallet } from "@/lib/wallet-context";
import { useEntitlement } from "@/lib/hooks/use-entitlement";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

interface PaymentRecord {
  id: number;
  plan: string;
  amount: number;
  txHash: string | null;
  cycle: string;
  status: string;
  date: string;
}

interface BillingState {
  status: string;
  currentPlan: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
  walletAddress: string | null;
}

interface PlanOption {
  id: string;
  tier: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const config =
    status === "active" ? { bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.2)", color: "#34d399", label: "Active" } :
    status === "grace" ? { bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.2)", color: "#fbbf24", label: "Grace Period" } :
    status === "expired" ? { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)", color: "#f87171", label: "Expired" } :
    { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", color: "#94a3b8", label: status };

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold"
      style={{ background: config.bg, border: `1px solid ${config.border}`, color: config.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
      {config.label}
    </span>
  );
}

export default function BillingPage() {
  const { address, walletState, getAuthHeaders, openModal } = useWallet();
  const entitlement = useEntitlement(address ?? null);
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBilling = useCallback(async () => {
    if (!address || walletState !== "verified") return;
    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetchWithTimeout("/api/billing", {
        timeoutMs: 8000,
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setBilling(data.billing);
        setPayments(data.payments ?? []);
        setPlans(data.plans ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [address, walletState, getAuthHeaders]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  // Not connected
  if (!address) {
    return (
      <div className="max-w-5xl mx-auto">
        <PageHeader title="Billing & Account" subtitle="Manage your subscription, view payment history, and upgrade your plan" />
        <div className="mt-12 flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)" }}
          >
            <WalletCards className="w-7 h-7" style={{ color: "#22d3ee" }} />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Connect your wallet</h2>
          <p className="text-sm max-w-md" style={{ color: "#94a3b8" }}>
            Connect your Bittensor wallet to view your subscription status, payment history, and manage your plan.
          </p>
          <button
            onClick={openModal}
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
            style={{ background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.22)", color: "#22d3ee" }}
          >
            <WalletCards className="w-4 h-4" />
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  const isPaid = billing?.status === "connected_premium" || billing?.status === "connected_grace";
  const tierName = entitlement.tier ? entitlement.tier.charAt(0).toUpperCase() + entitlement.tier.slice(1) : "Explorer";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <PageHeader title="Billing & Account" subtitle="Manage your subscription, view payment history, and upgrade your plan" />

      {loading && !billing ? (
        <GlassCard padding="lg" className="text-center py-16">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-cyan-400 mb-3" />
          <p className="text-sm" style={{ color: "#64748b" }}>Loading billing info…</p>
        </GlassCard>
      ) : (
        <>
          {/* ── Current Plan ────────────────────────────────────── */}
          <FadeIn>
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <GlassCard padding="lg" glow={isPaid ? "cyan" : undefined}>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">Current Plan</div>
                    <h2 className="text-2xl font-bold text-white">{billing?.currentPlan ?? tierName}</h2>
                  </div>
                  <StatusBadge status={isPaid ? (billing?.status === "connected_grace" ? "grace" : "active") : "free"} />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="rounded-xl border border-white/6 bg-white/[0.02] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Expires</div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      {billing?.expiresAt ? formatDate(billing.expiresAt) : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/6 bg-white/[0.02] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Days Left</div>
                    <div className="mt-1 text-sm font-semibold" style={{ color: (billing?.daysRemaining ?? 0) <= 7 ? "#f87171" : "#22d3ee" }}>
                      {billing?.daysRemaining != null ? `${billing.daysRemaining} days` : "—"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {!isPaid ? (
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
                      style={{ background: "linear-gradient(135deg, #22d3ee, #0ea5e9)", color: "#04060d" }}
                    >
                      <Zap className="w-4 h-4" />
                      Upgrade Plan
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/[0.07]"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Change Plan
                    </Link>
                  )}
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/[0.07]"
                  >
                    <Shield className="w-4 h-4" />
                    Settings
                  </Link>
                </div>
              </GlassCard>

              {/* Quick stats */}
              <div className="space-y-4">
                <GlassCard padding="md">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)" }}>
                      <Wallet className="w-4 h-4 text-cyan-300" />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Wallet</div>
                      <div className="text-sm font-mono text-white">{address.slice(0, 8)}…{address.slice(-6)}</div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard padding="md">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
                      <CreditCard className="w-4 h-4 text-emerald-300" />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Settlement</div>
                      <div className="text-sm font-semibold text-white">TAO On-chain</div>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: "#64748b" }}>All payments settle on-chain via Bittensor transfer with memo matching.</p>
                </GlassCard>

                <GlassCard padding="md">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
                      <Receipt className="w-4 h-4 text-purple-300" />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Payments</div>
                      <div className="text-sm font-semibold text-white">{payments.length} recorded</div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          </FadeIn>

          {/* ── Available Plans ──────────────────────────────────── */}
          {!isPaid && plans.length > 0 && (
            <FadeIn>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Layers3 className="w-4 h-4 text-cyan-400" />
                  Available Plans
                </h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {plans.map((plan) => (
                  <GlassCard key={plan.id} padding="md">
                    <h4 className="text-base font-semibold text-white mb-1">{plan.name}</h4>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-xl font-bold" style={{ color: "#22d3ee" }}>{plan.monthlyPrice}</span>
                      <span className="text-xs text-slate-500">τ/month</span>
                    </div>
                    <div className="text-[11px] mb-4" style={{ color: "#64748b" }}>
                      or {plan.annualPrice} τ/year (save {Math.round((1 - plan.annualPrice / (plan.monthlyPrice * 12)) * 100)}%)
                    </div>
                    <Link
                      href={`/pricing?plan=${plan.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                      style={{ background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.22)", color: "#22d3ee" }}
                    >
                      Select Plan <ArrowRight className="w-3 h-3" />
                    </Link>
                  </GlassCard>
                ))}
              </div>
            </FadeIn>
          )}

          {/* ── Payment History ──────────────────────────────────── */}
          <FadeIn>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-400" />
                Payment History
              </h3>
            </div>

            {payments.length === 0 ? (
              <GlassCard padding="md" className="text-center py-10">
                <Receipt className="w-8 h-8 mx-auto mb-3" style={{ color: "#334155" }} />
                <p className="text-sm" style={{ color: "#94a3b8" }}>No payments yet</p>
                <p className="text-xs mt-1" style={{ color: "#64748b" }}>
                  Your payment history will appear here after your first subscription payment.
                </p>
              </GlassCard>
            ) : (
              <GlassCard padding="md">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <th className="text-left pb-3 text-xs font-semibold text-slate-500">Date</th>
                        <th className="text-left pb-3 text-xs font-semibold text-slate-500">Plan</th>
                        <th className="text-right pb-3 text-xs font-semibold text-slate-500">Amount</th>
                        <th className="text-center pb-3 text-xs font-semibold text-slate-500">Status</th>
                        <th className="text-right pb-3 text-xs font-semibold text-slate-500">Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td className="py-3 text-slate-300">{formatDate(p.date)}</td>
                          <td className="py-3 text-white font-medium">{p.plan}</td>
                          <td className="py-3 text-right tabular-nums" style={{ color: "#22d3ee" }}>
                            {p.amount.toFixed(2)} τ
                          </td>
                          <td className="py-3 text-center">
                            <StatusBadge status={p.status} />
                          </td>
                          <td className="py-3 text-right">
                            {p.txHash ? (
                              <span className="font-mono text-xs text-slate-500">
                                {p.txHash.slice(0, 8)}…
                              </span>
                            ) : (
                              <span className="text-xs text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            )}
          </FadeIn>

          {/* ── Billing Notes ───────────────────────────────────── */}
          <FadeIn>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: Shield, title: "Non-custodial", detail: "Tyvera never controls your funds. Payments are standard on-chain TAO transfers verified by memo matching." },
                { icon: Lock, title: "No auto-renewal", detail: "Subscriptions don't auto-renew. You choose when to extend by sending a new payment before expiry." },
                { icon: Receipt, title: "On-chain receipts", detail: "Every payment is an on-chain transaction with a unique memo. Your tx hash serves as your receipt." },
              ].map(({ icon: Icon, title, detail }) => (
                <GlassCard key={title} padding="md">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.15)" }}>
                      <Icon className="w-4 h-4 text-cyan-300" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{title}</div>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: "#94a3b8" }}>{detail}</p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </FadeIn>
        </>
      )}
    </div>
  );
}
