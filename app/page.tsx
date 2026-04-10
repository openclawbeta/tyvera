"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { Zap, ArrowRight, Shield, Lock, Eye, CheckCircle, Network, Lightbulb, Wallet, BarChart2, Sparkles, Layers3 } from "lucide-react";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { cn } from "@/lib/utils";

const TICKER_FALLBACK = [
  { name: "SN15 Blockchain Insights", yield: "+0.23%/day", up: true },
  { name: "SN126", yield: "+0.19%/day", up: true },
  { name: "SN107", yield: "+0.18%/day", up: true },
  { name: "SN114", yield: "+0.11%/day", up: true },
  { name: "SN38 Distributed Training", yield: "+0.10%/day", up: true },
  { name: "SN100", yield: "+0.10%/day", up: true },
  { name: "SN120", yield: "+0.09%/day", up: true },
];

interface LiveSubnet {
  netuid: number;
  name: string;
  yield: number;
  emissions: number;
  risk: string;
  liquidity: number;
  yieldDelta7d: number;
}

const FEATURES = [
  {
    icon: Network,
    title: "Live Subnet Intelligence",
    desc: "Scored, ranked, and analyzed across yield, liquidity, momentum, and risk — refreshed from the chain continuously.",
    accent: "#22d3ee",
    bg: "rgba(34,211,238,0.07)",
    bdr: "rgba(34,211,238,0.18)",
  },
  {
    icon: Lightbulb,
    title: "Recommendation Engine",
    desc: "Multi-factor scoring that accounts for fees, concentration, volatility, and churn. Recommendations only fire when the edge is real.",
    accent: "#8b5cf6",
    bg: "rgba(139,92,246,0.07)",
    bdr: "rgba(139,92,246,0.18)",
  },
  {
    icon: Wallet,
    title: "Assisted Reallocation",
    desc: "We build the transaction. You sign it in your own wallet. The platform never touches your keys or executes anything autonomously.",
    accent: "#34d399",
    bg: "rgba(52,211,153,0.07)",
    bdr: "rgba(52,211,153,0.18)",
  },
  {
    icon: BarChart2,
    title: "Portfolio Analytics",
    desc: "Track your staked positions, weighted yield, earnings history, and concentration risk across all subnets in one view.",
    accent: "#fbbf24",
    bg: "rgba(251,191,36,0.07)",
    bdr: "rgba(251,191,36,0.18)",
  },
];

const STEPS = [
  { n: "01", title: "Connect wallet", desc: "Link your Bittensor wallet via Polkadot.js extension. Read-only until you approve a move." },
  { n: "02", title: "Explore subnets", desc: "Browse scored subnet analytics. Filter by yield, risk, momentum, and liquidity depth." },
  { n: "03", title: "Review recommendations", desc: "The engine surfaces reallocation opportunities with full rationale and risk explanation." },
  { n: "04", title: "Approve in wallet", desc: "You review the transaction, sign in your wallet, and submit. We never move stake without your signature." },
];

const TRUST = [
  { icon: Shield, text: "You approve every move.", sub: "No silent execution. Ever." },
  { icon: Lock, text: "No seed phrase storage.", sub: "We can't access your keys." },
  { icon: Eye, text: "Full transaction transparency.", sub: "See exactly what you're signing." },
  { icon: CheckCircle, text: "Wallet remains under your control.", sub: "Non-custodial, end-to-end." },
];

const ACCENT_COLORS = ["#22d3ee", "#8b5cf6", "#34d399"];
const GRADIENT_CLASSES = ["from-cyan-500 to-blue-600", "from-violet-500 to-purple-700", "from-emerald-500 to-teal-700"];

function formatLiquidity(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M τ`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} τ`;
  return `${val.toFixed(0)} τ`;
}

