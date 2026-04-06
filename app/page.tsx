"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap, ArrowRight, Shield, Lock, Eye, CheckCircle,
  Network, Lightbulb, Wallet, BarChart2,
} from "lucide-react";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { cn } from "@/lib/utils";

const TICKER = [
  { name: "SN49 Protein Folding",  yield: "26.7%", up: true  },
  { name: "SN1 Text Prompting",    yield: "24.3%", up: true  },
  { name: "SN18 Image Generation", yield: "23.0%", up: true  },
  { name: "SN25 Code Execution",   yield: "22.1%", up: true  },
  { name: "SN4 Multi-Modality",    yield: "21.7%", up: true  },
  { name: "SN19 Video Gen",        yield: "28.4%", up: false },
  { name: "SN3 Data Scraping",     yield: "15.0%", up: false },
];

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
  { icon: Shield,       text: "You approve every move.",           sub: "No silent execution. Ever." },
  { icon: Lock,         text: "No seed phrase storage.",           sub: "We can't access your keys." },
  { icon: Eye,          text: "Full transaction transparency.",    sub: "See exactly what you're signing." },
  { icon: CheckCircle,  text: "Wallet remains under your control.", sub: "Non-custodial, end-to-end." },
];

const PREVIEW_ROWS = [
  { netuid: 49, name: "Protein Folding", score: "0.88", apr: "26.7%", risk: "LOW", rec: true  },
  { netuid: 1,  name: "Text Prompting",  score: "0.84", apr: "24.3%", risk: "LOW", rec: false },
  { netuid: 25, name: "Code Execution",  score: "0.80", apr: "22.1%", risk: "LOW", rec: false },
  { netuid: 8,  name: "Time Series",     score: "0.71", apr: "19.4%", risk: "MED", rec: false },
];

