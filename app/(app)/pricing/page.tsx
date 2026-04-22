"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  Zap,
  TrendingUp,
  Shield,
  Building2,
  ArrowRight,
  Layers3,
  Receipt,
  Sparkles,
  Wallet,
  BadgeDollarSign,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet-context";

type BillingCycle = "monthly" | "annual";

interface PricingTier {
  name: string;
  planId: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  icon: React.ReactNode;
  accent: string;
  accentBorder: string;
  accentBg: string;
  accentGlow: string;
  popular?: boolean;
  cta: string;
  features: string[];
  limits: Record<string, string>;
}

const TIERS: PricingTier[] = [
  {
    name: "Explorer",
    planId: "FREE",
    tagline: "Browse the network for free",
    monthlyPrice: 0,
    annualPrice: 0,
    icon: <Zap className="h-5 w-5" />,
    accent: "text-slate-300",
    accentBorder: "rgba(107,104,96,$1)",
    accentBg: "rgba(107,104,96,$1)",
    accentGlow: "",
    cta: "Get Started",
    features: [
      "Subnet explorer (top 20, table view)",
      "Validators (top 25, list view)",
      "Basic yield calculator",
      "AI Intel (5 queries/day)",
      "Backtest (Hold strategy only)",
      "Tax report (example data)",
      "Public dashboard metrics",
    ],
    limits: {
      Subnets: "Top 20",
      Validators: "Top 25",
      "AI Queries": "5/day",
      Strategies: "1",
      "Alert Rules": "—",
      "Tax Export": "—",
      "Internal APIs": "Included",
    },
  },
  {
    name: "Analyst",
    planId: "ANALYST",
    tagline: "Full data access for active stakers",
    monthlyPrice: 19.99,
    annualPrice: 191.9,
    icon: <TrendingUp className="h-5 w-5" />,
    accent: "text-cyan-400",
    accentBorder: "rgba(34,211,238,0.25)",
    accentBg: "rgba(34,211,238,0.06)",
    accentGlow: "0 0 40px rgba(34,211,238,0.06)",
    cta: "Start Analyst",
    features: [
      "All subnets, all views (table, cards, heatmap)",
      "Category browsing with pill filters",
      "Full validator list + grid view",
      "Full yield calculator",
      "AI Intel (25 queries/day)",
      "All 5 backtest strategies",
      "30-day activity history",
      "Smart alerts (up to 3 rules)",
      "Tax report with real wallet data",
      "1 CSV export per month",
      "Personal dashboard with wallet",
    ],
    limits: {
      Subnets: "All",
      Validators: "All",
      "AI Queries": "25/day",
      Strategies: "All 5",
      "Alert Rules": "3",
      "Tax Export": "1/mo",
      "Internal APIs": "Included",
    },
  },
  {
    name: "Strategist",
    planId: "STRATEGIST",
    tagline: "AI-powered edge for power users",
    monthlyPrice: 49.99,
    annualPrice: 479.9,
    icon: <Shield className="h-5 w-5" />,
    accent: "text-emerald-400",
    accentBorder: "rgba(52,211,153,0.25)",
    accentBg: "rgba(52,211,153,0.06)",
    accentGlow: "0 0 40px rgba(52,211,153,0.08)",
    popular: true,
    cta: "Start Strategist",
    features: [
      "Everything in Analyst",
      "Subnet comparison panel",
      "Network alerts (whale, dereg, coldkey)",
      "Unlimited smart alert rules + presets",
      "AI recommendations engine",
      "Custom guardrails & risk parameters",
      "Full portfolio tracking",
      "All-time activity history",
      "Unlimited AI Intel queries",
      "Unlimited tax CSV exports",
      "Advanced portfolio, alerts, and recommendations",
    ],
    limits: {
      Subnets: "All",
      Validators: "All",
      "AI Queries": "Unlimited",
      Strategies: "All 5",
      "Alert Rules": "Unlimited",
      "Tax Export": "Unlimited",
      "Internal APIs": "Included",
    },
  },
  {
    name: "Institutional",
    planId: "INSTITUTIONAL",
    tagline: "For funds, DAOs, and subnet teams",
    monthlyPrice: 99.99,
    annualPrice: 959.9,
    icon: <Building2 className="h-5 w-5" />,
    accent: "text-amber-400",
    accentBorder: "rgba(251,191,36,0.25)",
    accentBg: "rgba(251,191,36,0.06)",
    accentGlow: "0 0 40px rgba(251,191,36,0.06)",
    cta: "Contact Us",
    features: [
      "Everything in Strategist",
      "Priority operational support",
      "Custom webhooks (Slack, Discord, Telegram)",
      "Team access (up to 5 wallets)",
      "White-label embeddable charts",
      "Priority support (<4hr response)",
      "Early access to beta features",
      "Custom analytics reports",
    ],
    limits: {
      Subnets: "All",
      Validators: "All",
      "AI Queries": "Unlimited",
      Strategies: "All 5",
      "Alert Rules": "Unlimited",
      "Tax Export": "Unlimited",
      "Internal APIs": "Included",
    },
  },
];

