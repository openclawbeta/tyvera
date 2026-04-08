"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Zap, TrendingUp, Shield, Building2, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "annual";

interface PricingTier {
  name: string;
  planId: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  taoEstimate: string;
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
    taoEstimate: "Free",
    icon: <Zap className="w-5 h-5" />,
    accent: "text-slate-300",
    accentBorder: "rgba(148,163,184,0.2)",
    accentBg: "rgba(148,163,184,0.05)",
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
      "Subnets": "Top 20",
      "Validators": "Top 25",
      "AI Queries": "5/day",
      "Strategies": "1",
      "Alert Rules": "—",
      "Tax Export": "—",
      "API Access": "—",
    },
  },
  {
    name: "Analyst",
    planId: "ANALYST",
    tagline: "Full data access for active stakers",
    monthlyPrice: 9,
    annualPrice: 86,
    taoEstimate: "~0.025 τ/mo",
    icon: <TrendingUp className="w-5 h-5" />,
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
      "Subnets": "All",
      "Validators": "All",
      "AI Queries": "25/day",
      "Strategies": "All 5",
      "Alert Rules": "3",
      "Tax Export": "1/mo",
      "API Access": "—",
    },
  },
  {
    name: "Strategist",
    planId: "STRATEGIST",
    tagline: "AI-powered edge for power users",
    monthlyPrice: 29,
    annualPrice: 278,
    taoEstimate: "~0.08 τ/mo",
    icon: <Shield className="w-5 h-5" />,
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
      "API access (1,000 calls/day)",
    ],
    limits: {
      "Subnets": "All",
      "Validators": "All",
      "AI Queries": "Unlimited",
      "Strategies": "All 5",
      "Alert Rules": "Unlimited",
      "Tax Export": "Unlimited",
      "API Access": "1K/day",
    },
  },
  {
    name: "Institutional",
    planId: "INSTITUTIONAL",
    tagline: "For funds, DAOs, and subnet teams",
    monthlyPrice: 99,
    annualPrice: 950,
    taoEstimate: "~0.27 τ/mo",
    icon: <Building2 className="w-5 h-5" />,
    accent: "text-amber-400",
    accentBorder: "rgba(251,191,36,0.25)",
    accentBg: "rgba(251,191,36,0.06)",
    accentGlow: "0 0 40px rgba(251,191,36,0.06)",
    cta: "Contact Us",
    features: [
      "Everything in Strategist",
      "Unlimited API access",
      "Custom webhooks (Slack, Discord, Telegram)",
      "Team access (up to 5 wallets)",
      "White-label embeddable charts",
      "Priority support (<4hr response)",
      "Early access to beta features",
      "Custom analytics reports",
    ],
    limits: {
      "Subnets": "All",
      "Validators": "All",
      "AI Queries": "Unlimited",
      "Strategies": "All 5",
      "Alert Rules": "Unlimited",
      "Tax Export": "Unlimited",
      "API Access": "Unlimited",
    },
  },
];

const COMPARISON_FEATURES = [
  { category: "Data Access", items: [
    { name: "Subnet explorer", tiers: ["Top 20", "All", "All", "All"] },
    { name: "View modes (table, cards, heatmap)", tiers: ["Table only", "All 3", "All 3", "All 3"] },
    { name: "Category browsing", tiers: [false, true, true, true] },
    { name: "Subnet comparison panel", tiers: [false, false, true, true] },
    { name: "Network alerts (whale/dereg/coldkey)", tiers: [false, false, true, true] },
    { name: "Validators", tiers: ["Top 25", "All", "All", "All"] },
    { name: "Validator grid view", tiers: [false, true, true, true] },
  ]},
  { category: "Analytics", items: [
    { name: "Yield calculator", tiers: ["Basic", "Full", "Full", "Full"] },
    { name: "AI Intel queries", tiers: ["5/day", "25/day", "Unlimited", "Unlimited"] },
    { name: "Backtest strategies", tiers: ["Hold only", "All 5", "All 5", "All 5"] },
    { name: "Recommendations engine", tiers: [false, false, true, true] },
    { name: "Custom guardrails", tiers: [false, false, true, true] },
  ]},
  { category: "Portfolio & Activity", items: [
    { name: "Dashboard (personal)", tiers: [false, true, true, true] },
    { name: "Portfolio tracking", tiers: [false, false, true, true] },
    { name: "Activity history", tiers: [false, "30 days", "All time", "All time"] },
  ]},
  { category: "Alerts & Exports", items: [
    { name: "Smart alert rules", tiers: [false, "3 rules", "Unlimited", "Unlimited"] },
    { name: "Alert presets", tiers: [false, false, true, true] },
    { name: "Tax report (real data)", tiers: [false, true, true, true] },
    { name: "CSV export", tiers: [false, "1/mo", "Unlimited", "Unlimited"] },
  ]},
  { category: "Platform", items: [
    { name: "API access", tiers: [false, false, "1K/day", "Unlimited"] },
    { name: "Custom webhooks", tiers: [false, false, false, true] },
    { name: "Team access", tiers: [false, false, false, "5 wallets"] },
    { name: "White-label embeds", tiers: [false, false, false, true] },
    { name: "Priority support", tiers: [false, false, false, true] },
    { name: "Early access / beta features", tiers: [false, false, false, true] },
  ]},
];

function TierValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-400 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-slate-600 mx-auto" />;
  return <span className="text-xs text-slate-300 font-medium">{value}</span>;
}

interface PaymentInstructions {
  plan: string;
  display_name: string;
  amount_tao: number;
  deposit_address: string;
  memo: string;
  billing: string;
  expires_at: string;
}

export default function PricingPage() {
  const router = useRouter();
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInstructions | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (planId === "FREE") {
      router.push("/subnets");
      return;
    }
    setSubscribing(planId);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: "CONNECT_WALLET", // In production, comes from wallet context
          plan: planId,
          billing,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPaymentInfo(data);
      }
    } catch {
      // Handle error
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-10">
      <PageHeader
        title="Pricing"
        subtitle="Transparent tiers — pay in TAO or fiat, upgrade anytime"
      />

      {/* Billing Toggle */}
      <FadeIn>
        <div className="flex justify-center">
          <div
            className="inline-flex items-center gap-1 p-1 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <button
              onClick={() => setBilling("monthly")}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-medium transition-all",
                billing === "monthly"
                  ? "bg-white/10 text-white"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-medium transition-all relative",
                billing === "annual"
                  ? "bg-white/10 text-white"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              Annual
              <span
                className="absolute -top-2 -right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(52,211,153,0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(52,211,153,0.3)",
                }}
              >
                -20%
              </span>
            </button>
          </div>
        </div>
      </FadeIn>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {TIERS.map((tier, idx) => {
          const price = billing === "monthly" ? tier.monthlyPrice : Math.round(tier.annualPrice / 12);
          const totalAnnual = tier.annualPrice;

          return (
            <FadeIn key={tier.name} delay={idx * 80}>
              <div
                className={cn(
                  "relative rounded-2xl flex flex-col h-full",
                  tier.popular && "ring-1"
                )}
                style={{
                  background: `linear-gradient(170deg, ${tier.accentBg} 0%, rgba(255,255,255,0.012) 40%)`,
                  border: `1px solid ${tier.accentBorder}`,
                  boxShadow: tier.accentGlow
                    ? `${tier.accentGlow}, 0 4px 24px rgba(0,0,0,0.3)`
                    : "0 4px 24px rgba(0,0,0,0.3)",
                  ...(tier.popular ? { ringColor: "rgba(52,211,153,0.3)" } : {}),
                }}
              >
                {/* Popular badge */}
                {tier.popular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-4 py-1 rounded-full"
                    style={{
                      background: "rgba(52,211,153,0.15)",
                      border: "1px solid rgba(52,211,153,0.35)",
                      color: "#34d399",
                    }}
                  >
                    Most Popular
                  </div>
                )}

                <div className="p-6 flex flex-col flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: tier.accentBg,
                        border: `1px solid ${tier.accentBorder}`,
                      }}
                    >
                      <span className={tier.accent}>{tier.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                      <p className="text-xs text-slate-500">{tier.tagline}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-5">
                    <div className="flex items-baseline gap-1">
                      {tier.monthlyPrice === 0 ? (
                        <span className="text-3xl font-bold text-white">Free</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-white">${price}</span>
                          <span className="text-sm text-slate-500">/mo</span>
                        </>
                      )}
                    </div>
                    {tier.monthlyPrice > 0 && billing === "annual" && (
                      <p className="text-xs text-slate-500 mt-1">
                        ${totalAnnual}/year &middot; {tier.taoEstimate}
                      </p>
                    )}
                    {tier.monthlyPrice > 0 && billing === "monthly" && (
                      <p className="text-xs text-slate-500 mt-1">
                        {tier.taoEstimate}
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => handleSubscribe(tier.planId)}
                    disabled={subscribing === tier.planId}
                    className={cn(
                      "w-full py-2.5 rounded-xl text-sm font-semibold transition-all mb-6",
                      "flex items-center justify-center gap-2",
                      tier.popular
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                        : "bg-white/[0.06] text-slate-300 border border-white/[0.08] hover:bg-white/[0.1]",
                      subscribing === tier.planId && "opacity-50 cursor-wait"
                    )}
                  >
                    {subscribing === tier.planId ? "Processing..." : tier.cta}
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Features */}
                  <div className="space-y-2.5 flex-1">
                    {tier.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5">
                        <Check
                          className={cn("w-4 h-4 mt-0.5 shrink-0", tier.accent)}
                        />
                        <span className="text-[13px] text-slate-400 leading-snug">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          );
        })}
      </div>

      {/* TAO Payment Note */}
      <FadeIn>
        <div
          className="rounded-xl px-5 py-4 flex items-start gap-3"
          style={{
            background: "rgba(34,211,238,0.04)",
            border: "1px solid rgba(34,211,238,0.12)",
          }}
        >
          <Zap className="w-4 h-4 mt-0.5 shrink-0 text-cyan-400" />
          <div className="text-sm text-slate-400 leading-relaxed">
            <span className="font-semibold text-cyan-300">Pay in TAO.</span>{" "}
            All paid tiers can be activated on-chain with TAO. Prices in TAO are recalculated weekly based on the current TAO/USD rate. Annual plans get 20% off.
          </div>
        </div>
      </FadeIn>

      {/* Comparison Table */}
      <FadeIn>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Feature Comparison</h2>

          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.018)",
              border: "1px solid rgba(255,255,255,0.065)",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[280px]">
                      Feature
                    </th>
                    {TIERS.map((tier) => (
                      <th
                        key={tier.name}
                        className={cn(
                          "px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider",
                          tier.accent
                        )}
                      >
                        {tier.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map((section) => (
                    <>
                      {/* Section header */}
                      <tr key={`section-${section.category}`}>
                        <td
                          colSpan={5}
                          className="px-5 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest"
                          style={{ background: "rgba(255,255,255,0.02)" }}
                        >
                          {section.category}
                        </td>
                      </tr>
                      {section.items.map((item) => (
                        <tr
                          key={item.name}
                          className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors"
                        >
                          <td className="px-5 py-2.5 text-[13px] text-slate-400">
                            {item.name}
                          </td>
                          {item.tiers.map((val, i) => (
                            <td key={i} className="px-4 py-2.5 text-center">
                              <TierValue value={val} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                  {/* CTA row at bottom of comparison */}
                  <tr>
                    <td className="px-5 py-4" />
                    {TIERS.map((tier) => (
                      <td key={tier.name} className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleSubscribe(tier.planId)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                            tier.popular
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                              : "bg-white/[0.06] text-slate-300 border border-white/[0.08] hover:bg-white/[0.1]",
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

      {/* FAQ-style bottom section */}
      <FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-8">
          <div
            className="rounded-xl p-5"
            style={{
              background: "rgba(255,255,255,0.018)",
              border: "1px solid rgba(255,255,255,0.065)",
            }}
          >
            <h3 className="text-sm font-semibold text-white mb-2">7-Day Free Trial</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Connect your wallet and get full Strategist access for 7 days. No credit card required. Downgrade to Explorer anytime.
            </p>
          </div>
          <div
            className="rounded-xl p-5"
            style={{
              background: "rgba(255,255,255,0.018)",
              border: "1px solid rgba(255,255,255,0.065)",
            }}
          >
            <h3 className="text-sm font-semibold text-white mb-2">On-Chain Payments</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pay directly in TAO via smart contract. No intermediaries, no KYC for TAO payments. Fiat via Stripe also available.
            </p>
          </div>
          <div
            className="rounded-xl p-5"
            style={{
              background: "rgba(255,255,255,0.018)",
              border: "1px solid rgba(255,255,255,0.065)",
            }}
          >
            <h3 className="text-sm font-semibold text-white mb-2">Upgrade Anytime</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Switch tiers instantly. Pro-rated billing on upgrades, immediate access to new features. Cancel or downgrade at any time.
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Payment Instructions Modal */}
      {paymentInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="rounded-2xl p-6 max-w-md w-full mx-4 space-y-4"
            style={{
              background: "linear-gradient(170deg, rgba(52,211,153,0.04) 0%, rgba(15,23,42,0.98) 30%)",
              border: "1px solid rgba(52,211,153,0.2)",
              boxShadow: "0 0 60px rgba(0,0,0,0.5)",
            }}
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-1">
                Subscribe to {paymentInfo.display_name}
              </h3>
              <p className="text-xs text-slate-500">
                {paymentInfo.billing === "annual" ? "Annual" : "Monthly"} billing
              </p>
            </div>

            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Amount</span>
                <span className="text-white font-semibold">{paymentInfo.amount_tao} τ</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500">Send to:</span>
                <div className="font-mono text-xs text-cyan-300 break-all bg-slate-900/50 p-2 rounded">
                  {paymentInfo.deposit_address}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500">Include memo:</span>
                <div className="font-mono text-sm text-amber-300 bg-slate-900/50 p-2 rounded font-bold">
                  {paymentInfo.memo}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Payment auto-verifies within 10 minutes. Expires{" "}
              {new Date(paymentInfo.expires_at).toLocaleString()}.
            </p>

            <button
              onClick={() => setPaymentInfo(null)}
              className="w-full py-2 rounded-xl text-sm font-medium bg-white/[0.06] text-slate-300 border border-white/[0.08] hover:bg-white/[0.1] transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
