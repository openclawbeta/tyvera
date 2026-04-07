"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  Shield,
  Lock,
  Eye,
  AlertTriangle,
  CheckCircle,
  GitCompare,
  Clock,
  Activity,
  Layers,
  Globe,
  BookOpen,
  Github,
  MessageSquare,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { getSubnetByNetuid, fetchSubnetByNetuid } from "@/lib/api/subnets";
import { DataSourceBadge } from "@/components/ui-custom/data-source-badge";
import { getRecommendations } from "@/lib/api/recommendations";
import type { SubnetDetailModel } from "@/lib/types/subnets";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui-custom/fade-in";
import { MetricPill } from "@/components/ui-custom/metric-pill";
import { SectionTitle } from "@/components/ui-custom/section-title";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { MetagraphTable } from "@/components/subnets/metagraph-table";
import { cn, subnetGradient, scoreColor, scoreBg, riskBg } from "@/lib/utils";
import { detectRiskFlags } from "@/lib/data/subnets-real-helpers";
import { SubnetRiskBanner } from "@/components/subnets/subnet-risk-banner";

// ── Per-subnet extended mock data ──────────────────────────────────────────

const CHART_SEEDS: Record<number, { emissionsBase: number; inflowBase: number }> = {
  1:  { emissionsBase: 8.0,  inflowBase: 300  },
  3:  { emissionsBase: 2.2,  inflowBase: -150 },
  4:  { emissionsBase: 5.2,  inflowBase: 190  },
  8:  { emissionsBase: 2.8,  inflowBase: 380  },
  11: { emissionsBase: 1.3,  inflowBase: -50  },
  18: { emissionsBase: 6.5,  inflowBase: 540  },
  19: { emissionsBase: 2.5,  inflowBase: 220  },
  21: { emissionsBase: 3.8,  inflowBase: 80   },
  25: { emissionsBase: 5.5,  inflowBase: 280  },
  32: { emissionsBase: 2.1,  inflowBase: -35  },
  40: { emissionsBase: 1.4,  inflowBase: 600  },
  49: { emissionsBase: 9.8,  inflowBase: 160  },
};

const DAYS_30 = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  return `${d.getMonth() + 1}/${d.getDate()}`;
});

function buildYieldHistory(momentum: number[]): Array<{ label: string; value: number }> {
  // Extend 14d → 30d by mirroring/interpolating backwards
  const extended: number[] = [];
  const first = momentum[0];
  const slope = (momentum[1] - momentum[0]);
  for (let i = 16; i > 0; i--) {
    extended.push(+(first - slope * i * 0.8 + (Math.sin(i) * 0.2)).toFixed(2));
  }
  const full = [...extended, ...momentum];
  return DAYS_30.map((label, i) => ({ label, value: full[i] ?? momentum[momentum.length - 1] }));
}

function buildEmissionsHistory(base: number): Array<{ label: string; value: number }> {
  return DAYS_30.map((label, i) => ({
    label,
    value: +(base + Math.sin(i * 0.5) * 0.3 + (i / 30) * 0.4).toFixed(3),
  }));
}

function buildInflowHistory(base: number): Array<{ label: string; value: number }> {
  return DAYS_30.map((label, i) => ({
    label,
    value: Math.round(base + Math.sin(i * 0.7) * Math.abs(base) * 0.4 + i * (base > 0 ? 2 : -2)),
  }));
}

// ── Risk color map ──────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, { text: string; glow: string }> = {
  LOW:         { text: "#34d399", glow: "rgba(52,211,153,0.35)"  },
  MODERATE:    { text: "#fbbf24", glow: "rgba(251,191,36,0.35)"  },
  HIGH:        { text: "#f87171", glow: "rgba(248,113,113,0.35)" },
  SPECULATIVE: { text: "#e879f9", glow: "rgba(232,121,249,0.35)" },
};

// ── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  accent = "slate",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "cyan" | "violet" | "emerald" | "amber" | "rose" | "slate";
}) {
  const ACCENTS = {
    cyan:    { color: "#22d3ee", bg: "rgba(34,211,238,0.07)",  bdr: "rgba(34,211,238,0.15)"  },
    violet:  { color: "#8b5cf6", bg: "rgba(139,92,246,0.07)",  bdr: "rgba(139,92,246,0.15)"  },
    emerald: { color: "#34d399", bg: "rgba(52,211,153,0.07)",  bdr: "rgba(52,211,153,0.15)"  },
    amber:   { color: "#fbbf24", bg: "rgba(251,191,36,0.07)",  bdr: "rgba(251,191,36,0.15)"  },
    rose:    { color: "#f87171", bg: "rgba(248,113,113,0.07)", bdr: "rgba(248,113,113,0.15)" },
    slate:   { color: "#94a3b8", bg: "rgba(255,255,255,0.03)", bdr: "rgba(255,255,255,0.07)" },
  };
  const a = ACCENTS[accent];
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.028) 0%, rgba(255,255,255,0.014) 100%)",
        border: "1px solid rgba(255,255,255,0.068)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 2px 16px rgba(0,0,0,0.22)",
      }}
    >
      <div
        className="text-[9.5px] font-semibold uppercase"
        style={{ letterSpacing: "0.09em", color: "#64748b" }}
      >
        {label}
      </div>
      <div
        className="font-bold tabular-nums leading-none"
        style={{ fontSize: "20px", letterSpacing: "-0.025em", color: "#f8fafc" }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px]" style={{ color: "#475569" }}>{sub}</div>
      )}
      <div
        className="h-[2px] w-8 rounded-full mt-auto"
        style={{ background: a.color, boxShadow: `0 0 6px ${a.bg}`, opacity: 0.7 }}
      />
    </div>
  );
}