const COMPARISON_FEATURES = [
  {
    category: "Data Access",
    items: [
      { name: "Subnet explorer", tiers: ["Top 20", "All", "All", "All"] },
      { name: "View modes (table, cards, heatmap)", tiers: ["Table only", "All 3", "All 3", "All 3"] },
      { name: "Category browsing", tiers: [false, true, true, true] },
      { name: "Subnet comparison panel", tiers: [false, false, true, true] },
      { name: "Network alerts (whale/dereg/coldkey)", tiers: [false, false, true, true] },
      { name: "Validators", tiers: ["Top 25", "All", "All", "All"] },
      { name: "Validator grid view", tiers: [false, true, true, true] },
    ],
  },
  {
    category: "Analytics",
    items: [
      { name: "Yield calculator", tiers: ["Basic", "Full", "Full", "Full"] },
      { name: "AI Intel queries", tiers: ["5/day", "25/day", "Unlimited", "Unlimited"] },
      { name: "Backtest strategies", tiers: ["Hold only", "All 5", "All 5", "All 5"] },
      { name: "Recommendations engine", tiers: [false, false, true, true] },
      { name: "Custom guardrails", tiers: [false, false, true, true] },
    ],
  },
  {
    category: "Portfolio & Activity",
    items: [
      { name: "Dashboard (personal)", tiers: [false, true, true, true] },
      { name: "Portfolio tracking", tiers: [false, false, true, true] },
      { name: "Activity history", tiers: [false, "30 days", "All time", "All time"] },
    ],
  },
  {
    category: "Alerts & Exports",
    items: [
      { name: "Smart alert rules", tiers: [false, "3 rules", "Unlimited", "Unlimited"] },
      { name: "Alert presets", tiers: [false, false, true, true] },
      { name: "Tax report (real data)", tiers: [false, true, true, true] },
      { name: "CSV export", tiers: [false, "1/mo", "Unlimited", "Unlimited"] },
    ],
  },
  {
    category: "Platform",
    items: [
      { name: "Internal Tyvera APIs", tiers: ["Included", "Included", "Included", "Included"] },
      { name: "Custom webhooks", tiers: [false, false, false, true] },
      { name: "Team access", tiers: [false, false, false, "5 wallets"] },
      { name: "White-label embeds", tiers: [false, false, false, true] },
      { name: "Priority support", tiers: [false, false, false, true] },
      { name: "Early access / beta features", tiers: [false, false, false, true] },
    ],
  },
];

const TOP_NOTES = [
  {
    label: "Explorer",
    title: "Start free — no card, no wallet.",
    detail: "Browse the top 20 subnets, try out AI queries, and see whether Tyvera fits your workflow before committing to a plan.",
  },
  {
    label: "Analyst / Strategist",
    title: "Upgrade when you\u2019re actually moving TAO.",
    detail: "Paid plans unlock the full 128+ subnet universe, smart alerts, portfolio tracking, and the recommendations engine that pays for itself once you\u2019re rebalancing often.",
  },
  {
    label: "Institutional",
    title: "For desks, funds, and subnet operators.",
    detail: "Team seats, webhook alerts, priority support, and higher API limits. Talk to us if you need SLAs or custom analytics.",
  },
];

function TierValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-emerald-400" />;
  if (value === false) return <X className="mx-auto h-4 w-4 text-slate-600" />;
  return <span className="text-xs font-medium text-slate-300">{value}</span>;
}

