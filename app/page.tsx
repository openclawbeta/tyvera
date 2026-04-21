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
  thesis?: string[];
  stakers?: number;
  score?: number;
}

interface FeaturedPick extends LiveSubnet {
  dailyYield: number;
  annualYield: number;
  vsRootPp: number | null; // annual pp delta vs root; null when no root data
  thesisLine: string | null;
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
  const [featured, setFeatured] = useState<FeaturedPick[]>([]);
  const [rootAnnual, setRootAnnual] = useState<number | null>(null);
  const [topDailyPct, setTopDailyPct] = useState<number | null>(null);

  useEffect(() => {
    fetchWithTimeout("/api/subnets", { timeoutMs: 10_000 })
      .then((r) => (r.ok ? r.json() : null))
      .then((raw) => {
        const data = Array.isArray(raw) ? raw : raw?.subnets ?? [];
        if (!Array.isArray(data) || data.length === 0) return;

        // Isolate root (netuid 0) — it's the zero-risk TAO staking baseline.
        const root = (data as LiveSubnet[]).find((s) => s.netuid === 0);
        const rootDaily =
          root && root.liquidity > 0 && root.emissions > 0
            ? (root.emissions / root.liquidity) * 100
            : null;
        const rootAnn = rootDaily != null ? rootDaily * 365 : null;
        setRootAnnual(rootAnn);

        const alpha = (data as LiveSubnet[])
          .filter((s) => s.netuid > 0 && s.emissions > 0 && s.liquidity > 0)
          .map((s) => {
            const dailyYield = (s.emissions / s.liquidity) * 100;
            const annualYield = dailyYield * 365;
            const vsRootPp = rootAnn != null ? annualYield - rootAnn : null;
            const thesisLine =
              Array.isArray(s.thesis) && s.thesis.length > 0 ? s.thesis[0] : null;
            return {
              ...s,
              dailyYield,
              annualYield,
              vsRootPp,
              thesisLine,
            } as FeaturedPick;
          })
          .sort((a, b) => b.dailyYield - a.dailyYield);

        const tickerItems = alpha.slice(0, 12).map((s) => ({
          name: /^SN\d+$/.test(s.name) ? `SN${s.netuid}` : `SN${s.netuid} ${s.name}`,
          yield: `+${s.dailyYield.toFixed(2)}%/day`,
          up: s.dailyYield > 0,
        }));
        if (tickerItems.length > 0) setTicker(tickerItems);

        setFeatured(alpha.slice(0, 3));
        if (alpha.length > 0) setTopDailyPct(alpha[0].dailyYield);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="tyvera-landing min-h-screen" style={{ background: "var(--aurora-cream)", color: "var(--aurora-ink)" }}>
      {/* ── NAV ── */}
      <nav
        className="tyvera-landing-nav fixed inset-x-0 top-0 z-50 flex h-16 items-center backdrop-blur"
        style={{
          borderBottom: "1px solid var(--aurora-hair)",
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
              <Zap className="h-4 w-4" style={{ color: "var(--aurora-ink)" }} strokeWidth={2.5} />
            </div>
            <span className="font-semibold" style={{ color: "var(--aurora-ink)", letterSpacing: "-0.02em" }}>
              Tyvera
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <div className="hidden items-center gap-1 lg:flex">
              <Link href="/subnets" className="tyvera-landing-navlink rounded-full px-4 py-2 text-[13px] font-medium transition-all" style={{ color: "var(--aurora-sub)" }}>
                Subnets
              </Link>
              <Link href="/metrics" className="tyvera-landing-navlink rounded-full px-4 py-2 text-[13px] font-medium transition-all" style={{ color: "var(--aurora-sub)" }}>
                Metrics
              </Link>
              <Link href="/pricing" className="tyvera-landing-navlink rounded-full px-4 py-2 text-[13px] font-medium transition-all" style={{ color: "var(--aurora-sub)" }}>
                Pricing
              </Link>
              <Link href="/developers" className="tyvera-landing-navlink rounded-full px-4 py-2 text-[13px] font-medium transition-all" style={{ color: "var(--aurora-sub)" }}>
                Developers
              </Link>
              <Link href="/signup" className="ml-2">
                <button className="btn-primary text-[13px]">
                  Enter Workspace <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>
            </div>
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
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--aurora-sub)", fontFamily: "'JetBrains Mono', monospace" }}>
                  Live on Bittensor Mainnet
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
                className="mb-7 max-w-4xl font-semibold leading-[0.98]"
                style={{ fontSize: "clamp(46px, 7vw, 88px)", letterSpacing: "-0.035em", color: "var(--aurora-ink)" }}
              >
                <span className="block">Find the best</span>
                <span className="block serif" style={{ color: "var(--aurora-sub)" }}>
                  Bittensor subnet to stake.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                className="mb-10 max-w-2xl text-[18px] leading-relaxed md:text-[20px]"
                style={{ color: "var(--aurora-sub)", letterSpacing: "-0.01em" }}
              >
                Live yields for every Bittensor subnet, benchmarked against root staking. Composite scores, risk bands, and a transparent methodology — so you know where your TAO earns the most, and what it costs in risk.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="mb-10 flex flex-wrap items-center gap-5"
              >
                <Link href="/signup">
                  <button className="btn-primary text-[14px]" style={{ padding: "14px 28px" }}>
                    Start free — see today&rsquo;s top picks <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
                <Link
                  href="/pricing"
                  className="text-[14px] font-medium underline decoration-dotted underline-offset-4 transition-colors"
                  style={{ color: "var(--aurora-sub)" }}
                >
                  View pricing
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.32 }}
                className="grid max-w-3xl gap-3 sm:grid-cols-3"
              >
                {[
                  [
                    "Top yield today",
                    topDailyPct != null
                      ? `${topDailyPct.toFixed(2)}% / day`
                      : "Loading…",
                  ],
                  [
                    "Root baseline",
                    rootAnnual != null
                      ? `~${rootAnnual.toFixed(1)}% APR`
                      : "Loading…",
                  ],
                  ["Non-custodial", "You sign every move"],
                ].map(([title, sub]) => (
                  <div key={title} className="glass px-4 py-4">
                    <div className="text-sm font-semibold" style={{ color: "var(--aurora-ink)" }}>{title}</div>
                    <div className="mt-1 text-xs" style={{ color: "var(--aurora-sub)" }}>{sub}</div>
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
                <div className="mb-5 flex items-start justify-between border-b pb-5" style={{ borderColor: "var(--aurora-hair)" }}>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--aurora-sub)", fontFamily: "'JetBrains Mono', monospace" }}>
                      Top picks right now
                    </div>
                    <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.03em]" style={{ color: "var(--aurora-ink)" }}>
                      Where TAO is earning the most today
                    </h2>
                    <p className="mt-2 max-w-sm text-[13px] leading-relaxed" style={{ color: "var(--aurora-sub)" }}>
                      Ranked by realized daily yield, with the delta over root staking shown in pp.
                    </p>
                  </div>
                  <div className="tag-violet shrink-0">Live</div>
                </div>

                <div className="flex flex-col gap-3">
                  {(featured.length > 0 ? featured : [null, null, null]).map((s, i) => {
                    if (!s) {
                      return (
                        <div
                          key={`placeholder-${i}`}
                          className="glass p-4"
                          style={{ opacity: 0.4 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl" style={{ background: "var(--surface-3)" }} />
                            <div className="flex-1">
                              <div className="h-3 w-24 rounded" style={{ background: "var(--surface-3)" }} />
                              <div className="mt-2 h-2 w-40 rounded" style={{ background: "var(--surface-3)" }} />
                            </div>
                          </div>
                        </div>
                      );
                    }
                    const grad = GRADIENT_CLASSES[i % 3];
                    const accent = ACCENT_COLORS[i % 3];
                    const rank = i + 1;
                    return (
                      <Link
                        key={s.netuid}
                        href={`/subnets/${s.netuid}`}
                        className="glass relative overflow-hidden p-4 transition-transform hover:-translate-y-0.5"
                      >
                        <div
                          className="absolute right-0 top-0 h-24 w-32 pointer-events-none"
                          style={{ background: `radial-gradient(ellipse at top right, ${accent}55, transparent 70%)` }}
                        />
                        <div className="relative flex items-center gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className="text-[10px] font-bold uppercase tracking-[0.14em]"
                              style={{ color: "var(--aurora-sub)", fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              #{rank}
                            </span>
                            <div
                              className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold", grad)}
                              style={{ color: "var(--aurora-ink)" }}
                            >
                              {s.netuid}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="truncate text-[13px] font-semibold"
                                style={{ color: "var(--aurora-ink)", letterSpacing: "-0.01em" }}
                              >
                                {/^SN\d+$/.test(s.name) ? `SN${s.netuid}` : s.name}
                              </span>
                              <span className="tag-emerald shrink-0">{s.risk}</span>
                            </div>
                            <div
                              className="mt-1 text-[11px]"
                              style={{ color: "var(--aurora-sub)" }}
                            >
                              {s.thesisLine ?? `SN${s.netuid} · ${formatLiquidity(s.liquidity)} staked`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className="text-[18px] font-semibold tabular-nums"
                              style={{ color: "var(--aurora-ink)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}
                            >
                              {s.dailyYield.toFixed(2)}%
                            </div>
                            <div className="text-[10px]" style={{ color: "var(--aurora-sub)" }}>
                              /day
                            </div>
                            {s.vsRootPp != null && (
                              <div
                                className="mt-1 text-[10px] font-bold tabular-nums"
                                style={{
                                  color: s.vsRootPp >= 0 ? "#0B8F5A" : "#C0392B",
                                  fontFamily: "'JetBrains Mono', monospace",
                                }}
                              >
                                {s.vsRootPp >= 0 ? "+" : ""}
                                {s.vsRootPp.toFixed(1)}pp vs root
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--aurora-hair)" }}>
                  <span className="text-[11px]" style={{ color: "var(--aurora-sub)" }}>
                    {rootAnnual != null
                      ? `Root staking baseline: ~${rootAnnual.toFixed(1)}% APR`
                      : "Fetching root baseline…"}
                  </span>
                  <Link
                    href="/subnets"
                    className="text-[11px] font-semibold transition-colors"
                    style={{ color: "#5B3FBF" }}
                  >
                    View all 128+ →
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div style={{ borderTop: "1px solid var(--aurora-hair)", borderBottom: "1px solid var(--aurora-hair)", background: "var(--surface-1)", overflow: "hidden" }}>
        <div
          className="flex py-2.5"
          style={{ animation: "ticker-scroll 30s linear infinite", width: "max-content" }}
        >
          {[...ticker, ...ticker].map((item, i) => (
            <div
              key={`${item.name}-${i}`}
              className="flex shrink-0 items-center gap-3 px-6"
              style={{ borderRight: "1px solid var(--aurora-hair)" }}
            >
              <span className="whitespace-nowrap text-[11px] font-medium" style={{ color: "var(--aurora-sub)" }}>{item.name}</span>
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
            { label: "Chain Sync", value: "5 min", sub: "direct from Subtensor" },
            { label: "Scoring Factors", value: "5", sub: "per subnet" },
            { label: "Risk Bands", value: "4", sub: "LOW → SPECULATIVE" },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <div className="mb-1 text-[36px] font-semibold" style={{ letterSpacing: "-0.03em", color: "var(--aurora-ink)" }}>
                {m.value}
              </div>
              <div className="mb-0.5 text-[12px] font-semibold" style={{ color: "var(--aurora-ink)" }}>{m.label}</div>
              <div className="text-[11px]" style={{ color: "var(--aurora-sub)" }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── LIVE OPPORTUNITIES ── */}
      <section className="px-8 py-20">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <div className="mb-14 text-center">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--aurora-sub)", fontFamily: "'JetBrains Mono', monospace" }}>
                Live Opportunities
              </div>
              <h2 className="text-[40px] font-semibold" style={{ letterSpacing: "-0.03em", color: "var(--aurora-ink)" }}>
                Top Performing <span className="serif" style={{ color: "var(--aurora-sub)" }}>Subnets</span>
              </h2>
              <p className="mt-3 text-[14px]" style={{ color: "var(--aurora-sub)" }}>Ranked by composite score. Updated continuously.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(featured.length > 0
              ? featured.map((s, i) => ({
                  netuid: s.netuid,
                  name: /^SN\d+$/.test(s.name) ? `SN${s.netuid}` : s.name,
                  dailyPct: s.dailyYield,
                  annualPct: s.annualYield,
                  vsRootPp: s.vsRootPp,
                  risk: s.risk,
                  emissionsStr: `${formatLiquidity(s.emissions)}/day`,
                  liquidity: formatLiquidity(s.liquidity),
                  grad: GRADIENT_CLASSES[i % 3],
                  accent: ACCENT_COLORS[i % 3],
                }))
              : [
                  { netuid: 15, name: "Blockchain Insights", dailyPct: 0.23, annualPct: 83.95, vsRootPp: null, risk: "LOW", emissionsStr: "194.5 τ/day", liquidity: "86,148 τ", grad: GRADIENT_CLASSES[0], accent: ACCENT_COLORS[0] },
                  { netuid: 107, name: "SN107", dailyPct: 0.18, annualPct: 65.7, vsRootPp: null, risk: "LOW", emissionsStr: "155.4 τ/day", liquidity: "86,956 τ", grad: GRADIENT_CLASSES[1], accent: ACCENT_COLORS[1] },
                  { netuid: 114, name: "SN114", dailyPct: 0.11, annualPct: 40.15, vsRootPp: null, risk: "LOW", emissionsStr: "125.6 τ/day", liquidity: "114,317 τ", grad: GRADIENT_CLASSES[2], accent: ACCENT_COLORS[2] },
                ]
            ).map((s, i) => (
              <FadeIn key={s.netuid} delay={i * 0.1}>
                <Link href={`/subnets/${s.netuid}`} className="block">
                  <div className="glass relative overflow-hidden p-6 transition-transform hover:-translate-y-1">
                    <div
                      className="absolute right-0 top-0 h-32 w-40 pointer-events-none"
                      style={{ background: `radial-gradient(ellipse at top right, ${s.accent}55, transparent 70%)` }}
                    />

                    <div className="relative mb-5 flex items-center gap-3">
                      <div
                        className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold", s.grad)}
                        style={{ color: "var(--aurora-ink)" }}
                      >
                        {s.netuid}
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold" style={{ letterSpacing: "-0.015em", color: "var(--aurora-ink)" }}>
                          {s.name}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--aurora-sub)", fontFamily: "'JetBrains Mono', monospace" }}>
                          SN{s.netuid}
                        </div>
                      </div>
                    </div>

                    <div className="mb-0.5 text-[32px] font-semibold tabular-nums" style={{ letterSpacing: "-0.03em", color: "var(--aurora-ink)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {s.dailyPct.toFixed(2)}%
                    </div>
                    <div className="mb-3 text-[11px]" style={{ color: "var(--aurora-sub)" }}>
                      daily yield · <span className="font-semibold" style={{ color: "var(--aurora-ink)" }}>~{s.annualPct.toFixed(0)}% APR</span>
                    </div>

                    {s.vsRootPp != null && (
                      <div
                        className="mb-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold tabular-nums"
                        style={{
                          background: s.vsRootPp >= 0 ? "#E5F7EE" : "#FDECEA",
                          color: s.vsRootPp >= 0 ? "#0B8F5A" : "#C0392B",
                          border: `1px solid ${s.vsRootPp >= 0 ? "#A7F0D2" : "#F5B7B1"}`,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {s.vsRootPp >= 0 ? "▲" : "▼"} {s.vsRootPp >= 0 ? "+" : ""}{s.vsRootPp.toFixed(1)}pp vs root
                      </div>
                    )}

                    <div className="mb-4 divider" />

                    <div className="flex items-center gap-2">
                      <span className="tag-emerald">{s.risk} RISK</span>
                      <span className="text-[11px] font-semibold tabular-nums" style={{ color: "#5B3FBF", fontFamily: "'JetBrains Mono', monospace" }}>
                        {s.emissionsStr}
                      </span>
                      <span className="ml-auto text-[11px] tabular-nums" style={{ color: "var(--aurora-sub)" }}>
                        {s.liquidity} staked
                      </span>
                    </div>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/subnets"
              className="inline-flex items-center gap-2 text-[13px] font-semibold transition-colors"
              style={{ color: "#5B3FBF" }}
            >
              See all 128+ subnets, ranked <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── METHODOLOGY ── */}
      <section className="border-t px-8 py-24" style={{ borderColor: "var(--aurora-hair)", background: "var(--surface-1)" }}>
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <div className="mb-14 text-center">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--aurora-sub)", fontFamily: "'JetBrains Mono', monospace" }}>
                Methodology
              </div>
              <h2 className="text-[40px] font-semibold" style={{ letterSpacing: "-0.03em", color: "var(--aurora-ink)" }}>
                How we score <span className="serif" style={{ color: "var(--aurora-sub)" }}>every subnet.</span>
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-relaxed" style={{ color: "var(--aurora-sub)" }}>
                One composite score. Five weighted factors. Nothing hidden. Risk bands are derived from the same on-chain numbers — no gut feel, no vibes.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-5 lg:grid-cols-2">
            <FadeIn>
              <div className="glass p-7">
                <div className="mb-5 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: "#E4DBFF", border: "1px solid #C9B8FF" }}
                  >
                    <BarChart2 className="h-5 w-5" style={{ color: "#5B3FBF" }} />
                  </div>
                  <h3 className="text-[18px] font-semibold" style={{ letterSpacing: "-0.02em", color: "var(--aurora-ink)" }}>
                    Composite score weights
                  </h3>
                </div>

                <div className="flex flex-col gap-3">
                  {[
                    { label: "Liquidity", weight: 34, note: "τ staked into the subnet pool — exit cost & slippage floor" },
                    { label: "Yield", weight: 22, note: "Annualized emissions vs τ staked (benchmarked against root)" },
                    { label: "Participation", weight: 20, note: "Unique stakers — concentration & holder quality" },
                    { label: "Stability", weight: 14, note: "7-day yield volatility and emission consistency" },
                    { label: "Maturity", weight: 10, note: "Age and continuity since registration" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3">
                      <span
                        className="w-28 shrink-0 text-[13px] font-semibold"
                        style={{ color: "var(--aurora-ink)" }}
                      >
                        {row.label}
                      </span>
                      <div
                        className="relative h-2 flex-1 overflow-hidden rounded-full"
                        style={{ background: "var(--surface-3)" }}
                      >
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${row.weight}%`,
                            background: "linear-gradient(90deg, #8B5CF6 0%, #C9B8FF 100%)",
                          }}
                        />
                      </div>
                      <span
                        className="w-12 shrink-0 text-right text-[13px] font-bold tabular-nums"
                        style={{ color: "var(--aurora-ink)", fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {row.weight}%
                      </span>
                      <span
                        className="hidden flex-1 text-[11px] lg:block"
                        style={{ color: "var(--aurora-sub)" }}
                      >
                        {row.note}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="mt-5 text-[12px] leading-relaxed" style={{ color: "var(--aurora-sub)" }}>
                  Weights sum to 100%. Each factor is min-max normalized across all 128+ subnets, then combined into a single 0–100 composite. Recomputed every chain sync.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="glass p-7">
                <div className="mb-5 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: "#E5F7EE", border: "1px solid #A7F0D2" }}
                  >
                    <Shield className="h-5 w-5" style={{ color: "#0B8F5A" }} />
                  </div>
                  <h3 className="text-[18px] font-semibold" style={{ letterSpacing: "-0.02em", color: "var(--aurora-ink)" }}>
                    Risk bands
                  </h3>
                </div>

                <div className="flex flex-col gap-3">
                  {[
                    {
                      band: "LOW",
                      dot: "#0B8F5A",
                      bg: "#E5F7EE",
                      bdr: "#A7F0D2",
                      threshold: "≥ 1.5M τ staked · ≥ 180 stakers",
                      note: "Deep liquidity, broad participation, mature history.",
                    },
                    {
                      band: "MODERATE",
                      dot: "#B88A00",
                      bg: "#FFF6DC",
                      bdr: "#F0D890",
                      threshold: "≥ 400k τ staked · ≥ 96 stakers",
                      note: "Established subnet with meaningful activity.",
                    },
                    {
                      band: "HIGH",
                      dot: "#B65A17",
                      bg: "#FFE5D0",
                      bdr: "#FFD7BA",
                      threshold: "≥ 25k τ staked · ≥ 24 stakers",
                      note: "Growing but concentration / volatility risk.",
                    },
                    {
                      band: "SPECULATIVE",
                      dot: "#C0392B",
                      bg: "#FDECEA",
                      bdr: "#F5B7B1",
                      threshold: "Below the above thresholds",
                      note: "Early, thin, or volatile — treat as venture exposure.",
                    },
                  ].map((r) => (
                    <div
                      key={r.band}
                      className="rounded-2xl p-4"
                      style={{ background: r.bg, border: `1px solid ${r.bdr}` }}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: r.dot }} />
                        <span className="text-[12px] font-bold tracking-[0.08em]" style={{ color: r.dot, fontFamily: "'JetBrains Mono', monospace" }}>
                          {r.band}
                        </span>
                        <span className="ml-auto text-[11px] tabular-nums" style={{ color: "var(--aurora-sub)", fontFamily: "'JetBrains Mono', monospace" }}>
                          {r.threshold}
                        </span>
                      </div>
                      <p className="text-[12px] leading-relaxed" style={{ color: "var(--aurora-ink)" }}>
                        {r.note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.2}>
            <div className="mt-6 glass p-6">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "#FFF6DC", border: "1px solid #F0D890" }}
                >
                  <Lightbulb className="h-5 w-5" style={{ color: "#B88A00" }} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold" style={{ color: "var(--aurora-ink)" }}>
                    Benchmarked against root staking
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--aurora-sub)" }}>
                    Every subnet yield shows a <span className="font-semibold" style={{ color: "var(--aurora-ink)" }}>±pp vs root</span> delta — the pure-TAO staking yield on netuid 0 is the zero-risk baseline you&rsquo;re giving up to take alpha exposure.
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-t px-8 py-24" style={{ borderColor: "var(--aurora-hair)" }}>
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <div className="mb-16 text-center">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--aurora-sub)", fontFamily: "'JetBrains Mono', monospace" }}>
                How It Works
              </div>
              <h2 className="text-[40px] font-semibold" style={{ letterSpacing: "-0.03em", color: "var(--aurora-ink)" }}>
                From data to decision, <span className="serif" style={{ color: "var(--aurora-sub)" }}>honestly.</span>
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
                      style={{ background: "linear-gradient(90deg, var(--aurora-hair), transparent)" }}
                    />
                  )}
                  <div
                    className="mb-4 serif text-[56px] leading-none"
                    style={{ color: "var(--aurora-sub)" }}
                  >
                    {step.n}
                  </div>
                  <h3 className="mb-2 text-[16px] font-semibold" style={{ letterSpacing: "-0.01em", color: "var(--aurora-ink)" }}>
                    {step.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--aurora-sub)" }}>{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE GRID ── */}
      <section className="border-t px-8 py-24" style={{ borderColor: "var(--aurora-hair)" }}>
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <div className="mb-16 text-center">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--aurora-sub)", fontFamily: "'JetBrains Mono', monospace" }}>
                Platform
              </div>
              <h2 className="text-[40px] font-semibold" style={{ letterSpacing: "-0.03em", color: "var(--aurora-ink)" }}>
                Built for <span className="serif" style={{ color: "var(--aurora-sub)" }}>serious TAO stakers.</span>
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
                    <h3 className="mb-2 text-[17px] font-semibold" style={{ letterSpacing: "-0.015em", color: "var(--aurora-ink)" }}>
                      {f.title}
                    </h3>
                    <p className="text-[14px] leading-relaxed" style={{ color: "var(--aurora-sub)" }}>{f.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TRUST / KEYS ── */}
      <section className="border-t px-8 py-24" style={{ borderColor: "var(--aurora-hair)" }}>
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
                <h2 className="mb-3 text-[32px] font-semibold" style={{ letterSpacing: "-0.025em", color: "var(--aurora-ink)" }}>
                  Your keys. Your stake. <span className="serif" style={{ color: "var(--aurora-sub)" }}>Your control.</span>
                </h2>
                <p className="mx-auto max-w-lg text-[14px] leading-relaxed" style={{ color: "var(--aurora-sub)" }}>
                  Tyvera is a read-and-recommend platform. We analyze data and surface opportunities. Every move requires your explicit approval in your own wallet.
                </p>
              </div>

              <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
                {TRUST.map(({ icon: Icon, text, sub }) => (
                  <div
                    key={text}
                    className="flex items-start gap-3.5 rounded-2xl p-4"
                    style={{ background: "var(--surface-1)", border: "1px solid var(--aurora-hair)" }}
                  >
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "#E5F7EE", border: "1px solid #A7F0D2" }}
                    >
                      <Icon className="h-4 w-4" style={{ color: "#0B8F5A" }} />
                    </div>
                    <div>
                      <p className="mb-0.5 text-[14px] font-semibold" style={{ letterSpacing: "-0.01em", color: "var(--aurora-ink)" }}>
                        {text}
                      </p>
                      <p className="text-[12px]" style={{ color: "var(--aurora-sub)" }}>{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative overflow-hidden border-t px-8 py-24 aurora-bg" style={{ borderColor: "var(--aurora-hair)" }}>
        <div className="relative mx-auto max-w-3xl text-center">
          <FadeIn>
            <div className="chip mb-8 inline-flex items-center gap-2 px-3.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#B88A00" }} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--aurora-sub)", fontFamily: "'JetBrains Mono', monospace" }}>
                Plans
              </span>
            </div>

            <h2 className="mb-5 text-[56px] font-semibold" style={{ letterSpacing: "-0.035em", lineHeight: 1.03, color: "var(--aurora-ink)" }}>
              See where your TAO <span className="serif" style={{ color: "var(--aurora-sub)" }}>should be staked.</span>
            </h2>
            <p className="mb-10 text-[16px] leading-relaxed" style={{ color: "var(--aurora-sub)" }}>
              Free forever to explore the rankings. Paid plans unlock portfolio intelligence and reallocation recommendations. You approve every move in your own wallet.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-5">
              <Link href="/signup">
                <button className="btn-primary text-[14px]" style={{ padding: "16px 32px" }}>
                  Start free — see today&rsquo;s top picks <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link
                href="/pricing"
                className="text-[13px] font-medium underline decoration-dotted underline-offset-4"
                style={{ color: "var(--aurora-sub)" }}
              >
                Compare plans
              </Link>
            </div>
            <p className="mt-6 text-[11px]" style={{ color: "var(--aurora-sub)" }}>
              Non-custodial. No seed phrase storage. Nothing executes without your signature.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--aurora-hair)", padding: "40px 32px", background: "var(--surface-1)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-lg"
              style={{ background: "linear-gradient(135deg, #C9B8FF 0%, #FFD7BA 50%, #A7F0D2 100%)" }}
            >
              <Zap className="h-3 w-3" style={{ color: "var(--aurora-ink)" }} />
            </div>
            <span className="text-[13px] font-semibold" style={{ color: "var(--aurora-ink)" }}>Tyvera</span>
          </div>
          <p className="text-[11px]" style={{ color: "var(--aurora-sub)" }}>Not financial advice. You approve every move.</p>
          <div className="flex flex-wrap gap-5">
            {[
              { label: "Subnets", href: "/subnets" },
              { label: "Pricing", href: "/pricing" },
              { label: "Developers", href: "/developers" },
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Risk Disclosure", href: "/risk-disclosure" },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="text-[11px] transition-colors duration-150" style={{ color: "var(--aurora-sub)" }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
