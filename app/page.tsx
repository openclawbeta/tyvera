"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  Zap,
  ArrowRight,
  Shield,
  Lock,
  Eye,
  CheckCircle,
  Network,
  Lightbulb,
  Wallet,
  BarChart2,
  Sparkles,
  Layers3,
} from "lucide-react";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";

/* ─── CONTENT (unchanged from original) ─────────────────── */

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
    bg: "#E4DBFF",
    bdr: "#C9B8FF",
    accent: "#5B3FBF",
  },
  {
    icon: Lightbulb,
    title: "Recommendation Engine",
    desc: "Multi-factor scoring that accounts for fees, concentration, volatility, and churn. Recommendations only fire when the edge is real.",
    bg: "#FFE5D0",
    bdr: "#FFD7BA",
    accent: "#B65A17",
  },
  {
    icon: Wallet,
    title: "Assisted Reallocation",
    desc: "We build the transaction. You sign it in your own wallet. The platform never touches your keys or executes anything autonomously.",
    bg: "#E5F7EE",
    bdr: "#A7F0D2",
    accent: "#0B8F5A",
  },
  {
    icon: BarChart2,
    title: "Portfolio Analytics",
    desc: "Track your staked positions, weighted yield, earnings history, and concentration risk across all subnets in one view.",
    bg: "#FFF6DC",
    bdr: "#F0D890",
    accent: "#B88A00",
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

const ACCENT_COLORS = ["#C9B8FF", "#FFD7BA", "#A7F0D2"];
const GRADIENT_CLASSES = ["from-[#C9B8FF] to-[#8B5CF6]", "from-[#FFD7BA] to-[#F59E0B]", "from-[#A7F0D2] to-[#0B8F5A]"];

function formatLiquidity(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M τ`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} τ`;
  return `${val.toFixed(0)} τ`;
}

/* ─── PAGE ──────────────────────────────────────────────── */

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
    <div className="min-h-screen" style={{ background: "#FAF9F7", color: "#0F0F12" }}>
      {/* ── NAV ── */}
      <nav
        className="fixed inset-x-0 top-0 z-50 flex h-16 items-center backdrop-blur"
        style={{
          background: "rgba(250,249,247,0.82)",
          borderBottom: "1px solid #ECEBE7",
        }}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{
                background: "linear-gradient(135deg, #C9B8FF 0%, #FFD7BA 50%, #A7F0D2 100%)",
              }}
            >
              <Zap className="h-4 w-4" style={{ color: "#0F0F12" }} strokeWidth={2.5} />
            </div>
            <span className="font-semibold" style={{ color: "#0F0F12", letterSpacing: "-0.02em" }}>
              Tyvera
            </span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            <Link href="/subnets" className="rounded-full px-4 py-2 text-[13px] font-medium transition-all hover:bg-[#F2F0EB]" style={{ color: "#6B6860" }}>
              Subnets
            </Link>
            <Link href="/metrics" className="rounded-full px-4 py-2 text-[13px] font-medium transition-all hover:bg-[#F2F0EB]" style={{ color: "#6B6860" }}>
              Metrics
            </Link>
            <Link href="/pricing" className="rounded-full px-4 py-2 text-[13px] font-medium transition-all hover:bg-[#F2F0EB]" style={{ color: "#6B6860" }}>
              Pricing
            </Link>
            <Link href="/developers" className="rounded-full px-4 py-2 text-[13px] font-medium transition-all hover:bg-[#F2F0EB]" style={{ color: "#6B6860" }}>
              Developers
            </Link>
            <Link href="/signup" className="ml-2">
              <button className="btn-primary text-[13px]">
                Enter Workspace <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
            <div className="ml-1">
              <ThemeToggle size="sm" />
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden px-6 pb-20 pt-32 md:px-8 aurora-bg noise">
        <div className="mx-auto max-w-7xl relative">
          <div className="grid items-center gap-10 xl:grid-cols-[1.05fr_0.95fr] xl:gap-14">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mb-8 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 chip"
              >
                <span className="h-1.5 w-1.5 rounded-full animate-pulse-dot" style={{ background: "#0B8F5A" }} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#6B6860", fontFamily: "'JetBrains Mono', monospace" }}>
                  Live on Bittensor Mainnet
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
                className="mb-7 max-w-4xl font-semibold leading-[0.98]"
                style={{ fontSize: "clamp(46px, 7vw, 88px)", letterSpacing: "-0.035em", color: "#0F0F12" }}
              >
                <span className="block">Operate Bittensor</span>
                <span className="block serif" style={{ color: "#6B6860" }}>
                  like a market terminal.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                className="mb-10 max-w-2xl text-[18px] leading-relaxed md:text-[20px]"
                style={{ color: "#6B6860", letterSpacing: "-0.01em" }}
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
                  <button className="btn-primary text-[14px]" style={{ padding: "12px 24px" }}>
                    Start Free <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
                <Link href="/pricing">
                  <button className="btn-secondary text-[14px]" style={{ padding: "12px 24px" }}>
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
                  <div key={title} className="glass px-4 py-4">
                    <div className="text-sm font-semibold" style={{ color: "#0F0F12" }}>{title}</div>
                    <div className="mt-1 text-xs" style={{ color: "#6B6860" }}>{sub}</div>
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
              <div className="glass-lg p-6 aurora-soft">
                <div className="mb-6 flex items-center justify-between border-b pb-5" style={{ borderColor: "#ECEBE7" }}>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#6B6860", fontFamily: "'JetBrains Mono', monospace" }}>
                      Platform snapshot
                    </div>
                    <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.03em]" style={{ color: "#0F0F12" }}>
                      Why Tyvera feels different
                    </h2>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed" style={{ color: "#6B6860" }}>
                      A calmer, institutional Bittensor terminal built around honest execution boundaries and high-signal operating views.
                    </p>
                  </div>
                  <div className="tag-violet">
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
                    <div key={title} className="glass p-4">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#F2F0EB", border: "1px solid #ECEBE7" }}>
                        <Icon className="h-4 w-4" style={{ color: "#5B3FBF" }} />
                      </div>
                      <div className="text-sm font-semibold tracking-tight" style={{ color: "#0F0F12" }}>{title}</div>
                      <p className="mt-2 text-sm leading-relaxed" style={{ color: "#6B6860" }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div style={{ borderTop: "1px solid #ECEBE7", borderBottom: "1px solid #ECEBE7", background: "#FFFFFF", overflow: "hidden" }}>
        <div
          className="flex py-2.5"
          style={{ animation: "ticker-scroll 30s linear infinite", width: "max-content" }}
        >
          {[...ticker, ...ticker].map((item, i) => (
            <div
              key={`${item.name}-${i}`}
              className="flex shrink-0 items-center gap-3 px-6"
              style={{ borderRight: "1px solid #ECEBE7" }}
            >
              <span className="whitespace-nowrap text-[11px] font-medium" style={{ color: "#6B6860" }}>{item.name}</span>
              <span className={cn("font-mono tabular-nums text-[11px] font-bold", item.up ? "text-[#0B8F5A]" : "text-[#C0392B]")}>
                {item.up ? "▲" : "▼"}&thinsp;{item.yield}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── STATS STRIP ── */}
      <section className="px-8 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 sm:grid-cols-4">
          {[
            { label: "Subnets Tracked", value: "128+", sub: "live on mainnet" },
            { label: "Data Freshness", value: "20 min", sub: "chain-synced" },
            { label: "Risk Metrics", value: "12", sub: "per subnet" },
            { label: "Wallet Extensions", value: "3", sub: "supported" },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <div className="mb-1 text-[36px] font-semibold" style={{ letterSpacing: "-0.03em", color: "#0F0F12" }}>
                {m.value}
              </div>
              <div className="mb-0.5 text-[12px] font-semibold" style={{ color: "#0F0F12" }}>{m.label}</div>
              <div className="text-[11px]" style={{ color: "#6B6860" }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── LIVE OPPORTUNITIES ── */}
      <section className="px-8 py-20">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <div className="mb-14 text-center">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#6B6860", fontFamily: "'JetBrains Mono', monospace" }}>
                Live Opportunities
              </div>
              <h2 className="text-[40px] font-semibold" style={{ letterSpacing: "-0.03em", color: "#0F0F12" }}>
                Top Performing <span className="serif" style={{ color: "#6B6860" }}>Subnets</span>
              </h2>
              <p className="mt-3 text-[14px]" style={{ color: "#6B6860" }}>Ranked by composite score. Updated continuously.</p>
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
                  { netuid: 15, name: "Blockchain Insights", yield: "0.23%", risk: "LOW", delta: "194.5 τ/day", liquidity: "86,148 τ", grad: GRADIENT_CLASSES[0], accent: ACCENT_COLORS[0] },
                  { netuid: 107, name: "SN107", yield: "0.18%", risk: "LOW", delta: "155.4 τ/day", liquidity: "86,956 τ", grad: GRADIENT_CLASSES[1], accent: ACCENT_COLORS[1] },
                  { netuid: 114, name: "SN114", yield: "0.11%", risk: "LOW", delta: "125.6 τ/day", liquidity: "114,317 τ", grad: GRADIENT_CLASSES[2], accent: ACCENT_COLORS[2] },
                ]
            ).map((s, i) => (
              <FadeIn key={s.netuid} delay={i * 0.1}>
                <div className="glass relative overflow-hidden p-6">
                  <div
                    className="absolute right-0 top-0 h-32 w-40 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at top right, ${s.accent}55, transparent 70%)` }}
                  />

                  <div className="relative mb-5 flex items-center gap-3">
                    <div
                      className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold", s.grad)}
                      style={{ color: "#0F0F12" }}
                    >
                      {s.netuid}
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold" style={{ letterSpacing: "-0.015em", color: "#0F0F12" }}>
                        {s.name}
                      </div>
                      <div className="text-[10px]" style={{ color: "#6B6860", fontFamily: "'JetBrains Mono', monospace" }}>
                        SN{s.netuid}
                      </div>
                    </div>
                  </div>

                  <div className="mb-0.5 text-[32px] font-semibold tabular-nums" style={{ letterSpacing: "-0.03em", color: "#0F0F12", fontFamily: "'JetBrains Mono', monospace" }}>
                    {s.yield}
                  </div>
                  <div className="mb-4 text-[11px]" style={{ color: "#6B6860" }}>daily yield vs τ staked</div>

                  <div className="mb-4 divider" />

                  <div className="flex items-center gap-2">
                    <span className="tag-emerald">{s.risk} RISK</span>
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: "#5B3FBF", fontFamily: "'JetBrains Mono', monospace" }}>
                      {s.delta}
                    </span>
                    <span className="ml-auto text-[11px] tabular-nums" style={{ color: "#6B6860" }}>
                      {s.liquidity} staked
                    </span>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-t px-8 py-24" style={{ borderColor: "#ECEBE7" }}>
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <div className="mb-16 text-center">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#6B6860", fontFamily: "'JetBrains Mono', monospace" }}>
                How It Works
              </div>
              <h2 className="text-[40px] font-semibold" style={{ letterSpacing: "-0.03em", color: "#0F0F12" }}>
                From data to decision, <span className="serif" style={{ color: "#6B6860" }}>honestly.</span>
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.1}>
                <div className="relative">
                  {i < STEPS.length - 1 && (
                    <div
                      className="absolute left-full top-[28px] hidden h-px w-full xl:block"
                      style={{ background: "linear-gradient(90deg, #ECEBE7, transparent)" }}
                    />
                  )}
                  <div
                    className="mb-4 serif text-[56px] leading-none"
                    style={{ color: "#6B6860" }}
                  >
                    {step.n}
                  </div>
                  <h3 className="mb-2 text-[16px] font-semibold" style={{ letterSpacing: "-0.01em", color: "#0F0F12" }}>
                    {step.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: "#6B6860" }}>{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE GRID ── */}
      <section className="border-t px-8 py-24" style={{ borderColor: "#ECEBE7" }}>
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <div className="mb-16 text-center">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#6B6860", fontFamily: "'JetBrains Mono', monospace" }}>
                Platform
              </div>
              <h2 className="text-[40px] font-semibold" style={{ letterSpacing: "-0.03em", color: "#0F0F12" }}>
                Built for <span className="serif" style={{ color: "#6B6860" }}>serious TAO stakers.</span>
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeIn key={f.title} delay={i * 0.08}>
                  <div className="glass relative overflow-hidden p-7">
                    <div
                      className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: f.bg, border: `1px solid ${f.bdr}` }}
                    >
                      <Icon style={{ width: 20, height: 20, color: f.accent }} />
                    </div>
                    <h3 className="mb-2 text-[17px] font-semibold" style={{ letterSpacing: "-0.015em", color: "#0F0F12" }}>
                      {f.title}
                    </h3>
                    <p className="text-[14px] leading-relaxed" style={{ color: "#6B6860" }}>{f.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TRUST / KEYS ── */}
      <section className="border-t px-8 py-24" style={{ borderColor: "#ECEBE7" }}>
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <div className="glass-lg aurora-soft relative overflow-hidden p-10">
              <div className="relative mb-10 text-center">
                <div
                  className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: "#E5F7EE", border: "1px solid #A7F0D2" }}
                >
                  <Shield className="h-6 w-6" style={{ color: "#0B8F5A" }} />
                </div>
                <h2 className="mb-3 text-[32px] font-semibold" style={{ letterSpacing: "-0.025em", color: "#0F0F12" }}>
                  Your keys. Your stake. <span className="serif" style={{ color: "#6B6860" }}>Your control.</span>
                </h2>
                <p className="mx-auto max-w-lg text-[14px] leading-relaxed" style={{ color: "#6B6860" }}>
                  Tyvera is a read-and-recommend platform. We analyze data and surface opportunities. Every move requires your explicit approval in your own wallet.
                </p>
              </div>

              <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
                {TRUST.map(({ icon: Icon, text, sub }) => (
                  <div
                    key={text}
                    className="flex items-start gap-3.5 rounded-2xl p-4"
                    style={{ background: "#FFFFFF", border: "1px solid #ECEBE7" }}
                  >
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "#E5F7EE", border: "1px solid #A7F0D2" }}
                    >
                      <Icon className="h-4 w-4" style={{ color: "#0B8F5A" }} />
                    </div>
                    <div>
                      <p className="mb-0.5 text-[14px] font-semibold" style={{ letterSpacing: "-0.01em", color: "#0F0F12" }}>
                        {text}
                      </p>
                      <p className="text-[12px]" style={{ color: "#6B6860" }}>{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative overflow-hidden border-t px-8 py-24 aurora-bg" style={{ borderColor: "#ECEBE7" }}>
        <div className="relative mx-auto max-w-3xl text-center">
          <FadeIn>
            <div className="chip mb-8 inline-flex items-center gap-2 px-3.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#B88A00" }} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#6B6860", fontFamily: "'JetBrains Mono', monospace" }}>
                Plans
              </span>
            </div>

            <h2 className="mb-5 text-[56px] font-semibold" style={{ letterSpacing: "-0.035em", lineHeight: 1.03, color: "#0F0F12" }}>
              Start free. <span className="serif" style={{ color: "#6B6860" }}>Upgrade when the</span>
              <span className="block">edge is worth paying for.</span>
            </h2>
            <p className="mb-10 text-[16px] leading-relaxed" style={{ color: "#6B6860" }}>
              Explorer gets you into the product. Paid plans unlock deeper analytics, recommendations, and portfolio workflows. TAO-native settlement, no fake urgency, and no hidden custody.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/pricing">
                <button className="btn-primary text-[14px]" style={{ padding: "14px 28px" }}>
                  View Plans <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link href="/signup">
                <button className="btn-secondary text-[14px]" style={{ padding: "14px 28px" }}>
                  Enter Workspace
                </button>
              </Link>
            </div>
            <p className="mt-6 text-[11px]" style={{ color: "#6B6860" }}>
              Nothing executes automatically. You stay in control of wallet approval and final submission.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid #ECEBE7", padding: "40px 32px", background: "#FFFFFF" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-lg"
              style={{ background: "linear-gradient(135deg, #C9B8FF 0%, #FFD7BA 50%, #A7F0D2 100%)" }}
            >
              <Zap className="h-3 w-3" style={{ color: "#0F0F12" }} />
            </div>
            <span className="text-[13px] font-semibold" style={{ color: "#0F0F12" }}>Tyvera</span>
          </div>
          <p className="text-[11px]" style={{ color: "#6B6860" }}>Not financial advice. You approve every move.</p>
          <div className="flex flex-wrap gap-5">
            {[
              { label: "Subnets", href: "/subnets" },
              { label: "Pricing", href: "/pricing" },
              { label: "Developers", href: "/developers" },
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Risk Disclosure", href: "/risk-disclosure" },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="text-[11px] transition-colors duration-150" style={{ color: "#6B6860" }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
