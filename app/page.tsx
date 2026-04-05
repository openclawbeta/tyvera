"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap, ArrowRight, Shield, Lock, Eye, CheckCircle,
  Network, TrendingUp, Lightbulb, Wallet, BarChart2,
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
  { icon: Shield,       text: "You approve every move.",          sub: "No silent execution. Ever." },
  { icon: Lock,         text: "No seed phrase storage.",          sub: "We can't access your keys." },
  { icon: Eye,          text: "Full transaction transparency.",    sub: "See exactly what you're signing." },
  { icon: CheckCircle,  text: "Wallet remains under your control.", sub: "Non-custodial, end-to-end." },
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

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-8 overflow-hidden">
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

        <div className="max-w-4xl mx-auto text-center relative">
          {/* Live pill */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 mb-8 rounded-full px-4 py-2"
            style={{
              background: "rgba(34,211,238,0.07)",
              border: "1px solid rgba(34,211,238,0.2)",
              boxShadow: "0 0 20px rgba(34,211,238,0.06)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot"
              style={{ boxShadow: "0 0 5px rgba(52,211,153,0.7)" }}
            />
            <span className="text-[11px] font-semibold text-cyan-300 tracking-wide uppercase">
              Live on Bittensor Mainnet
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
            className="font-black leading-[1.06] mb-7"
            style={{ fontSize: "clamp(42px, 7vw, 72px)", letterSpacing: "-0.04em" }}
          >
            <span
              className="block text-transparent bg-clip-text"
              style={{
                backgroundImage: "linear-gradient(160deg, #f8fafc 0%, #ffffff 35%, #bae6fd 100%)",
              }}
            >
              Optimize Your
            </span>
            <span
              className="block text-transparent bg-clip-text"
              style={{
                backgroundImage: "linear-gradient(135deg, #67e8f9 0%, #22d3ee 45%, #38bdf8 100%)",
              }}
            >
              TAO Allocation
            </span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="text-[18px] text-slate-400 leading-relaxed mb-10 max-w-2xl mx-auto"
            style={{ letterSpacing: "-0.01em" }}
          >
            Live subnet intelligence with user-approved reallocation.{" "}
            <span className="text-slate-200 font-medium">
              No silent execution. No custody. Full control.
            </span>
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center gap-3 justify-center mb-10"
          >
            <Link href="/dashboard">
              <button
                className="flex items-center gap-2 rounded-xl font-semibold px-7 py-3 text-[14px] transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                  color: "#04060d",
                  boxShadow: "0 0 0 1px rgba(34,211,238,0.4), 0 6px 24px rgba(34,211,238,0.24), inset 0 1px 0 rgba(255,255,255,0.22)",
                  letterSpacing: "-0.01em",
                }}
              >
                Open App <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/subnets">
              <button
                className="flex items-center gap-2 rounded-xl font-medium px-7 py-3 text-[14px] text-slate-200 transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                  letterSpacing: "-0.01em",
                }}
              >
                Explore Subnets
              </button>
            </Link>
          </motion.div>

          {/* Trust pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.32 }}
            className="flex items-center gap-6 justify-center flex-wrap"
          >
            {["You approve every move.", "No seed phrase storage.", "No silent execution."].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                <span className="text-[12px] text-slate-500">{t}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── MARKET STRIP ────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.012)", overflow: "hidden" }}>
        <div className="flex py-2.5">
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

      {/* ── FEATURED SUBNETS ────────────────────────────────────────── */}
      <section className="py-24 px-8">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.12em] mb-3">
                Live Opportunities
              </div>
              <h2
                className="font-bold text-white mb-2"
                style={{ fontSize: "32px", letterSpacing: "-0.03em" }}
              >
                Top Performing Subnets
              </h2>
              <p className="text-[14px] text-slate-500">Ranked by composite score. Updated continuously.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { netuid: 49, name: "Protein Folding", yield: "26.7%", score: 88, risk: "LOW",  delta: "+0.4%", liquidity: "13,800 τ", grad: "from-cyan-500 to-blue-600",    accent: "#22d3ee" },
              { netuid: 1,  name: "Text Prompting",  yield: "24.3%", score: 84, risk: "LOW",  delta: "+1.2%", liquidity: "12,400 τ", grad: "from-violet-500 to-purple-700", accent: "#8b5cf6" },
              { netuid: 25, name: "Code Execution",  yield: "22.1%", score: 80, risk: "LOW",  delta: "+1.5%", liquidity: "9,700 τ",  grad: "from-emerald-500 to-teal-700",  accent: "#34d399" },
            ].map((s, i) => (
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
      <section className="py-24 px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <div className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.12em] mb-3">How It Works</div>
              <h2
                className="font-bold text-white"
                style={{ fontSize: "32px", letterSpacing: "-0.03em" }}
              >
                From data to decision in four steps
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
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
                      backgroundImage: "linear-gradient(135deg, #67e8f9 0%, #22d3ee 100%)",
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
      <section className="py-24 px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.12em] mb-3">Platform</div>
              <h2
                className="font-bold text-white"
                style={{ fontSize: "32px", letterSpacing: "-0.03em" }}
              >
                Built for serious TAO stakers
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
      <section className="py-24 px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-4xl mx-auto">
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
      <section className="py-24 px-8 relative overflow-hidden" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
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
              Start for{" "}
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(135deg, #67e8f9 0%, #22d3ee 45%, #38bdf8 100%)" }}
              >
                0.5 τ/month
              </span>
            </h2>
            <p className="text-[15px] text-slate-500 mb-10 leading-relaxed">
              Unlock full subnet analytics, the recommendation engine, and assisted reallocation.
              <br />Pay in TAO. Extend anytime. No auto-renewal.
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
                  Get Premium <ArrowRight className="w-4 h-4" />
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
