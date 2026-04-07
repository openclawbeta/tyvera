"use client";

import { ArrowRight, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { SectionTitle } from "@/components/ui-custom/section-title";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { MomentumBarChart } from "@/components/charts/momentum-bar-chart";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { PriceHistoryChart } from "@/components/charts/price-history-chart";
import { AllocationBarList } from "@/components/charts/allocation-bar-list";
import { getPortfolio, getPortfolioActivity, getPortfolioHistory } from "@/lib/api/portfolio";
import { getRecommendations } from "@/lib/api/recommendations";
import { cn, subnetGradient, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const portfolio = getPortfolio();
  const history = getPortfolioHistory();
  const recentChanges = getPortfolioActivity();
  const recommendations = getRecommendations();

  const { stats: portfolioStats, allocations } = portfolio;
  const portfolioChartData = history.value;
  const yieldChartData = history.yield;
  const topRec = recommendations[1] ?? recommendations[0];
  const topRecBand = topRec?.band ?? "STRONG";

  return (
    <div className="max-w-[1400px] mx-auto space-y-7">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Dashboard"
          subtitle="Your Bittensor portfolio at a glance"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-ghost gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
            <span
              className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse-dot"
              style={{ boxShadow: "0 0 4px rgba(52,211,153,0.6)" }}
            />
            Live
          </div>
        </div>
      </div>

      {/* ── Primary metric zone ── */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-12 gap-5">

          {/* Portfolio Value + chart — dominant */}
          <div className="col-span-12 lg:col-span-9">
            <GlassCard padding="lg">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    Portfolio Value
                  </div>
                  <div
                    className="font-bold text-slate-100 tabular-nums leading-none mb-1.5"
                    style={{ fontSize: "30px", letterSpacing: "-0.025em" }}
                  >
                    ${portfolioStats.totalValueUsd.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-emerald-400">+1.8%</span>
                    <span className="text-[10px] text-slate-600">vs last week</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {["7d", "14d", "30d"].map((p) => (
                    <button
                      key={p}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150"
                      style={{
                        color: p === "14d" ? "#22d3ee" : "#475569",
                        background: p === "14d" ? "rgba(34,211,238,0.08)" : "transparent",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <SimpleLineChart
                data={portfolioChartData}
                color="#22d3ee"
                height={180}
                showGrid
                prefix="$"
                gradientId="portfolioGrad"
              />
            </GlassCard>
          </div>

          {/* Secondary stats — quiet */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
            {[
              {
                label: "Total Staked",
                value: `${portfolioStats.totalStakedTao.toFixed(2)} τ`,
                change: "+2.4%",
                note: "vs last week",
              },
              {
                label: "Weighted Yield",
                value: `${portfolioStats.weightedYield.toFixed(1)}%`,
                change: "+0.6%",
                note: "vs last month",
              },
              {
                label: "7-Day Earnings",
                value: `${portfolioStats.earnings7d.toFixed(4)} τ`,
                change: "+4.2%",
                note: "vs prior week",
              },
            ].map((stat) => (
              <GlassCard key={stat.label} padding="md">
                <div className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-widest mb-2">
                  {stat.label}
                </div>
                <div
                  className="font-bold text-slate-200 tabular-nums leading-none mb-1.5"
                  style={{ fontSize: "18px", letterSpacing: "-0.02em" }}
                >
                  {stat.value}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-emerald-400">{stat.change}</span>
                  <span className="text-[9.5px] text-slate-600">{stat.note}</span>
                </div>
              </GlassCard>
            ))}
          </div>

        </div>
      </FadeIn>

      {/* ── TAO Price History ── */}
      <FadeIn delay={0.08}>
        <GlassCard padding="lg">
          <div className="mb-5">
            <SectionTitle
              label="Market data"
              title="TAO Price"
              subtitle="Market price history"
            />
          </div>
          <PriceHistoryChart />
        </GlassCard>
      </FadeIn>

      {/* ── Secondary charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <FadeIn delay={0.1}>
          <GlassCard padding="lg">
            <div className="mb-5">
              <SectionTitle
                label="Yield comparison"
                title="Subnet Momentum"
                subtitle="Current yield vs 7-day trend"
              >
                <span
                  className="rounded-lg px-2 py-1 text-[9.5px] font-medium text-slate-600 uppercase tracking-wider"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  Color = trend direction
                </span>
              </SectionTitle>
            </div>
            <MomentumBarChart />
          </GlassCard>
        </FadeIn>

        <FadeIn delay={0.12}>
          <GlassCard padding="lg">
            <div className="mb-5">
              <SectionTitle
                label="Portfolio APR"
                title="Weighted Yield"
                subtitle="14-day rolling average"
              />
            </div>
            <SimpleLineChart
              data={yieldChartData}
              color="#8b5cf6"
              height={110}
              suffix="%"
              gradientId="yieldGrad"
            />
          </GlassCard>
        </FadeIn>

      </div>

      {/* ── Operational row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Allocation */}
        <FadeIn delay={0.15}>
          <GlassCard padding="lg">
            <div className="mb-4">
              <SectionTitle label="Current positions" title="Allocation" />
            </div>
            <AllocationBarList allocations={allocations} />
          </GlassCard>
        </FadeIn>

        {/* Top recommendation */}
        {topRec && (
          <FadeIn delay={0.18}>
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(34,211,238,0.04)",
                border: "1px solid rgba(34,211,238,0.28)",
                boxShadow: "0 0 0 1px rgba(34,211,238,0.1), 0 0 32px rgba(34,211,238,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className="font-bold text-cyan-300 uppercase"
                  style={{ fontSize: "9.5px", letterSpacing: "0.1em" }}
                >
                  Top Recommendation
                </span>
                <span className="tag-cyan">{topRecBand}</span>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white",
                    `bg-gradient-to-br ${subnetGradient(topRec.fromSubnet.netuid)}`,
                  )}
                  style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
                >
                  {topRec.fromSubnet.netuid}
                </div>
                <div className="flex-1 flex justify-center">
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                </div>
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white",
                    `bg-gradient-to-br ${subnetGradient(topRec.toSubnet.netuid)}`,
                  )}
                  style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
                >
                  {topRec.toSubnet.netuid}
                </div>
                <div className="ml-auto text-right">
                  <div
                    className="font-bold text-emerald-400 tabular-nums"
                    style={{ fontSize: "18px", letterSpacing: "-0.02em" }}
                  >
                    +{topRec.projectedEdge.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-600">projected edge</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                {topRec.rationale}
              </p>

              <button
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold text-cyan-400 transition-all duration-150"
                style={{
                  background: "rgba(34,211,238,0.06)",
                  border: "1px solid rgba(34,211,238,0.15)",
                }}
              >
                View Analysis <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </FadeIn>
        )}

        {/* Recent Activity */}
        <FadeIn delay={0.2}>
          <GlassCard padding="lg">
            <div className="mb-4">
              <SectionTitle label="Recent changes" title="Activity" />
            </div>
            <div className="space-y-2.5">
              {recentChanges.map((change, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      background: change.status === "CONFIRMED" ? "#34d399" : "#475569",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-300 truncate">
                      {change.type === "MOVE" && change.fromSubnet && change.toSubnet
                        ? `${change.fromSubnet} → ${change.toSubnet}`
                        : change.label ?? change.subnet ?? change.type}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {formatDate(change.timestamp)}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 tabular-nums flex-shrink-0">
                    {change.amount.toFixed(2)}τ
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </FadeIn>

      </div>

    </div>
  );
}
