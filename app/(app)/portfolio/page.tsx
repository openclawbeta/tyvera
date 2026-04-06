"use client";

import { Download, RefreshCw, ArrowRight, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { SectionTitle } from "@/components/ui-custom/section-title";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { AllocationChartCard } from "@/components/portfolio/allocation-chart-card";
import { HoldingsList } from "@/components/portfolio/holdings-list";
import { WatchlistCard } from "@/components/portfolio/watchlist-card";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { getPortfolio, getPortfolioActivity, getPortfolioHistory, getWatchlist } from "@/lib/api/portfolio";
import { getRecommendations } from "@/lib/api/recommendations";
import { cn, subnetGradient, formatDate } from "@/lib/utils";

export default function PortfolioPage() {
  const portfolio        = getPortfolio();
  const history          = getPortfolioHistory();
  const recentChanges    = getPortfolioActivity();
  const watchlist        = getWatchlist();
  const recommendations  = getRecommendations();

  const { stats: portfolioStats, allocations } = portfolio;
  const topRec = recommendations[1] ?? recommendations[0];

  // Risk posture — factual derivation, no prose
  const topAlloc    = [...allocations].sort((a, b) => b.fraction - a.fraction)[0];
  const diversScore = portfolioStats.diversificationScore;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Portfolio"
        subtitle="Your staked TAO positions and performance"
      >
        <button className="btn-ghost text-xs gap-1.5">
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
        <button className="btn-ghost text-xs gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </PageHeader>

      {/* ── Metric strip ───────────────────────────────────────────── */}
      <FadeIn>
        <GlassCard>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/[0.05]">
            {[
              {
                label: "Total staked",
                value: `${portfolioStats.totalStakedTao.toFixed(2)} τ`,
                delta: "+2.4% 30d",
              },
              {
                label: "Weighted yield",
                value: `${portfolioStats.weightedYield.toFixed(1)}%`,
                delta: "+0.6pp 30d",
              },
              {
                label: "30-day earnings",
                value: `${portfolioStats.earnings30d.toFixed(4)} τ`,
                delta: "+8.2% 30d",
              },
              {
                label: "Portfolio value",
                value: `$${portfolioStats.totalValueUsd.toLocaleString()}`,
                delta: null,
              },
            ].map(({ label, value, delta }) => (
              <div
                key={label}
                className="px-5 py-4 first:pl-0 last:pr-0"
              >
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-2">
                  {label}
                </p>
                <p className="text-[20px] font-bold text-white tracking-tight leading-none">
                  {value}
                </p>
                {delta && (
                  <p className="text-[10px] text-emerald-400 font-medium mt-1.5">{delta}</p>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      </FadeIn>

      {/* ── Main zone ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5">

        {/* Allocation + value trend */}
        <div className="col-span-12 lg:col-span-8 space-y-5">

          <FadeIn delay={0.05}>
            <GlassCard>
              <SectionTitle
                title="Allocation"
                subtitle={`${allocations.length} active positions`}
                className="mb-4"
              />
              <AllocationChartCard allocations={allocations} />
            </GlassCard>
          </FadeIn>

          <FadeIn delay={0.1}>
            <GlassCard>
              <SectionTitle title="Portfolio value" subtitle="30-day trend" className="mb-4" />
              <SimpleLineChart
                data={history.value}
                color="#22d3ee"
                height={110}
                prefix="$"
                gradientId="portfolioValueGrad"
              />
            </GlassCard>
          </FadeIn>

        </div>

        {/* Analysis panel */}
        <div className="col-span-12 lg:col-span-4 space-y-5">

          {/* Summary + risk posture */}
          <FadeIn delay={0.08}>
            <GlassCard>
              <SectionTitle title="Summary" className="mb-4" />
              <div className="space-y-0">
                {[
                  { label: "Positions",         value: `${allocations.length} subnets`                              },
                  { label: "Top position",       value: portfolioStats.topSubnet                                     },
                  { label: "Est. monthly yield", value: `${portfolioStats.earnings30d.toFixed(4)} τ`                 },
                  { label: "Avg validator take", value: "15.5%"                                                      },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
                  >
                    <span className="text-[11px] text-slate-500">{label}</span>
                    <span className="text-[12px] font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>

              {/* Risk posture */}
              <div
                className="mt-4 pt-4"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.08em] mb-2.5">
                  Risk posture
                </p>
                <div className="space-y-0">
                  {[
                    {
                      label: "Diversification",
                      value: `${diversScore} / 100`,
                    },
                    {
                      label: "Largest position",
                      value: topAlloc
                        ? `${(topAlloc.fraction * 100).toFixed(1)}% — ${topAlloc.name}`
                        : "—",
                    },
                    {
                      label: "Active subnets",
                      value: `${allocations.length} of 128`,
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
                    >
                      <span className="text-[11px] text-slate-500">{label}</span>
                      <span className="text-[12px] font-semibold text-slate-300">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </FadeIn>

          {/* Suggested move */}
          {topRec && (
            <FadeIn delay={0.14}>
              <div
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(34,211,238,0.03)",
                  border: "1px solid rgba(34,211,238,0.14)",
                }}
              >
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.08em] mb-3">
                  Suggested move
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white",
                      `bg-gradient-to-br ${subnetGradient(topRec.fromSubnet.netuid)}`,
                    )}
                  >
                    {topRec.fromSubnet.netuid}
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white",
                      `bg-gradient-to-br ${subnetGradient(topRec.toSubnet.netuid)}`,
                    )}
                  >
                    {topRec.toSubnet.netuid}
                  </div>
                  <div className="ml-auto flex items-baseline gap-1">
                    <span className="text-[14px] font-bold text-emerald-400">
                      +{topRec.projectedEdge.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-600">edge</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">{topRec.rationale}</p>
                <button className="w-full btn-primary justify-center text-xs py-2">
                  <Zap className="w-3.5 h-3.5" />
                  Review move
                </button>
              </div>
            </FadeIn>
          )}

        </div>
      </div>

      {/* ── Holdings — full width ───────────────────────────────────── */}
      <FadeIn delay={0.12}>
        <GlassCard>
          <SectionTitle title="Holdings" subtitle={`${allocations.length} positions`} className="mb-4">
            <button className="btn-ghost text-xs">View all</button>
          </SectionTitle>
          <HoldingsList allocations={allocations} />
        </GlassCard>
      </FadeIn>

      {/* ── Lower row: watchlist + tx history ──────────────────────── */}
      <div className="grid grid-cols-12 gap-5">

        <div className="col-span-12 lg:col-span-7">
          <FadeIn delay={0.16}>
            <GlassCard>
              <SectionTitle title="Watchlist" subtitle="Subnets you're tracking" className="mb-4">
                <div className="flex items-center gap-2">
                  <button className="btn-ghost text-xs">Compare</button>
                  <button className="btn-ghost text-xs">Edit</button>
                </div>
              </SectionTitle>
              <WatchlistCard items={watchlist} />
            </GlassCard>
          </FadeIn>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <FadeIn delay={0.18}>
            <GlassCard>
              <SectionTitle title="Transaction history" subtitle="Stake moves and additions" className="mb-4" />
              <div className="space-y-0">
                {recentChanges.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0"
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
                        c.type === "MOVE"
                          ? "bg-gradient-to-br from-cyan-500 to-sky-700"
                          : "bg-gradient-to-br from-emerald-500 to-teal-700",
                      )}
                    >
                      {c.type === "MOVE" ? "→" : "+"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-white leading-none">
                        {c.type === "MOVE"
                          ? `${c.fromSubnet} → ${c.toSubnet}`
                          : `Staked to ${c.subnet}`}
                      </p>
                      <p className="text-[10px] text-slate-600 font-mono mt-0.5 truncate">
                        {c.txHash ? `${c.txHash.slice(0, 16)}…` : "—"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[12px] font-semibold text-white">{c.amount.toFixed(2)} τ</p>
                      <p className="text-[10px] text-slate-500">{formatDate(c.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </FadeIn>
        </div>

      </div>
    </div>
  );
}