export default function HomePage() {
  const [ticker, setTicker] = useState(TICKER_FALLBACK);
  const [featured, setFeatured] = useState<LiveSubnet[]>([]);

  useEffect(() => {
    fetchWithTimeout("/api/subnets", { timeoutMs: 10_000 })
      .then((r) => (r.ok ? r.json() : null))
      .then((raw) => {
        const data = Array.isArray(raw) ? raw : raw?.subnets ?? [];
        if (!Array.isArray(data) || data.length === 0) return;

        const withDaily = [...data]
          .filter((s: LiveSubnet) => s.netuid > 0 && s.emissions > 0 && s.liquidity > 0)
          .map((s: LiveSubnet) => ({ ...s, dailyYield: (s.emissions / s.liquidity) * 100 }))
          .sort((a, b) => b.dailyYield - a.dailyYield);

        const tickerItems = withDaily.slice(0, 12).map((s) => ({
          name: /^SN\d+$/.test(s.name) ? `SN${s.netuid}` : `SN${s.netuid} ${s.name}`,
          yield: `+${s.dailyYield.toFixed(2)}%/day`,
          up: s.dailyYield > 0,
        }));
        if (tickerItems.length > 0) setTicker(tickerItems);

        setFeatured(withDaily.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen text-slate-100 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_20%),radial-gradient(circle_at_78%_18%,rgba(59,130,246,0.1),transparent_20%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.05),transparent_24%)]" style={{ backgroundColor: "#06070f" }}>
      <nav
        className="fixed inset-x-0 top-0 z-50 flex h-16 items-center"
        style={{
          background: "linear-gradient(180deg, rgba(8,10,18,0.9), rgba(7,9,16,0.78))",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 10px 32px rgba(0,0,0,0.22)",
          backdropFilter: "blur(24px) saturate(1.6)",
        }}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-[10px]"
              style={{
                background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                boxShadow: "0 0 0 1px rgba(34,211,238,0.3), 0 4px 14px rgba(34,211,238,0.22)",
              }}
            >
              <Zap className="h-4 w-4 text-black" strokeWidth={2.5} />
            </div>
            <span className="text-[14px] font-bold text-white" style={{ letterSpacing: "-0.02em" }}>
              Tyvera
            </span>
          </Link>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/subnets" className="rounded-xl px-4 py-2 text-[13px] font-medium text-slate-500 transition-all hover:bg-white/[0.05] hover:text-slate-200">
              Subnets
            </Link>
            <Link href="/metrics" className="rounded-xl px-4 py-2 text-[13px] font-medium text-slate-500 transition-all hover:bg-white/[0.05] hover:text-slate-200">
              Metrics
            </Link>
            <Link href="/signup">
              <button
                className="flex items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-semibold transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                  color: "#04060d",
                  boxShadow: "0 0 0 1px rgba(34,211,238,0.35), 0 4px 14px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                Enter Workspace <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-white/6 px-6 pb-20 pt-32 md:px-8">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <div className="mx-auto max-w-7xl relative">
          <div className="grid items-center gap-10 xl:grid-cols-[1.05fr_0.95fr] xl:gap-14">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2"
                style={{
                  background: "rgba(34,211,238,0.08)",
                  border: "1px solid rgba(34,211,238,0.24)",
                  boxShadow: "0 0 24px rgba(34,211,238,0.08)",
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Live on Bittensor Mainnet</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
                className="mb-7 max-w-4xl font-black leading-[0.96]"
                style={{ fontSize: "clamp(46px, 7vw, 90px)", letterSpacing: "-0.055em" }}
              >
                <span className="block text-white">Operate Bittensor</span>
                <span className="block bg-[linear-gradient(135deg,#7dd3fc_0%,#4f7cff_42%,#8b5cf6_74%,#d946ef_100%)] bg-clip-text text-transparent">
                  like a market terminal.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                className="mb-10 max-w-2xl text-[18px] leading-relaxed text-slate-300 md:text-[20px]"
                style={{ letterSpacing: "-0.015em" }}
              >
                Tyvera brings subnet discovery, holder flows, validator coverage, portfolio intelligence, and review-based execution into one premium operating surface — sharp, source-aware, and built for real allocation decisions.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="mb-10 flex flex-wrap items-center gap-3"
              >
                <Link href="/signup">
                  <button
                    className="flex items-center gap-2 rounded-xl px-7 py-3 text-[14px] font-semibold transition-all duration-200"
                    style={{
                      background: "linear-gradient(135deg, #66d9ff 0%, #4f7cff 48%, #7c3aed 100%)",
                      color: "#f8fafc",
                      boxShadow: "0 0 0 1px rgba(125,211,252,0.28), 0 12px 30px rgba(79,124,255,0.22)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Start Free <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
                <Link href="/pricing">
                  <button
                    className="flex items-center gap-2 rounded-xl px-7 py-3 text-[14px] font-medium text-slate-100 transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    View Pricing
                  </button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.32 }}
                className="grid max-w-3xl gap-3 sm:grid-cols-3"
              >
                {[
                  ["Source-aware", "Fallback state stays visible"],
                  ["Non-custodial", "You approve every move"],
                  ["Allocator-grade", "Built for decision speed"],
                ].map(([title, sub]) => (
                  <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-sm font-semibold text-white">{title}</div>
                    <div className="mt-1 text-xs text-slate-500">{sub}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(160deg,rgba(14,17,26,0.96),rgba(9,11,18,0.98))] p-6 shadow-[0_1px_0_rgba(255,255,255,0.055)_inset,0_24px_70px_rgba(0,0,0,0.45)]">
                <div className="mb-6 flex items-center justify-between border-b border-white/8 pb-5">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Platform snapshot</div>
                    <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-white">Why Tyvera feels different</h2>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
                      A calmer, institutional Bittensor terminal built around honest execution boundaries and high-signal operating views.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-cyan-400/16 bg-cyan-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                    Trust-first
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: Layers3, title: "Unified surfaces", text: "Subnets, holders, validators, recommendations, and billing read like one product system." },
                    { icon: Sparkles, title: "Premium posture", text: "Sharper hierarchy, quieter confidence, and less dashboard-template noise." },
                    { icon: Shield, title: "Approval boundaries", text: "Tyvera prepares workflows, but users still approve every execution-like action." },
                    { icon: Wallet, title: "Operator flow", text: "From discovery to review to wallet approval, the path stays clear and accountable." },
                  ].map(({ icon: Icon, title, text }) => (
                    <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-black/20">
                        <Icon className="h-4 w-4 text-cyan-300" />
                      </div>
                      <div className="text-sm font-semibold tracking-tight text-white">{title}</div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.012)", overflow: "hidden" }}>
        <div
          className="flex py-2.5"
          style={{ animation: "ticker-scroll 30s linear infinite", width: "max-content" }}
        >
          {[...ticker, ...ticker].map((item, i) => (
            <div key={`${item.name}-${i}`} className="flex shrink-0 items-center gap-3 px-6" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="whitespace-nowrap text-[11px] font-medium text-slate-600">{item.name}</span>
              <span className={cn("font-mono tabular-nums text-[11px] font-bold", item.up ? "text-emerald-400" : "text-rose-400")}>
                {item.up ? "▲" : "▼"}&thinsp;{item.yield}
              </span>
            </div>
          ))}
        </div>
      </div>

      <section className="px-8 py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { label: "Subnets Tracked", value: "128+", sub: "live on mainnet" },
            { label: "Data Freshness", value: "20 min", sub: "chain-synced" },
            { label: "Risk Metrics", value: "12", sub: "per subnet" },
            { label: "Wallet Extensions", value: "3", sub: "supported" },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <div className="mb-1 text-[28px] font-black text-white" style={{ letterSpacing: "-0.03em" }}>
                {m.value}
              </div>
              <div className="mb-0.5 text-[12px] font-semibold text-slate-400">{m.label}</div>
              <div className="text-[10px] text-slate-600">{m.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-8 py-24">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <div className="mb-14 text-center">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-400">Live Opportunities</div>
              <h2 className="text-[32px] font-bold text-white" style={{ letterSpacing: "-0.03em" }}>
                Top Performing Subnets
              </h2>
              <p className="text-[14px] text-slate-500">Ranked by composite score. Updated continuously.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(featured.length > 0
              ? featured.map((s: any, i: number) => ({
                  netuid: s.netuid,
                  name: s.name,
                  yield: `${s.dailyYield?.toFixed(2) ?? (s.emissions / s.liquidity * 100).toFixed(2)}%`,
                  risk: s.risk,
                  delta: `${formatLiquidity(s.emissions)}/day`,
                  liquidity: formatLiquidity(s.liquidity),
                  grad: GRADIENT_CLASSES[i % 3],
                  accent: ACCENT_COLORS[i % 3],
                }))
              : [
                  { netuid: 15, name: "Blockchain Insights", yield: "0.23%", risk: "LOW", delta: "194.5 τ/day", liquidity: "86,148 τ", grad: "from-cyan-500 to-blue-600", accent: "#22d3ee" },
                  { netuid: 107, name: "SN107", yield: "0.18%", risk: "LOW", delta: "155.4 τ/day", liquidity: "86,956 τ", grad: "from-violet-500 to-purple-700", accent: "#8b5cf6" },
                  { netuid: 114, name: "SN114", yield: "0.11%", risk: "LOW", delta: "125.6 τ/day", liquidity: "114,317 τ", grad: "from-emerald-500 to-teal-700", accent: "#34d399" },
                ]
            ).map((s, i) => (
              <FadeIn key={s.netuid} delay={i * 0.1}>
                <div
                  className="relative overflow-hidden rounded-2xl p-5 transition-all duration-250"
                  style={{
                    background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.016) 100%)",
                    border: "1px solid rgba(255,255,255,0.075)",
                    boxShadow: "0 1px 0 rgba(255,255,255,0.045) inset, 0 4px 24px rgba(0,0,0,0.28)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 1px 0 rgba(255,255,255,0.05) inset, 0 8px 32px rgba(0,0,0,0.32), 0 0 24px ${s.accent}15`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.075)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 0 rgba(255,255,255,0.045) inset, 0 4px 24px rgba(0,0,0,0.28)";
                  }}
                >
                  <div className="absolute right-0 top-0 h-32 w-40 pointer-events-none" style={{ background: `radial-gradient(ellipse at top right, ${s.accent}12, transparent 70%)` }} />

                  <div className="relative mb-5 flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white", `bg-gradient-to-br ${s.grad}`)} style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}>
                      {s.netuid}
                    </div>
                    <div>
                      <div className="text-[14px] font-bold text-white" style={{ letterSpacing: "-0.015em" }}>
                        {s.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-600">SN{s.netuid}</div>
                    </div>
                  </div>

                  <div className="mb-0.5 font-mono text-[28px] font-bold tabular-nums text-white" style={{ letterSpacing: "-0.03em" }}>
                    {s.yield}
                  </div>
                  <div className="mb-4 text-[11px] text-slate-600">daily yield vs τ staked</div>

                  <div className="mb-4 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />

                  <div className="flex items-center gap-2">
                    <span className="tag-emerald">{s.risk} RISK</span>
                    <span className="text-[11px] font-semibold tabular-nums text-cyan-400">{s.delta}</span>
                    <span className="ml-auto text-[11px] tabular-nums text-slate-600">{s.liquidity} staked</span>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.04] px-8 py-24">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <div className="mb-16 text-center">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-400">How It Works</div>
              <h2 className="text-[32px] font-bold text-white" style={{ letterSpacing: "-0.03em" }}>
                From data to decision in four steps
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.1}>
                <div className="relative">
                  {i < STEPS.length - 1 && <div className="absolute left-full top-[18px] hidden h-px w-full xl:block" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.08), transparent)" }} />}
                  <div className="mb-5 bg-[linear-gradient(135deg,#67e8f9_0%,#22d3ee_100%)] bg-clip-text text-[36px] font-black text-transparent" style={{ letterSpacing: "-0.04em" }}>
                    {step.n}
                  </div>
                  <h3 className="mb-2 text-[14px] font-bold text-white" style={{ letterSpacing: "-0.01em" }}>
                    {step.title}
                  </h3>
                  <p className="text-[12px] leading-relaxed text-slate-500">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.04] px-8 py-24">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <div className="mb-16 text-center">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-400">Platform</div>
              <h2 className="text-[32px] font-bold text-white" style={{ letterSpacing: "-0.03em" }}>
                Built for serious TAO stakers
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeIn key={f.title} delay={i * 0.08}>
                  <div
                    className="relative overflow-hidden rounded-2xl p-6 transition-all duration-200"
                    style={{
                      background: "linear-gradient(145deg, rgba(255,255,255,0.028) 0%, rgba(255,255,255,0.014) 100%)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.24)",
                    }}
                  >
                    <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: f.bg, border: `1px solid ${f.bdr}` }}>
                      <Icon style={{ width: 18, height: 18, color: f.accent }} />
                    </div>
                    <h3 className="mb-2 text-[15px] font-bold text-white" style={{ letterSpacing: "-0.015em" }}>
                      {f.title}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-slate-500">{f.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.04] px-8 py-24">
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <div
              className="relative overflow-hidden rounded-2xl p-10"
              style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.038) 0%, rgba(255,255,255,0.018) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.055) inset, 0 16px 56px rgba(0,0,0,0.4)",
              }}
            >
              <div className="absolute left-1/2 top-0 h-32 w-64 -translate-x-1/2 pointer-events-none" style={{ background: "radial-gradient(ellipse at top, rgba(52,211,153,0.08), transparent 70%)" }} />

              <div className="relative mb-10 text-center">
                <div
                  className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    background: "rgba(52,211,153,0.1)",
                    border: "1px solid rgba(52,211,153,0.22)",
                    boxShadow: "0 0 20px rgba(52,211,153,0.08)",
                  }}
                >
                  <Shield className="h-6 w-6 text-emerald-400" />
                </div>
                <h2 className="mb-3 text-[26px] font-bold text-white" style={{ letterSpacing: "-0.025em" }}>
                  Your keys. Your stake. Your control.
                </h2>
                <p className="mx-auto max-w-lg text-[14px] leading-relaxed text-slate-500">
                  Tyvera is a read-and-recommend platform. We analyze data and surface opportunities. Every move requires your explicit approval in your own wallet.
                </p>
              </div>

              <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
                {TRUST.map(({ icon: Icon, text, sub }) => (
                  <div
                    key={text}
                    className="flex items-start gap-3.5 rounded-xl p-4"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: "rgba(52,211,153,0.1)",
                        border: "1px solid rgba(52,211,153,0.2)",
                      }}
                    >
                      <Icon className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="mb-0.5 text-[13px] font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>
                        {text}
                      </p>
                      <p className="text-[11px] text-slate-600">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/[0.04] px-8 py-24">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(34,211,238,0.05), transparent 70%)" }} />
        <div className="relative mx-auto max-w-3xl text-center">
          <FadeIn>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" style={{ boxShadow: "0 0 5px rgba(251,191,36,0.6)" }} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Plans</span>
            </div>

            <h2 className="mb-4 text-[48px] font-black text-white" style={{ letterSpacing: "-0.04em", lineHeight: 1.05 }}>
              Start free. Upgrade when the
              <span className="block bg-[linear-gradient(135deg,#67e8f9_0%,#22d3ee_45%,#38bdf8_100%)] bg-clip-text text-transparent">
                edge becomes worth paying for.
              </span>
            </h2>
            <p className="mb-10 text-[15px] leading-relaxed text-slate-500">
              Explorer gets you into the product. Paid plans unlock deeper analytics, recommendations, and portfolio workflows. TAO-native settlement, no fake urgency, and no hidden custody.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/pricing">
                <button
                  className="flex items-center gap-2 rounded-xl px-8 py-3.5 text-[14px] font-semibold transition-all duration-200"
                  style={{
                    background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                    color: "#04060d",
                    boxShadow: "0 0 0 1px rgba(34,211,238,0.4), 0 8px 28px rgba(34,211,238,0.28), inset 0 1px 0 rgba(255,255,255,0.22)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  View Plans <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link href="/signup">
                <button
                  className="flex items-center gap-2 rounded-xl px-8 py-3.5 text-[14px] font-medium text-slate-200 transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Enter Workspace
                </button>
              </Link>
            </div>
            <p className="mt-6 text-[11px] text-slate-700">Nothing executes automatically. You stay in control of wallet approval and final submission.</p>
          </FadeIn>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "40px 32px" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)" }}>
              <Zap className="h-3 w-3 text-black" />
            </div>
            <span className="text-[13px] font-semibold text-slate-600">Tyvera</span>
          </div>
          <p className="text-[11px] text-slate-700">Not financial advice. You approve every move.</p>
          <div className="flex flex-wrap gap-5">
            {[
              { label: "Subnets", href: "/subnets" },
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Risk Disclosure", href: "/risk-disclosure" },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="text-[11px] text-slate-700 transition-colors duration-150 hover:text-slate-500">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
