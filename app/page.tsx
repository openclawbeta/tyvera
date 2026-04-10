"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  Zap, ArrowRight, Shield, Lock, Eye, CheckCircle,
  Network, TrendingUp, Lightbulb, Wallet, BarChart2,
} from "lucide-react";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { cn } from "@/lib/utils";

/* ── Static fallback for SSR / initial render ─────────────────────── */
const TICKER_FALLBACK = [
  { name: "SN49 Protein Folding",  yield: "26.7%", up: true  },
  { name: "SN1 Text Prompting",    yield: "24.3%", up: true  },
  { name: "SN18 Image Generation", yield: "23.0%", up: true  },
  { name: "SN25 Code Execution",   yield: "22.1%", up: true  },
  { name: "SN4 Multi-Modality",    yield: "21.7%", up: true  },
  { name: "SN19 Video Gen",        yield: "28.4%", up: false },
  { name: "SN3 Data Scraping",     yield: "15.0%", up: false },
];

interface LiveSubnet {
  netuid: number;
  name: string;
  yield: number;
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
  { n: "01", title: "Connect wallet",         desc: "Link your Bittensor wallet via Polkadot.js extension. Read-only until you approve a move." },
  { n: "02", title: "Explore subnets",        desc: "Browse scored subnet analytics. Filter by yield, risk, momentum, and liquidity depth." },
  { n: "03", title: "Review recommendations", desc: "The engine surfaces reallocation opportunities with full rationale and risk explanation." },
  { n: "04", title: "Approve in wallet",      desc: "You review the transaction, sign in your wallet, and submit. We never move stake without your signature." },
];

const TRUST = [
  { icon: Shield,       text: "You approve every move.",          sub: "No silent execution. Ever." },
  { icon: Lock,         text: "No seed phrase storage.",          sub: "We can't access your keys." },
  { icon: Eye,          text: "Full transaction transparency.",    sub: "See exactly what you're signing." },
  { icon: CheckCircle,  text: "Wallet remains under your control.", sub: "Non-custodial, end-to-end." },
];

const ACCENT_COLORS = ["#22d3ee", "#8b5cf6", "#34d399"];
const GRADIENT_CLASSES = ["from-cyan-500 to-blue-600", "from-violet-500 to-purple-700", "from-emerald-500 to-teal-700"];

function formatLiquidity(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M τ`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} τ`;
  return `${val.toFixed(0)} τ`;
}