export default function HomePage() {
  return (
    <div className="min-h-screen text-slate-100" style={{ background: "#06070f" }}>

      {/* ── NAVBAR ──────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 inset-x-0 z-50 h-16 flex items-center"
        style={{
          background: "rgba(6,7,15,0.82)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
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

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-8 overflow-hidden">
        {/* Background — right-side glow to frame panel */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 55% 70% at 100% 50%, rgba(34,211,238,0.055) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 40% 50% at 0% 60%, rgba(139,92,246,0.04) 0%, transparent 55%)",
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.018]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left: message */}
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="font-bold leading-[1.08] mb-6"
                style={{ fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: "-0.035em" }}
              >
                <span className="text-white">Allocation intelligence</span>
                <br />
                <span style={{ color: "#94a3b8" }}>for Bittensor.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="text-[16px] text-slate-400 leading-relaxed mb-8 max-w-md"
                style={{ letterSpacing: "-0.005em" }}
              >
                Real-time subnet scoring, multi-factor reallocation analysis, and assisted execution.
                You review the data. You approve the move. Your keys stay in your wallet.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-3 mb-8"
              >
                <Link href="/dashboard">
                  <button
                    className="flex items-center gap-2 rounded-xl font-semibold px-6 py-2.5 text-[13px] transition-all duration-200"
                    style={{
                      background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                      color: "#04060d",
                      boxShadow: "0 0 0 1px rgba(34,211,238,0.35), 0 4px 16px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Open App <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
                <Link href="/subnets">
                  <button
                    className="flex items-center gap-2 rounded-xl font-medium px-6 py-2.5 text-[13px] text-slate-300 transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    View Subnets
                  </button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.28 }}
                className="flex flex-col gap-2"
              >
                {["You approve every move.", "No seed phrase storage.", "Non-custodial, end-to-end."].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    <span className="text-[12px] text-slate-500">{t}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: intelligence preview panel */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block"
            >
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.022)",
                  border: "1px solid rgba(255,255,255,0.072)",
                  boxShadow: "0 4px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                {/* Panel header */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)" }}
                    >
                      <Zap className="w-2.5 h-2.5 text-black" strokeWidth={2.5} />
                    </div>
                    <span className="text-[12px] font-semibold text-slate-300" style={{ letterSpacing: "-0.01em" }}>
                      TAO Navigator
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-600">Updated continuously</span>
                </div>

                {/* Column headers */}
                <div
                  className="grid px-4 py-2"
                  style={{
                    gridTemplateColumns: "1fr 56px 64px 52px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  {["Subnet", "Score", "Est. APR", "Risk"].map((h, i) => (
                    <span
                      key={h}
                      className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider"
                      style={{ textAlign: i > 0 ? "right" : "left" }}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {/* Data rows */}
                {PREVIEW_ROWS.map((row) => (
                  <div
                    key={row.netuid}
                    className="grid px-4 py-3 items-center"
                    style={{
                      gridTemplateColumns: "1fr 56px 64px 52px",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      borderLeft: row.rec ? "2px solid rgba(34,211,238,0.45)" : "2px solid transparent",
                      background: row.rec ? "rgba(34,211,238,0.035)" : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-slate-700 flex-shrink-0">SN{row.netuid}</span>
                      <span className="text-[12px] font-medium text-slate-300 truncate">{row.name}</span>
                    </div>
                    <span className="text-[12px] font-mono tabular-nums text-slate-400 text-right">{row.score}</span>
                    <span className="text-[12px] font-mono tabular-nums text-emerald-400 font-semibold text-right">{row.apr}</span>
                    <div className="flex justify-end">
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          background: row.risk === "LOW" ? "rgba(52,211,153,0.1)" : "rgba(251,191,36,0.1)",
                          border: `1px solid ${row.risk === "LOW" ? "rgba(52,211,153,0.2)" : "rgba(251,191,36,0.2)"}`,
                          color: row.risk === "LOW" ? "#34d399" : "#fbbf24",
                        }}
                      >
                        {row.risk}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Panel footer */}
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ background: "rgba(255,255,255,0.01)" }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                      style={{ boxShadow: "0 0 4px rgba(34,211,238,0.6)" }}
                    />
                    <span className="text-[11px] text-slate-500">1 reallocation opportunity</span>
                    <span className="text-[10px] font-mono text-slate-700">· score 0.74</span>
                  </div>
                  <span className="text-[10px] text-slate-700">64 subnets tracked</span>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── MARKET STRIP ────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(255,255,255,0.012)",
          overflow: "hidden",
        }}
      >
        <div className="ticker-track inline-flex min-w-max whitespace-nowrap py-2.5">
          {[...TICKER, ...TICKER].map((item, i) => (
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
        </div>
      </div>

      {/* ── TRUST / PROOF ───────────────────────────────────────────── */}
      <section className="py-16 px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {TRUST.map(({ icon: Icon, text, sub }) => (
                <div key={text} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: "rgba(52,211,153,0.08)",
                      border: "1px solid rgba(52,211,153,0.16)",
                    }}
                  >
                    <Icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white mb-0.5" style={{ letterSpacing: "-0.01em" }}>{text}</p>
                    <p className="text-[11px] text-slate-600">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PLATFORM ────────────────────────────────────────────────── */}
      <section className="py-20 px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="mb-12">
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.12em] mb-3">Platform</div>
              <h2
                className="font-bold text-white"
                style={{ fontSize: "28px", letterSpacing: "-0.03em" }}
              >
                Built for serious TAO stakers
              </h2>
            </div>
          </FadeIn>

          <div className="grid lg:grid-cols-2 gap-12 items-start">

            {/* Capabilities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <FadeIn key={f.title} delay={i * 0.07}>
                    <div
                      className="rounded-2xl p-5"
                      style={{
                        background: "linear-gradient(145deg, rgba(255,255,255,0.026) 0%, rgba(255,255,255,0.012) 100%)",
                        border: "1px solid rgba(255,255,255,0.065)",
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                        style={{ background: f.bg, border: `1px solid ${f.bdr}` }}
                      >
                        <Icon style={{ width: 16, height: 16, color: f.accent }} />
                      </div>
                      <h3
                        className="font-semibold text-white mb-1.5"
                        style={{ fontSize: "13px", letterSpacing: "-0.01em" }}
                      >
                        {f.title}
                      </h3>
                      <p className="text-[12px] text-slate-500 leading-relaxed">{f.desc}</p>
                    </div>
                  </FadeIn>
                );
              })}
            </div>

            {/* Workflow */}
            <div>
              <FadeIn>
                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-7">
                  How it works
                </p>
              </FadeIn>
              <div className="space-y-0">
                {STEPS.map((step, i) => (
                  <FadeIn key={step.n} delay={i * 0.08}>
                    <div
                      className="flex gap-5 py-5"
                      style={{
                        borderBottom: i < STEPS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                      }}
                    >
                      <span
                        className="text-[11px] font-mono font-bold flex-shrink-0 pt-0.5"
                        style={{ color: "#334155", letterSpacing: "0.02em" }}
                      >
                        {step.n}
                      </span>
                      <div>
                        <h3
                          className="text-[14px] font-semibold text-white mb-1"
                          style={{ letterSpacing: "-0.01em" }}
                        >
                          {step.title}
                        </h3>
                        <p className="text-[12px] text-slate-500 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── INTELLIGENCE SURFACE ────────────────────────────────────── */}
      <section className="py-20 px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="mb-12">
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.12em] mb-3">
                Intelligence Surface
              </div>
              <h2
                className="font-bold text-white mb-2"
                style={{ fontSize: "28px", letterSpacing: "-0.03em" }}
              >
                Live intelligence across 64+ subnets
              </h2>
              <p className="text-[14px] text-slate-500">Ranked by composite score. Updated continuously.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { netuid: 49, name: "Protein Folding", yield: "26.7%", score: 88, risk: "LOW",  delta: "+0.4%", liquidity: "13,800 τ", grad: "from-cyan-500 to-blue-600"    },
              { netuid: 1,  name: "Text Prompting",  yield: "24.3%", score: 84, risk: "LOW",  delta: "+1.2%", liquidity: "12,400 τ", grad: "from-violet-500 to-purple-700" },
              { netuid: 25, name: "Code Execution",  yield: "22.1%", score: 80, risk: "LOW",  delta: "+1.5%", liquidity: "9,700 τ",  grad: "from-emerald-500 to-teal-700"  },
            ].map((s, i) => (
              <FadeIn key={s.netuid} delay={i * 0.08}>
                <div
                  className="rounded-2xl p-5 relative overflow-hidden"
                  style={{
                    background: "linear-gradient(145deg, rgba(255,255,255,0.028) 0%, rgba(255,255,255,0.014) 100%)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white", `bg-gradient-to-br ${s.grad}`)}
                      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
                    >
                      {s.netuid}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-white" style={{ letterSpacing: "-0.015em" }}>{s.name}</div>
                      <div className="text-[10px] text-slate-600 font-mono">SN{s.netuid}</div>
                    </div>
                  </div>

                  <div
                    className="font-bold text-white font-mono mb-0.5 tabular-nums"
                    style={{ fontSize: "26px", letterSpacing: "-0.03em" }}
                  >
                    {s.yield}
                  </div>
                  <div className="text-[11px] text-slate-600 mb-4">estimated annual yield</div>

                  <div className="h-px mb-4" style={{ background: "rgba(255,255,255,0.05)" }} />

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

      {/* ── PRICING ─────────────────────────────────────────────────── */}
      <section
        className="py-20 px-8 relative overflow-hidden"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(34,211,238,0.04), transparent 70%)" }}
        />
        <div className="max-w-2xl mx-auto text-center relative">
          <FadeIn>
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
              style={{
                background: "rgba(251,191,36,0.07)",
                border: "1px solid rgba(251,191,36,0.18)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Premium</span>
            </div>

            <h2
              className="font-bold text-white mb-3"
              style={{ fontSize: "36px", letterSpacing: "-0.035em", lineHeight: 1.08 }}
            >
              0.5 τ / month
            </h2>
            <p className="text-[14px] text-slate-500 mb-8 leading-relaxed">
              Unlock full subnet analytics, the recommendation engine, and assisted reallocation.
              <br />Pay in TAO. Extend anytime. No auto-renewal.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/billing">
                <button
                  className="flex items-center gap-2 rounded-xl font-semibold px-7 py-3 text-[13px] transition-all duration-200"
                  style={{
                    background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                    color: "#04060d",
                    boxShadow: "0 0 0 1px rgba(34,211,238,0.35), 0 6px 20px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Get Premium <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/dashboard">
                <button
                  className="flex items-center gap-2 rounded-xl font-medium px-7 py-3 text-[13px] text-slate-300 transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Try Free
                </button>
              </Link>
            </div>
            <p className="text-[11px] text-slate-700 mt-5">
              Premium activates immediately on-chain confirmation. No refunds — TAO payments are final.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "40px 32px" }}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
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
            {["Docs", "Privacy", "Terms"].map((l) => (
              <a
                key={l}
                href="#"
                className="text-[11px] text-slate-700 transition-colors duration-150 hover:text-slate-500"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}