function ChartPanel({
  title,
  label,
  data,
  color,
  gradientId,
  suffix,
  prefix,
  height = 140,
}: {
  title: string;
  label?: string;
  data: Array<{ label: string; value: number }>;
  color: string;
  gradientId: string;
  suffix?: string;
  prefix?: string;
  height?: number;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.028) 0%, rgba(255,255,255,0.014) 100%)",
        border: "1px solid rgba(255,255,255,0.068)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.24)",
      }}
    >
      <div className="mb-4">
        <SectionTitle label={label} title={title} />
      </div>
      <SimpleLineChart
        data={data}
        color={color}
        height={height}
        showGrid
        suffix={suffix}
        prefix={prefix}
        gradientId={gradientId}
      />
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function SubnetDetailPage() {
  const params = useParams();
  const netuid = Number(params.netuid);

  // Seed from the static snapshot immediately so the page renders without a
  // loading flash for the 12 curated subnets. For subnets outside the snapshot
  // (netuids not in subnets-real.ts) the useEffect below fetches from
  // /api/subnets?netuid=N and fills in the live data.
  const [subnet, setSubnet] = useState<SubnetDetailModel | null>(
    () => getSubnetByNetuid(netuid) ?? null,
  );
  const [dataSource, setDataSource] = useState<string>("static-snapshot");

  useEffect(() => {
    // Re-run whenever netuid changes (user navigates directly between detail pages)
    const syncFromSnapshot = getSubnetByNetuid(netuid) ?? null;
    if (syncFromSnapshot) {
      setSubnet(syncFromSnapshot);
    } else {
      // Subnet not in static snapshot — fetch from the live route handler
      fetchSubnetByNetuid(netuid)
        .then((result) => {
          setSubnet(result.subnet ?? null);
          setDataSource(result.dataSource);
        })
        .catch(() => {
          /* Leave subnet as null — UI shows "not found" state */
        });
    }
  }, [netuid]);

  // Find any recommendation involving this subnet
  const relatedRec = useMemo(
    () =>
      getRecommendations().find(
        (r) => r.fromSubnet.netuid === netuid || r.toSubnet.netuid === netuid,
      ) ?? null,
    [netuid],
  );

  if (!subnet) {
    return (
      <div className="max-w-[1100px] mx-auto flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-400 text-sm">Loading SN{netuid}…</p>
        <Link href="/subnets">
          <button className="btn-secondary text-xs gap-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Subnets
          </button>
        </Link>
      </div>
    );
  }

  const seeds        = CHART_SEEDS[subnet.netuid] ?? { emissionsBase: 3, inflowBase: 100 };
  const yieldData    = buildYieldHistory(subnet.momentum);
  const emissionsData = buildEmissionsHistory(seeds.emissionsBase);
  const inflowData   = buildInflowHistory(seeds.inflowBase);

  const isUp      = subnet.yieldDelta7d >= 0;
  const riskClr   = RISK_COLORS[subnet.risk] ?? RISK_COLORS.LOW;
  const gradCls   = `bg-gradient-to-br ${subnetGradient(subnet.netuid)}`;

  const yieldTrend  = yieldData[yieldData.length - 1].value - yieldData[0].value;
  const inflowTrend = inflowData[inflowData.length - 1].value;
  const subnetLinks = [
    subnet.links?.website ? { label: "Website", href: subnet.links.website, icon: Globe } : null,
    subnet.links?.docs ? { label: "Docs", href: subnet.links.docs, icon: BookOpen } : null,
    subnet.links?.github ? { label: "GitHub", href: subnet.links.github, icon: Github } : null,
    subnet.links?.x ? { label: "X", href: subnet.links.x, icon: MessageSquare } : null,
    subnet.links?.discord ? { label: "Discord", href: subnet.links.discord, icon: MessageSquare } : null,
    subnet.links?.explorer ? { label: "Explorer", href: subnet.links.explorer, icon: ExternalLink } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; icon: typeof Globe }>;

  return (
    <div className="max-w-[1100px] mx-auto space-y-6">

      {/* ── Back nav ── */}
      <FadeIn>
        <Link
          href="/subnets"
          className="inline-flex items-center gap-2 text-[12px] text-slate-500 font-medium transition-colors duration-150 hover:text-slate-300"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All Subnets
        </Link>
      </FadeIn>

      {/* ── Hero header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl p-7 relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.038) 0%, rgba(255,255,255,0.018) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.055) inset, 0 12px 48px rgba(0,0,0,0.38)",
        }}
      >
        {/* Background gradient accent */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 50% 60% at 90% 50%, ${riskClr.glow.replace("0.35", "0.06")}, transparent 70%)`,
          }}
        />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          {/* Left: identity */}
          <div className="flex items-start gap-5">
            {/* Logo */}
            <div
              className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0", gradCls)}
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.15) inset" }}
            >
              {subnet.netuid}
            </div>

            <div>
              {/* Name + symbol */}
              <div className="flex items-center gap-3 mb-2">
                <h1
                  className="font-black text-white"
                  style={{ fontSize: "28px", letterSpacing: "-0.03em", lineHeight: 1 }}
                >
                  {subnet.name}
                </h1>
                <span
                  className="font-mono font-bold text-slate-500"
                  style={{ fontSize: "14px" }}
                >
                  {subnet.symbol}
                </span>
              </div>

              {/* Tags row */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span
                  className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8",
                    letterSpacing: "0.06em",
                  }}
                >
                  SN{subnet.netuid}
                </span>
                <span
                  className="rounded-lg px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#64748b",
                    letterSpacing: "0.03em",
                  }}
                >
                  {subnet.category}
                </span>
                <span
                  className={cn("tag border", scoreBg(subnet.score))}
                >
                  Score {subnet.score}
                </span>
                <span className={cn("tag border", riskBg(subnet.risk))}>
                  {subnet.risk}
                </span>
                <DataSourceBadge source={dataSource} />
                {subnet.age > 180 && (
                  <span className="tag-emerald">Established</span>
                )}
              </div>

              {/* Description */}
              <p className="text-[13px] text-slate-400 leading-relaxed max-w-2xl">
                {subnet.summary ?? subnet.description}
              </p>

              {subnetLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 max-w-2xl">
                  {subnetLinks.map(({ label, href, icon: Icon }) => (
                    <a
                      key={`${label}-${href}`}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors duration-150"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#cbd5e1",
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: headline metric + actions */}
          <div className="flex w-full flex-col gap-4 xl:w-auto xl:items-end xl:text-right">
            <div className="text-right">
              <div
                className="font-black text-white tabular-nums leading-none"
                style={{ fontSize: "40px", letterSpacing: "-0.04em" }}
              >
                {subnet.yield}%
              </div>
              <div className="text-[11px] text-slate-600 mt-1 uppercase tracking-wider">
                Est. Annual Yield
              </div>
              <div className="flex items-center justify-end gap-2 mt-2">
                <MetricPill value={subnet.yieldDelta7d} size="sm" />
                <span className="text-[10px] text-slate-600">7d</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <button
                className="flex items-center gap-2 rounded-xl text-[12px] font-medium px-4 py-2 transition-all duration-200"
                style={{
                  background: subnet.isWatched ? "rgba(34,211,238,0.08)" : "rgba(255,255,255,0.05)",
                  border: subnet.isWatched ? "1px solid rgba(34,211,238,0.22)" : "1px solid rgba(255,255,255,0.1)",
                  color: subnet.isWatched ? "#22d3ee" : "#94a3b8",
                }}
              >
                {subnet.isWatched
                  ? <><BookmarkCheck className="w-3.5 h-3.5" /> Watching</>
                  : <><Bookmark className="w-3.5 h-3.5" /> Watch</>
                }
              </button>
              <button
                className="flex items-center gap-2 rounded-xl text-[12px] font-medium px-4 py-2 transition-all duration-200"
                style={{
                  background: "rgba(139,92,246,0.08)",
                  border: "1px solid rgba(139,92,246,0.2)",
                  color: "#a78bfa",
                }}
              >
                <GitCompare className="w-3.5 h-3.5" />
                Compare
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Key metrics grid ── */}
      <StaggerContainer>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Liquidity",      value: `${subnet.liquidity.toLocaleString()} τ`, sub: "total staked",        accent: "cyan"    as const },
            { label: "Daily Emissions", value: `${subnet.emissions} τ`,                  sub: "per day avg",        accent: "violet"  as const },
            { label: "Active Stakers", value: subnet.stakers.toLocaleString(),           sub: "unique addresses",   accent: "emerald" as const },
            { label: "Validator Take", value: `${subnet.validatorTake}%`,                sub: "commission rate",    accent: "amber"   as const },
          ].map((m, i) => (
            <StaggerItem key={m.label}>
              <MetricCard {...m} />
            </StaggerItem>
          ))}
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {([
            {
              label: "7d Net Inflow",
              value: `${subnet.inflow >= 0 ? "+" : ""}${subnet.inflow.toLocaleString()} τ`,
              sub: `${subnet.inflowPct >= 0 ? "+" : ""}${subnet.inflowPct}% of stake`,
              accent: subnet.inflow >= 0 ? "emerald" : "rose",
            },
            { label: "Breakeven",  value: `${subnet.breakeven}d`,     sub: "to recover move fee",   accent: "slate" },
            { label: "Subnet Age", value: `${subnet.age}d`,            sub: "days since launch",     accent: "slate" },
            { label: "Inflow %",   value: `${Math.abs(subnet.inflowPct)}%`, sub: subnet.inflow >= 0 ? "net positive" : "net negative", accent: subnet.inflow >= 0 ? "cyan" : "rose" },
          ] satisfies Array<{ label: string; value: string; sub?: string; accent?: "cyan" | "violet" | "emerald" | "amber" | "rose" | "slate" }>).map((m) => (
            <StaggerItem key={m.label}>
              <MetricCard {...m} />
            </StaggerItem>
          ))}
        </div>
      </StaggerContainer>

      {/* ── Risk flags banner ── */}
      {(() => {
        const riskFlags = detectRiskFlags(subnet);
        return riskFlags.length > 0 ? (
          <FadeIn delay={0.12}>
            <SubnetRiskBanner
              flags={riskFlags}
              subnetName={subnet.name}
              mode="full"
            />
          </FadeIn>
        ) : null;
      })()}

      {/* ── Charts ── */}
      <FadeIn delay={0.15}>
        <div className="grid grid-cols-12 gap-5">
          {/* Yield history — wide */}
          <div className="col-span-12 lg:col-span-8">
            <ChartPanel
              title="Yield History"
              label="30-day trend"
              data={yieldData}
              color={isUp ? "#22d3ee" : "#f87171"}
              gradientId={`yield-detail-${subnet.netuid}`}
              suffix="%"
              height={180}
            />
          </div>

          {/* Emissions — narrow */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
            <ChartPanel
              title="Daily Emissions"
              label="30d avg"
              data={emissionsData}
              color="#8b5cf6"
              gradientId={`ems-${subnet.netuid}`}
              suffix=" τ"
              height={72}
            />
            <ChartPanel
              title="Stake Inflow"
              label="30d rolling"
              data={inflowData}
              color={inflowTrend >= 0 ? "#34d399" : "#f87171"}
              gradientId={`inflow-${subnet.netuid}`}
              suffix=" τ"
              height={72}
            />
          </div>
        </div>
      </FadeIn>

      {/* ── Metagraph table ── */}
      <FadeIn delay={0.15}>
        <div>
          <div className="mb-5">
            <SectionTitle title="Metagraph" subtitle="Validators & miners on this subnet" />
          </div>
          <div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(255,255,255,0.018)",
              border: "1px solid rgba(255,255,255,0.065)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.24)",
            }}
          >
            <MetagraphTable netuid={subnet.netuid} />
          </div>
        </div>
      </FadeIn>

      {/* ── Intelligence row: thesis + use cases ── */}
      <FadeIn delay={0.18}>
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 lg:col-span-7">
            <div
              className="rounded-2xl p-6 h-full"
              style={{
                background: "rgba(255,255,255,0.018)",
                border: "1px solid rgba(255,255,255,0.065)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.24)",
              }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(34,211,238,0.1)",
                    border: "1px solid rgba(34,211,238,0.2)",
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                </div>
                <span className="font-bold text-slate-300 uppercase" style={{ fontSize: "10px", letterSpacing: "0.1em" }}>
                  Tyvera Readout
                </span>
              </div>

              <p className="text-[13px] text-slate-400 leading-relaxed mb-5">
                {subnet.description}
              </p>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-2">Why this subnet matters</div>
                  <div className="space-y-2.5">
                    {(subnet.thesis ?? [
                      "Check emissions efficiency, liquidity depth, and subnet age before treating the yield at face value.",
                      "Look for consistency between the operator story and the live on-chain metrics.",
                      "Use this subnet as part of a category comparison rather than in isolation.",
                    ]).map((point) => (
                      <div key={point} className="flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 bg-cyan-400 flex-shrink-0" />
                        <p className="text-[12px] text-slate-400 leading-relaxed">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-2">What it can be used for</div>
                  <div className="flex flex-wrap gap-2">
                    {(subnet.useCases ?? ["Subnet research", "Allocator watchlist", "Category benchmarking"]).map((item) => (
                      <span
                        key={item}
                        className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          color: "#cbd5e1",
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <div
              className="rounded-2xl p-6 h-full"
              style={{
                background: "rgba(255,255,255,0.018)",
                border: "1px solid rgba(255,255,255,0.065)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.24)",
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-4">Research checklist</div>
              <div className="space-y-3">
                {[
                  `Liquidity depth: ${subnet.liquidity.toLocaleString()} τ`,
                  `Emissions: ${subnet.emissions} τ/day`,
                  `Age: ${subnet.age} days live`,
                  `Risk band: ${subnet.risk}`,
                  subnet.links?.explorer ? "Open TaoStats explorer for operator-level follow-up" : "Use Tyvera metrics and external explorers for operator validation",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[12px] text-slate-400 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* ── Bottom row: Recommendation insight + Trust ── */}
      <FadeIn delay={0.2}>
        <div className="grid grid-cols-12 gap-5">

          {/* Recommendation insight */}
          <div className="col-span-12 lg:col-span-7">
            {relatedRec ? (
              <div
                className="rounded-2xl p-6 h-full"
                style={{
                  background: relatedRec.toSubnet.netuid === netuid
                    ? "rgba(34,211,238,0.04)"
                    : "rgba(255,255,255,0.02)",
                  border: relatedRec.toSubnet.netuid === netuid
                    ? "1px solid rgba(34,211,238,0.25)"
                    : "1px solid rgba(255,193,7,0.2)",
                  boxShadow: relatedRec.toSubnet.netuid === netuid
                    ? "0 0 32px rgba(34,211,238,0.05)"
                    : "0 0 20px rgba(251,191,36,0.04)",
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div
                      className="font-bold uppercase mb-1"
                      style={{
                        fontSize: "9.5px",
                        letterSpacing: "0.1em",
                        color: relatedRec.toSubnet.netuid === netuid ? "#22d3ee" : "#fbbf24",
                      }}
                    >
                      {relatedRec.toSubnet.netuid === netuid
                        ? "Recommendation · Move Here"
                        : "Recommendation · Move Away"}
                    </div>
                    <div
                      className="font-bold text-white"
                      style={{ fontSize: "16px", letterSpacing: "-0.02em" }}
                    >
                      {relatedRec.toSubnet.netuid === netuid
                        ? `+${relatedRec.projectedEdge.toFixed(1)}% projected edge over ${relatedRec.fromSubnet.name}`
                        : `Consider moving to ${relatedRec.toSubnet.name}`}
                    </div>
                  </div>
                  <span
                    className="tag-cyan flex-shrink-0"
                    style={{ marginTop: "2px" }}
                  >
                    {relatedRec.band}
                  </span>
                </div>

                <p className="text-[12px] text-slate-400 leading-relaxed mb-5">
                  {relatedRec.rationale}
                </p>

                {/* Factor bullets */}
                <div className="space-y-2 mb-5">
                  {relatedRec.factorBullets.slice(0, 3).map((b, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{
                          background: b.direction === "POSITIVE"
                            ? "#34d399"
                            : b.direction === "NEGATIVE"
                            ? "#f87171"
                            : "#64748b",
                        }}
                      />
                      <span className="text-[11px] text-slate-400 leading-relaxed">
                        <span className="font-semibold text-slate-300">{b.label}:</span>{" "}
                        {b.sentence}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Mini fee strip */}
                <div
                  className="flex items-center gap-4 rounded-xl px-4 py-3 mb-5"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.055)",
                  }}
                >
                  {[
                    { label: "Move",      value: `${relatedRec.amount.toFixed(2)} τ` },
                    { label: "Fee",       value: `${relatedRec.fees.total.toFixed(5)} τ` },
                    { label: "Breakeven", value: `${relatedRec.breakeven}d` },
                    { label: "Confidence",value: `${relatedRec.confidence}%` },
                  ].map(({ label, value }, i, arr) => (
                    <div key={label} className={cn("flex-1", i < arr.length - 1 && "border-r border-white/[0.06] pr-4")}>
                      <div className="text-[9.5px] text-slate-600 uppercase tracking-wider mb-0.5">{label}</div>
                      <div className="text-[13px] font-bold text-white tabular-nums" style={{ letterSpacing: "-0.02em" }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                <Link href="/recommendations">
                  <button
                    className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-[13px] py-2.5 transition-all duration-200"
                    style={{
                      background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                      color: "#04060d",
                      boxShadow: "0 0 0 1px rgba(34,211,238,0.35), 0 4px 14px rgba(34,211,238,0.18), inset 0 1px 0 rgba(255,255,255,0.2)",
                    }}
                  >
                    <Zap className="w-4 h-4" />
                    Review Full Recommendation
                  </button>
                </Link>
              </div>
            ) : (
              <div
                className="rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center gap-3"
                style={{
                  background: "rgba(255,255,255,0.018)",
                  border: "1px solid rgba(255,255,255,0.065)",
                  minHeight: "220px",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <Activity className="w-5 h-5" style={{ color: "#334155" }} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-500 mb-1">No active recommendation</p>
                  <p className="text-[11px] text-slate-600">
                    The engine hasn't flagged SN{subnet.netuid} in the current scoring window.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-700 mt-1">
                  <Clock className="w-3 h-3" />
                  Live scoring coming soon
                </div>
              </div>
            )}
          </div>

          {/* Trust card */}
          <div className="col-span-12 lg:col-span-5">
            <div
              className="rounded-2xl p-6 h-full"
              style={{
                background: "rgba(255,255,255,0.018)",
                border: "1px solid rgba(255,255,255,0.065)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.24)",
              }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(52,211,153,0.1)",
                    border: "1px solid rgba(52,211,153,0.2)",
                  }}
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span
                  className="font-bold text-slate-300 uppercase"
                  style={{ fontSize: "10px", letterSpacing: "0.1em" }}
                >
                  Protection Active
                </span>
              </div>

              <div className="space-y-3 mb-5">
                {[
                  { icon: Shield,       text: "You approve every move.",      sub: "No silent execution. Ever." },
                  { icon: Lock,         text: "No seed phrase storage.",       sub: "We can't access your keys." },
                  { icon: Eye,          text: "Full transaction transparency.", sub: "See exactly what you're signing." },
                  { icon: CheckCircle,  text: "Non-custodial, end-to-end.",    sub: "Wallet remains yours." },
                ].map(({ icon: Icon, text, sub }) => (
                  <div key={text} className="flex items-start gap-3">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: "rgba(52,211,153,0.08)",
                        border: "1px solid rgba(52,211,153,0.16)",
                      }}
                    >
                      <Icon className="w-3 h-3 text-emerald-400" />
                    </div>
                    <div>
                      <p
                        className="font-semibold text-white"
                        style={{ fontSize: "12px", letterSpacing: "-0.01em" }}
                      >
                        {text}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Risk notice — now powered by detectRiskFlags */}
              {(() => {
                const sideFlags = detectRiskFlags(subnet);
                if (sideFlags.length === 0 && (subnet.risk === "HIGH" || subnet.risk === "SPECULATIVE")) {
                  // Fallback for HIGH/SPECULATIVE subnets that don't trip specific flags
                  return (
                    <div
                      className="flex items-start gap-2.5 p-3 rounded-xl"
                      style={{
                        background: "rgba(251,191,36,0.06)",
                        border: "1px solid rgba(251,191,36,0.16)",
                      }}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-200/60 leading-relaxed">
                        {subnet.risk === "SPECULATIVE"
                          ? "This subnet is rated Speculative. Thin liquidity and high concentration. Only allocate what you can afford to lose."
                          : "This subnet carries elevated risk. Yields are volatile and liquidity is below average."}
                      </p>
                    </div>
                  );
                }
                if (sideFlags.length > 0) {
                  return (
                    <div
                      className="flex items-start gap-2.5 p-3 rounded-xl"
                      style={{
                        background: sideFlags[0].severity === "warning" ? "rgba(239,68,68,0.06)" : "rgba(251,191,36,0.06)",
                        border: `1px solid ${sideFlags[0].severity === "warning" ? "rgba(239,68,68,0.16)" : "rgba(251,191,36,0.16)"}`,
                      }}
                    >
                      <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${sideFlags[0].severity === "warning" ? "text-red-400" : "text-amber-400"}`} />
                      <p className={`text-[11px] leading-relaxed ${sideFlags[0].severity === "warning" ? "text-red-200/60" : "text-amber-200/60"}`}>
                        {sideFlags.length} risk {sideFlags.length === 1 ? "factor" : "factors"} detected. Review the risk banner above before allocating.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              <p className="text-[10px] text-slate-700 leading-relaxed mt-4">
                Subnet data is sourced from on-chain records and is not financial advice.
                Yields change continuously based on emission schedules and staker activity.
              </p>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