interface PaymentInstructions {
  plan: string;
  display_name: string;
  amount_tao: number;
  deposit_address: string;
  memo: string;
  billing: string;
  expires_at: string;
  intent_id?: string;
}

type PaymentStatus = "awaiting_payment" | "confirming" | "confirmed" | "expired" | "error";

export default function PricingPage() {
  const router = useRouter();
  const { address, walletState, openModal } = useWallet();
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInstructions | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("awaiting_payment");
  const [taoUsd, setTaoUsd] = useState<number | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  // Poll payment status when payment info is shown
  useEffect(() => {
    if (!paymentInfo?.memo) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/payment-status?memo=${encodeURIComponent(paymentInfo.memo)}`,
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;

        if (data.status === "confirmed") {
          setPaymentStatus("confirmed");
        } else if (data.status === "confirming") {
          setPaymentStatus("confirming");
        } else if (data.status === "expired") {
          setPaymentStatus("expired");
        } else {
          // Check if expiry has passed client-side
          if (new Date(paymentInfo.expires_at).getTime() < Date.now()) {
            setPaymentStatus("expired");
          }
        }
      } catch {
        // Silently continue polling
      }
    };

    // Poll every 15 seconds
    poll();
    const timer = setInterval(poll, 15_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [paymentInfo?.memo, paymentInfo?.expires_at]);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch("/api/tao-rate");
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.taoUsd === "number" && data.taoUsd > 0) {
          setTaoUsd(data.taoUsd);
        }
      } catch {
        // Keep null and hide TAO estimate.
      }
    };
    fetchRate();
  }, []);

  const usdToTao = (usd: number): string => {
    if (!taoUsd || usd === 0) return "";
    const tao = usd / taoUsd;
    if (tao >= 1) return `~${tao.toFixed(2)} τ/mo`;
    if (tao >= 0.01) return `~${tao.toFixed(3)} τ/mo`;
    return `~${tao.toFixed(4)} τ/mo`;
  };

  const handleSubscribe = async (planId: string) => {
    setSubscribeError(null);

    if (planId === "FREE") {
      router.push("/subnets");
      return;
    }

    if (planId === "INSTITUTIONAL") {
      window.open("mailto:tyvera.ai@gmail.com?subject=Institutional%20Plan%20Inquiry", "_blank");
      return;
    }

    if (!address || walletState === "disconnected") {
      openModal();
      return;
    }

    setSubscribing(planId);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, plan: planId, billing }),
      });
      const data = await res.json();
      if (res.ok) {
        setPaymentInfo(data);
        setPaymentStatus("awaiting_payment");
      } else {
        setSubscribeError(data.error || "Failed to create subscription");
      }
    } catch {
      setSubscribeError("Network error — please try again");
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-10">
      <PageHeader
        title="Pricing"
        subtitle="Operator-grade plans for subnet research, allocation workflows, and premium Bittensor intelligence"
      />

      <FadeIn>
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div
            className="relative overflow-hidden rounded-[28px] border border-white/8 p-6 md:p-7"
            style={{
              background:
                "linear-gradient(160deg, rgba(34,211,238,0.08) 0%, rgba(79,124,255,0.05) 28%, rgba(255,255,255,0.018) 62%, rgba(255,255,255,0.012) 100%)",
              boxShadow:
                "0 24px 80px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 40px rgba(34,211,238,0.04)",
            }}
          >
            <div className="absolute right-0 top-0 h-40 w-56 pointer-events-none" style={{ background: "radial-gradient(circle at top right, rgba(34,211,238,0.16), transparent 68%)" }} />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                <Layers3 className="h-3 w-3" />
                pricing architecture
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white md:text-[40px]">
                Pay in TAO or USD —
                <span className="block bg-[linear-gradient(135deg,#67e8f9_0%,#4f7cff_55%,#8b5cf6_100%)] bg-clip-text text-transparent">
                  pricing that scales with you.
                </span>
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-[15px]">
                Explorer is free forever. Analyst and Strategist unlock the full subnet universe and decision tooling.
                Institutional adds team seats, webhook alerts, and priority support.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {[
                  { label: "Pay with", value: "TAO or USD", note: taoUsd ? `1 τ = $${taoUsd.toFixed(2)} right now` : "Live TAO rate when available", tone: "text-cyan-300", icon: Wallet },
                  { label: "Price shown", value: "USD anchor", note: "TAO equivalent updates with live rate", tone: "text-white", icon: BadgeDollarSign },
                  { label: "Cancel anytime", value: "Monthly or yearly", note: "No lock-in — downgrade or cancel in one click", tone: "text-emerald-300", icon: Shield },
                ].map(({ label, value, note, tone, icon: Icon }) => (
                  <div key={label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </div>
                    <div className={cn("mt-2 text-base font-semibold tracking-tight", tone)}>{value}</div>
                    <div className="mt-1 text-xs text-slate-500">{note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {TOP_NOTES.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 shadow-[0_14px_50px_rgba(0,0,0,0.24)]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                <div className="mt-3 text-lg font-semibold tracking-tight text-white">{item.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      <FadeIn>
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-xl border border-white/8 bg-white/[0.03] p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-lg px-5 py-2 text-sm font-medium transition-all",
                billing === "monthly" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300",
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={cn(
                "relative rounded-lg px-5 py-2 text-sm font-medium transition-all",
                billing === "annual" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300",
              )}
            >
              Annual
              <span
                className="absolute -right-2 -top-2 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300"
              >
                -20%
              </span>
            </button>
          </div>
        </div>
      </FadeIn>

      <FadeIn>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            At a glance
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                title: "Free (Explorer)",
                body: "Browse the top 20 subnets, run 5 AI queries a day, see today's leaderboard. No wallet required.",
                tone: "text-slate-200",
                border: "border-white/10",
                bg: "bg-white/[0.02]",
              },
              {
                title: "Paid ($19.99+/mo)",
                body: "All 128+ subnets, every view mode, smart alerts, full yield calculator, 25+ AI queries/day, 30-day+ history.",
                tone: "text-cyan-200",
                border: "border-cyan-400/25",
                bg: "bg-cyan-400/[0.05]",
              },
              {
                title: "Strategist ($49.99/mo)",
                body: "Adds recommendations engine, unlimited alerts, portfolio tracking, and unlimited AI Intel / tax CSV exports.",
                tone: "text-emerald-200",
                border: "border-emerald-400/25",
                bg: "bg-emerald-400/[0.05]",
              },
            ].map(({ title, body, tone, border, bg }) => (
              <div key={title} className={cn("rounded-2xl border p-4", border, bg)}>
                <div className={cn("text-sm font-semibold tracking-tight", tone)}>{title}</div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-500">
            All plans include internal Tyvera APIs. Institutional adds team access, webhooks, and priority support — see the full table below.
          </p>
        </div>
      </FadeIn>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Plan board
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {TIERS.map((tier, idx) => {
          const price = billing === "monthly" ? tier.monthlyPrice : Math.round((tier.annualPrice / 12) * 100) / 100;
          const totalAnnual = tier.annualPrice;

          return (
            <FadeIn key={tier.name} delay={idx * 0.08}>
              <div
                className={cn("relative flex h-full flex-col overflow-hidden rounded-2xl", tier.popular && "ring-1")}
                style={{
                  background: `linear-gradient(170deg, ${tier.accentBg} 0%, rgba(255,255,255,0.012) 40%)`,
                  border: `1px solid ${tier.accentBorder}`,
                  boxShadow: tier.accentGlow ? `${tier.accentGlow}, 0 4px 24px rgba(0,0,0,0.3)` : "0 4px 24px rgba(0,0,0,0.3)",
                  ...(tier.popular ? { ringColor: "rgba(52,211,153,0.3)" } : {}),
                }}
              >
                {tier.popular && (
                  <div
                    className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full px-4 py-1 text-[11px] font-bold"
                    style={{
                      background: "rgba(52,211,153,0.15)",
                      border: "1px solid rgba(52,211,153,0.35)",
                      color: "var(--aurora-up)",
                    }}
                  >
                    Most Popular
                  </div>
                )}

                {tier.popular && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-20" style={{ background: "radial-gradient(ellipse at top, rgba(52,211,153,0.12), transparent 70%)" }} />
                )}

                <div className="relative flex flex-1 flex-col p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: tier.accentBg, border: `1px solid ${tier.accentBorder}` }}>
                      <span className={tier.accent}>{tier.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                      <p className="text-xs text-slate-500">{tier.tagline}</p>
                    </div>
                  </div>

                  <div className="mb-4 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {tier.monthlyPrice === 0
                      ? "Entry layer"
                      : tier.popular
                        ? "Best value workflow"
                        : tier.planId === "INSTITUTIONAL"
                          ? "Team / desk access"
                          : "Core operator access"}
                  </div>

                  <div className="mb-5">
                    <div className="flex items-baseline gap-1">
                      {tier.monthlyPrice === 0 ? (
                        <span className="text-3xl font-bold text-white">Free</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-white">${price % 1 === 0 ? price : price.toFixed(2)}</span>
                          <span className="text-sm text-slate-500">/mo</span>
                        </>
                      )}
                    </div>

                    {tier.monthlyPrice > 0 && billing === "annual" && (
                      <p className="mt-1 text-xs text-slate-500">
                        ${totalAnnual}/year
                        {taoUsd && <> &middot; {usdToTao(price)}</>}
                      </p>
                    )}

                    {tier.monthlyPrice > 0 && billing === "monthly" && taoUsd && (
                      <p className="mt-1 text-xs text-slate-500">{usdToTao(tier.monthlyPrice)}</p>
                    )}
                  </div>

                  <div className="mb-5 grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(tier.limits)
                      .slice(0, 4)
                      .map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{key}</div>
                          <div className="mt-1 font-medium text-slate-300">{value}</div>
                        </div>
                      ))}
                  </div>

                  <button
                    onClick={() => handleSubscribe(tier.planId)}
                    disabled={subscribing === tier.planId}
                    className={cn(
                      "mb-6 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-all",
                      tier.popular
                        ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                        : "border-white/[0.08] bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]",
                      subscribing === tier.planId && "cursor-wait opacity-50",
                    )}
                  >
                    {subscribing === tier.planId ? "Processing..." : tier.cta}
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="flex-1 space-y-2.5">
                    {tier.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5">
                        <Check className={cn("mt-0.5 h-4 w-4 shrink-0", tier.accent)} />
                        <span className="text-[13px] leading-snug text-slate-400">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          );
        })}
      </div>

      <FadeIn>
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-cyan-400/12 bg-cyan-400/[0.04] p-5 shadow-[0_14px_50px_rgba(0,0,0,0.24)]">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              <Wallet className="h-3.5 w-3.5" />
              TAO payment model
            </div>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-400">
              <p>
                <span className="font-semibold text-cyan-300">Pay in TAO.</span> Paid plans can be activated on-chain, with the TAO equivalent updating from the live TAO/USD rate when available.
              </p>
              <p>
                Annual billing applies a 20% discount. Review the destination, memo, and quoted amount before confirming any transfer.
              </p>
              {taoUsd && <p className="text-cyan-200">Current reference rate: 1 τ = ${taoUsd.toFixed(2)}</p>}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-white/[0.022] p-5 shadow-[0_14px_50px_rgba(0,0,0,0.24)]">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
              access model notes
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                {
                  title: "Evaluation first",
                  detail: "Start with Explorer to validate the product before moving into paid operator workflows.",
                  icon: Sparkles,
                },
                {
                  title: "TAO-native settlement",
                  detail: "Paid access is designed around on-chain TAO settlement rather than conventional card-first billing.",
                  icon: Receipt,
                },
                {
                  title: "Scale with workflow depth",
                  detail: "Upgrade as your process matures from scanning to active research, alerts, and recommendation-driven allocation.",
                  icon: TrendingUp,
                },
              ].map(({ title, detail, icon: Icon }) => (
                <div key={title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
                    <Icon className="h-4 w-4 text-slate-400" />
                    {title}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn>
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Feature comparison
          </div>

          <div className="overflow-hidden rounded-xl border border-white/[0.065] bg-white/[0.018]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="w-[280px] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Feature
                    </th>
                    {TIERS.map((tier) => (
                      <th key={tier.name} className={cn("px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider", tier.accent)}>
                        {tier.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map((section) => (
                    <React.Fragment key={section.category}>
                      <tr>
                        <td colSpan={5} className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500" style={{ background: "rgba(255,255,255,0.02)" }}>
                          {section.category}
                        </td>
                      </tr>
                      {section.items.map((item) => (
                        <tr key={item.name} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.015]">
                          <td className="px-5 py-2.5 text-[13px] text-slate-400">{item.name}</td>
                          {item.tiers.map((val, i) => (
                            <td key={i} className="px-4 py-2.5 text-center">
                              <TierValue value={val} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  <tr>
                    <td className="px-5 py-4" />
                    {TIERS.map((tier) => (
                      <td key={tier.name} className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleSubscribe(tier.planId)}
                          className={cn(
                            "rounded-lg border px-4 py-2 text-xs font-semibold transition-all",
                            tier.popular
                              ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                              : "border-white/[0.08] bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]",
                          )}
                        >
                          {tier.cta}
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </FadeIn>

      {subscribeError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-5 py-3">
          <X className="h-4 w-4 shrink-0 text-red-400" />
          <span className="text-sm text-red-300">{subscribeError}</span>
          <button onClick={() => setSubscribeError(null)} className="ml-auto text-xs text-slate-500 hover:text-slate-300">
            Dismiss
          </button>
        </div>
      )}

      {paymentInfo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm">
          <div
            className="mx-0 sm:mx-4 w-full max-w-md space-y-4 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
            style={{
              background: "linear-gradient(170deg, rgba(52,211,153,0.04) 0%, rgba(15,23,42,0.98) 30%)",
              border: "1px solid rgba(52,211,153,0.2)",
              boxShadow: "0 0 60px rgba(0,0,0,0.5)",
            }}
          >
            <div className="text-center">
              <h3 className="mb-1 text-lg font-semibold text-white">Subscribe to {paymentInfo.display_name}</h3>
              <p className="text-xs text-slate-500">{paymentInfo.billing === "annual" ? "Annual" : "Monthly"} billing</p>
            </div>

            <div className="space-y-3 rounded-xl border border-white/[0.06] bg-black/30 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Amount</span>
                <span className="font-semibold text-white">{paymentInfo.amount_tao} τ</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500">Send to:</span>
                <div className="break-all rounded bg-slate-900/50 p-2 font-mono text-xs text-cyan-300">{paymentInfo.deposit_address}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500">Include memo:</span>
                <div className="rounded bg-slate-900/50 p-2 font-mono text-sm font-bold text-amber-300">{paymentInfo.memo}</div>
              </div>
            </div>

            {/* Payment status indicator */}
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background:
                  paymentStatus === "confirmed"
                    ? "rgba(52,211,153,0.08)"
                    : paymentStatus === "confirming"
                      ? "rgba(34,211,238,0.06)"
                      : paymentStatus === "expired"
                        ? "rgba(248,113,113,0.06)"
                        : "rgba(251,191,36,0.04)",
                border: `1px solid ${
                  paymentStatus === "confirmed"
                    ? "rgba(52,211,153,0.2)"
                    : paymentStatus === "confirming"
                      ? "rgba(34,211,238,0.18)"
                      : paymentStatus === "expired"
                        ? "rgba(248,113,113,0.18)"
                        : "rgba(251,191,36,0.14)"
                }`,
              }}
            >
              {paymentStatus === "awaiting_payment" && (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                  <span className="text-xs text-amber-300">Waiting for payment — send TAO to the address above</span>
                </>
              )}
              {paymentStatus === "confirming" && (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                  <span className="text-xs text-cyan-300">Payment detected — awaiting block confirmations...</span>
                </>
              )}
              {paymentStatus === "confirmed" && (
                <>
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-300">Payment confirmed! Your subscription is now active.</span>
                </>
              )}
              {paymentStatus === "expired" && (
                <>
                  <X className="h-4 w-4 shrink-0 text-red-400" />
                  <span className="text-xs text-red-300">Payment window expired. Please start a new subscription.</span>
                </>
              )}
            </div>

            {paymentStatus !== "confirmed" && paymentStatus !== "expired" && (
              <p className="text-center text-xs text-slate-500">
                Auto-checking every 15s. Expires {new Date(paymentInfo.expires_at).toLocaleString()}.
              </p>
            )}

            <button
              onClick={() => {
                setPaymentInfo(null);
                if (paymentStatus === "confirmed") {
                  router.push("/settings");
                }
              }}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.06] py-2 text-sm font-medium text-slate-300 transition-all hover:bg-white/[0.1]"
            >
              {paymentStatus === "confirmed" ? "Go to Settings" : "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