export default function HomePage() {
  console.log('Rendering the HomePage component');
  const [ticker, setTicker] = useState(TICKER_FALLBACK);
  const [featured, setFeatured] = useState<LiveSubnet[]>([]);

  useEffect(() => {
    fetchWithTimeout("/api/subnets", { timeoutMs: 10_000 })
      .then((r) => r.ok ? r.json() : null)
      .then((raw) => {
        const data = Array.isArray(raw) ? raw : (raw?.subnets ?? []);
        if (!Array.isArray(data) || data.length === 0) return;

        // Ticker: top 10 by yield, positive = up
        const sorted = [...data]
          .filter((s: LiveSubnet) => s.netuid > 0 && s.yield > 0 && s.yield < 1000)
          .sort((a: LiveSubnet, b: LiveSubnet) => b.yield - a.yield);
        const tickerItems = sorted.slice(0, 10).map((s: LiveSubnet) => ({
          name: /^SN\d+$/.test(s.name) ? `SN${s.netuid}` : `SN${s.netuid} ${s.name}`,
          yield: `${s.yield.toFixed(1)}%`,
          up: s.yieldDelta7d >= 0,
        }));
        if (tickerItems.length > 0) setTicker(tickerItems);

        // Featured: top 3 by yield
        setFeatured(sorted.slice(0, 3));
      })
      .catch(() => {}); // Keep fallback on error
  }, []);

  return (
    <div className="min-h-screen text-slate-100 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_22%),radial-gradient(circle_at_78%_18%,rgba(59,130,246,0.12),transparent_20%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.06),transparent_26%)]" style={{ backgroundColor: "#06070f" }}>

      {/* ── NAVBAR ──────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 inset-x-0 z-50 h-16 flex items-center"
        style={{
          background: "linear-gradient(180deg, rgba(8,10,18,0.9), rgba(7,9,16,0.78))",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 10px 32px rgba(0,0,0,0.22)",
          backdropFilter: "blur(24px) saturate(1.6)",
        }}
      >
        <div className="max-w-7xl mx-auto px-8 w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                boxShadow: "0 0 0 1px rgba(34,211,238,0.3), 0 4px 14px rgba(34,211,238,0.22)",
              }}
            >
              <Zap className="w-4 h-4 text-black" strokeWidth={2.5} />
            </div>
            <span className="text-[14px] font-bold text-white" style={{ letterSpacing: "-0.02em" }}>
              Tyvera
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {["Dashboard", "Subnets", "Pricing"].map((label, i) => {
              const hrefs = ["/dashboard", "/subnets", "/billing"];
              return (
                <Link
                  key={label}
                  href={hrefs[i]}
                  className="px-4 py-2 rounded-xl text-[13px] text-slate-500 font-medium transition-all duration-150 hover:text-slate-200"
                  style={{ letterSpacing: "-0.005em" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  {label}
                </Link>
              );
            })}
            <div className="w-px h-4 mx-1" style={{ background: "rgba(255,255,255,0.08)" }} />
            <Link href="/dashboard">
              <button
                className="flex items-center gap-2 rounded-xl text-[13px] font-semibold px-5 py-2 transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                  color: "#04060d",
                  boxShadow: "0 0 0 1px rgba(34,211,238,0.35), 0 4px 14px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                Open App <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6 md:px-8 overflow-hidden border-b border-white/6">
        {/* Background layers */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 90% 60% at 50% -5%, rgba(34,211,238,0.1) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 50% 40% at 75% 30%, rgba(139,92,246,0.06) 0%, transparent 60%)",
          }}
        />
        {/* Grid lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-10 xl:gap-14 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="inline-flex items-center gap-2 mb-8 rounded-full px-4 py-2"
                style={{
                  background: "rgba(34,211,238,0.08)",
                  border: "1px solid rgba(34,211,238,0.24)",
                  boxShadow: "0 0 24px rgba(34,211,238,0.08)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot"
                  style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }}
                />
                <span className="text-[11px] font-semibold text-cyan-300 tracking-[0.18em] uppercase">
                  Live on Bittensor Mainnet
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
                className="font-black leading-[0.96] mb-7 max-w-4xl"
                style={{ fontSize: "clamp(46px, 7vw, 90px)", letterSpacing: "-0.055em" }}
              >
                <span className="block text-white">Operate Bittensor</span>
                <span
                  className="block text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(135deg, #7dd3fc 0%, #4f7cff 42%, #8b5cf6 74%, #d946ef 100%)" }}
                >
                  like a market terminal.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                className="text-[18px] md:text-[20px] text-slate-300 leading-relaxed mb-10 max-w-2xl"
                style={{ letterSpacing: "-0.015em" }}
              >
                Tyvera brings subnet discovery, holder flows, validator coverage, and portfolio intelligence into one premium operating surface — sharp, source-aware, and built for real allocation decisions.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-wrap items-center gap-3 mb-10"
              >
                <Link href="/dashboard">
                  <button
                    className="flex items-center gap-2 rounded-xl font-semibold px-7 py-3 text-[14px] transition-all duration-200"
                    style={{
                      background: "linear-gradient(135deg, #66d9ff 0%, #4f7cff 48%, #7c3aed 100%)",
                      color: "#f8fafc",
                      boxShadow: "0 0 0 1px rgba(125,211,252,0.28), 0 12px 30px rgba(79,124,255,0.22)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Open Platform <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <Link href="/subnets">
                  <button
                    className="flex items-center gap-2 rounded-xl font-medium px-7 py-3 text-[14px] text-slate-100 transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Explore Subnets
                  </button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.32 }}
                className="grid sm:grid-cols-3 gap-3 max-w-3xl"
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
              <div className="absolute -inset-8 rounded-[36px] opacity-80 blur-3xl" style={{ background: "radial-gradient(circle at 30% 30%, rgba(59,130,246,0.24), transparent 40%), radial-gradient(circle at 75% 20%, rgba(217,70,239,0.2), transparent 35%), radial-gradient(circle at 60% 70%, rgba(34,211,238,0.16), transparent 40%)" }} />
              <div className="relative rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,17,26,0.96),rgba(9,11,18,0.98))] shadow-[0_30px_100px_rgba(0,0,0,0.45)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Live command board</div>
                    <div className="mt-1 text-lg font-semibold text-white">Bittensor allocation intelligence</div>
                  </div>
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-300">Terminal live</div>
                </div>

                <div className="grid gap-0 border-b border-white/8 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="border-r border-white/8 p-5">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      <span>Signal curve</span>
                      <span>7D allocator trend</span>
                    </div>
                    <div className="mt-5 h-56 rounded-2xl border border-white/6 bg-[radial-gradient(circle_at_top,rgba(79,124,255,0.16),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-4 relative overflow-hidden">
                      <div className="absolute inset-x-4 top-6 bottom-4 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)", backgroundSize: "100% 25%, 16.6% 100%" }} />
                      <svg viewBox="0 0 420 180" className="relative z-10 h-full w-full">
                        <defs>
                          <linearGradient id="heroLine" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#67e8f9" />
                            <stop offset="45%" stopColor="#4f7cff" />
                            <stop offset="100%" stopColor="#d946ef" />
                          </linearGradient>
                          <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(79,124,255,0.32)" />
                            <stop offset="100%" stopColor="rgba(79,124,255,0.02)" />
                          </linearGradient>
                        </defs>
                        <path d="M0 145 C35 138, 54 118, 86 122 S140 98, 170 106 S232 74, 262 86 S325 52, 355 62 S395 28, 420 24" fill="none" stroke="url(#heroLine)" strokeWidth="5" strokeLinecap="round" />
                        <path d="M0 145 C35 138, 54 118, 86 122 S140 98, 170 106 S232 74, 262 86 S325 52, 355 62 S395 28, 420 24 L420 180 L0 180 Z" fill="url(#heroFill)" />
                      </svg>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Market pulse</div>
                    <div className="mt-4 space-y-3">
                      {[
                        ["TAO spot", "$432.84", "+3.12%", "text-emerald-300"],
                        ["Top subnet est. yield", "84.6%", "elevated", "text-cyan-300"],
                        ["Network breadth", "128", "tracked subnets", "text-violet-300"],
                        ["Allocator posture", "Risk-on", "moderate", "text-amber-300"],
                      ].map(([label, value, sub, tone]) => (
                        <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
                          <div className={`mt-1 text-xl font-semibold ${tone}`}>{value}</div>
                          <div className="mt-1 text-xs text-slate-500">{sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 p-5 md:grid-cols-3">
                  {[
                    ["Subnet scanner", "Yield, risk, liquidity, participation"],
                    ["Holder lens", "Concentration, flows, attribution state"],
                    ["Validator board", "Coverage, shortlist, provider clarity"],
                  ].map(([title, sub]) => (
                    <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
                      <div className="text-sm font-semibold text-white">{title}</div>
                      <div className="mt-1 text-xs text-slate-500">{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── MARKET STRIP ────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.012)", overflow: "hidden" }}>
        <motion.div
          className="flex py-2.5 whitespace-nowrap will-change-transform"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 28, ease: "linear", repeat: Infinity }}
        >
          {[...ticker, ...ticker].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-6 flex-shrink-0"
              style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span className="text-[11px] text-slate-600 whitespace-nowrap font-medium">{item.name}</span>
              <span className={cn("text-[11px] font-bold font-mono tabular-nums", item.up ? "text-emerald-400" : "text-rose-400")}>
                {item.up ? "▲" : "▼"}&thinsp;{item.yield}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── METRICS STRIP ──────────────────────────────────────────── */}
      <section className="py-12 px-6 md:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: "Subnets Tracked", value: "128+", sub: "live on mainnet", tone: "#67e8f9" },
            { label: "Data Freshness", value: "20 min", sub: "chain-synced", tone: "#60a5fa" },
            { label: "Risk Metrics", value: "12", sub: "per subnet", tone: "#a78bfa" },
            { label: "Wallet Extensions", value: "3", sub: "supported", tone: "#34d399" },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border border-white/8 bg-white/[0.024] px-4 py-5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="text-[28px] font-black text-white mb-1" style={{ letterSpacing: "-0.03em", textShadow: `0 0 18px ${m.tone}18` }}>
                {m.value}
              </div>
              <div className="text-[12px] font-semibold text-slate-300 mb-0.5">{m.label}</div>
              <div className="text-[10px] text-slate-500">{m.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED SUBNETS ────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="mb-14 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.12em] mb-3">
                  Live Opportunities
                </div>
                <h2
                  className="font-bold text-white mb-2"
                  style={{ fontSize: "32px", letterSpacing: "-0.03em" }}
                >
                  Top performing subnet board
                </h2>
                <p className="text-[14px] text-slate-500 max-w-2xl">A tighter market-style read on where allocator attention, risk, and emissions-driven opportunity are clustering right now.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:w-[340px]">
                <div className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Top board</div>
                  <div className="mt-1 text-lg font-semibold text-white">Live ranked</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Update state</div>
                  <div className="mt-1 text-lg font-semibold text-cyan-300">Source-aware</div>
                </div>
              </div>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {(featured.length > 0
              ? featured.map((s, i) => ({
                  netuid: s.netuid,
                  name: s.name,
                  yield: `${s.yield.toFixed(1)}%`,
                  risk: s.risk,
                  delta: `${s.yieldDelta7d >= 0 ? "+" : ""}${s.yieldDelta7d.toFixed(1)}%`,
                  liquidity: formatLiquidity(s.liquidity),
                  grad: GRADIENT_CLASSES[i % 3],
                  accent: ACCENT_COLORS[i % 3],
                }))
              : [
                  { netuid: 49, name: "Protein Folding", yield: "26.7%", risk: "LOW", delta: "+0.4%", liquidity: "13,800 τ", grad: "from-cyan-500 to-blue-600", accent: "#22d3ee" },
                  { netuid: 1,  name: "Text Prompting",  yield: "24.3%", risk: "LOW", delta: "+1.2%", liquidity: "12,400 τ", grad: "from-violet-500 to-purple-700", accent: "#8b5cf6" },
                  { netuid: 25, name: "Code Execution",  yield: "22.1%", risk: "LOW", delta: "+1.5%", liquidity: "9,700 τ", grad: "from-emerald-500 to-teal-700", accent: "#34d399" },
                ]
            ).map((s, i) => (
              <FadeIn key={s.netuid} delay={i * 0.1}>
                <div
                  className="rounded-2xl p-5 transition-all duration-250 relative overflow-hidden"
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
                  {/* Accent glow */}
                  <div
                    className="absolute top-0 right-0 w-40 h-32 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at top right, ${s.accent}12, transparent 70%)` }}
                  />

                  <div className="flex items-center gap-3 mb-5 relative">
                    <div
                      className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white", `bg-gradient-to-br ${s.grad}`)}
                      style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                    >
                      {s.netuid}
                    </div>
                    <div>
                      <div className="text-[14px] font-bold text-white" style={{ letterSpacing: "-0.015em" }}>{s.name}</div>
                      <div className="text-[10px] text-slate-600 font-mono">SN{s.netuid}</div>
                    </div>
                  </div>

                  <div
                    className="font-bold text-white font-mono mb-0.5 tabular-nums"
                    style={{ fontSize: "28px", letterSpacing: "-0.03em" }}
                  >
                    {s.yield}
                  </div>
                  <div className="text-[11px] text-slate-600 mb-4">estimated annual yield</div>

                  <div
                    className="h-px mb-4"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  />

                  <div className="flex items-center gap-2">
                    <span className="tag-emerald">{s.risk} RISK</span>
                    <span className="text-[11px] text-emerald-400 font-semibold tabular-nums">{s.delta} 7d</span>
                    <span className="text-[11px] text-slate-600 ml-auto tabular-nums">{s.liquidity}</span>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="mb-16 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.12em] mb-3">How It Works</div>
                <h2
                  className="font-bold text-white"
                  style={{ fontSize: "32px", letterSpacing: "-0.03em" }}
                >
                  From raw network state to allocation action
                </h2>
              </div>
              <div className="max-w-xl text-sm text-slate-500 leading-relaxed">
                Tyvera is designed as a compact operating loop: read the network, compare the field, understand risk, then act with your own wallet approval.
              </div>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 xl:gap-8">
            {STEPS.map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.1}>
                <div className="relative">
                  {i < STEPS.length - 1 && (
                    <div
                      className="absolute top-[18px] left-full w-full h-px hidden xl:block"
                      style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.08), transparent)" }}
                    />
                  )}
                  <div
                    className="font-black mb-5 text-transparent bg-clip-text"
                    style={{
                      fontSize: "36px",
                      letterSpacing: "-0.04em",
                      backgroundImage: "linear-gradient(135deg, #67e8f9 0%, #4f7cff 55%, #8b5cf6 100%)",
                      filter: "drop-shadow(0 0 16px rgba(79,124,255,0.14))",
                    }}
                  >
                    {step.n}
                  </div>
                  <h3
                    className="font-bold text-white mb-2"
                    style={{ fontSize: "14px", letterSpacing: "-0.01em" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-[12px] text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ───────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="mb-16 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.12em] mb-3">Platform</div>
                <h2
                  className="font-bold text-white"
                  style={{ fontSize: "32px", letterSpacing: "-0.03em" }}
                >
                  Core product surfaces built for serious TAO operators
                </h2>
              </div>
              <div className="max-w-xl text-sm text-slate-500 leading-relaxed">
                Every module exists to shorten the gap between signal and action — exploration, intelligence, portfolio command, and trust-aware execution support.
              </div>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeIn key={f.title} delay={i * 0.08}>
                  <div
                    className="rounded-2xl p-6 transition-all duration-200 relative overflow-hidden"
                    style={{
                      background: "linear-gradient(145deg, rgba(255,255,255,0.028) 0%, rgba(255,255,255,0.014) 100%)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.24)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                      style={{ background: f.bg, border: `1px solid ${f.bdr}` }}
                    >
                      <Icon style={{ width: 18, height: 18, color: f.accent }} />
                    </div>
                    <h3
                      className="font-bold text-white mb-2"
                      style={{ fontSize: "15px", letterSpacing: "-0.015em" }}
                    >
                      {f.title}
                    </h3>
                    <p className="text-[13px] text-slate-500 leading-relaxed">{f.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TRUST SECTION ───────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div
              className="rounded-2xl p-10 relative overflow-hidden"
              style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.038) 0%, rgba(255,255,255,0.018) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.055) inset, 0 16px 56px rgba(0,0,0,0.4)",
              }}
            >
              {/* Emerald glow */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at top, rgba(52,211,153,0.08), transparent 70%)" }}
              />

              <div className="text-center mb-10 relative">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{
                    background: "rgba(52,211,153,0.1)",
                    border: "1px solid rgba(52,211,153,0.22)",
                    boxShadow: "0 0 20px rgba(52,211,153,0.08)",
                  }}
                >
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <h2
                  className="font-bold text-white mb-3"
                  style={{ fontSize: "26px", letterSpacing: "-0.025em" }}
                >
                  Your keys. Your stake. Your control.
                </h2>
                <p className="text-[14px] text-slate-500 leading-relaxed max-w-lg mx-auto">
                  Tyvera is a read-and-recommend platform. We analyze data and surface
                  opportunities. Every move requires your explicit approval in your own wallet.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
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
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: "rgba(52,211,153,0.1)",
                        border: "1px solid rgba(52,211,153,0.2)",
                      }}
                    >
                      <Icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p
                        className="font-semibold text-white mb-0.5"
                        style={{ fontSize: "13px", letterSpacing: "-0.01em" }}
                      >
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

      {/* ── PREMIUM CTA ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-8 relative overflow-hidden" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(34,211,238,0.05), transparent 70%)" }}
        />
        <div className="max-w-3xl mx-auto text-center relative">
          <FadeIn>
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8"
              style={{
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.2)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" style={{ boxShadow: "0 0 5px rgba(251,191,36,0.6)" }} />
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Premium</span>
            </div>

            <h2
              className="font-black text-white mb-4"
              style={{ fontSize: "48px", letterSpacing: "-0.04em", lineHeight: 1.05 }}
            >
              Access Tyvera as a
              <span
                className="block text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(135deg, #67e8f9 0%, #4f7cff 48%, #a855f7 100%)" }}
              >
                premium operator workspace.
              </span>
            </h2>
            <p className="text-[15px] text-slate-400 mb-10 leading-relaxed max-w-2xl mx-auto">
              Start with Explorer for free, then move into Analyst or Strategist when you need a more complete command layer for subnet research, monitoring, and allocation decisions.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/billing">
                <button
                  className="flex items-center gap-2 rounded-xl font-semibold px-8 py-3.5 text-[14px] transition-all duration-200"
                  style={{
                    background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                    color: "#04060d",
                    boxShadow: "0 0 0 1px rgba(34,211,238,0.4), 0 8px 28px rgba(34,211,238,0.28), inset 0 1px 0 rgba(255,255,255,0.22)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  View Plans <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/dashboard">
                <button
                  className="flex items-center gap-2 rounded-xl font-medium px-8 py-3.5 text-[14px] text-slate-200 transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Try Free
                </button>
              </Link>
            </div>
            <p className="text-[11px] text-slate-700 mt-6">
              Premium activates immediately on-chain confirmation. No refunds — TAO payments are final.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "40px 24px" }}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)" }}
            >
              <Zap className="w-3 h-3 text-black" />
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
              <Link
                key={label}
                href={href}
                className="text-[11px] text-slate-700 transition-colors duration-150 hover:text-slate-500"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
