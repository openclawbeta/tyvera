"use client";

import { Wallet, TrendingUp, BarChart2, Zap, ArrowRight, Activity, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui-custom/stat-card";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { SectionTitle } from "@/components/ui-custom/section-title";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { MomentumBarChart } from "@/components/charts/momentum-bar-chart";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
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

      {/* ââ Header ââ */}
      <div className="flex items-center justify-between">
        <PageHeader
          title="Dashboard"
          subtitle="Your Bittensor portfolio at a glance"
        />
        <div className="flex items-center gap-3">
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

      {/* ââ Stat Cards ââ */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Staked"
          value={`${portfolioStats.totalStakedTao.toFixed(2)} Ï`}
          change={2.4}
          changeLabel="vs last week"
          icon={<Wallet className="w-4 h-4" />}
          accent="cyan"
          index={0}
        />
        <StatCard
          label="Portfolio Value"
          value={`$${portfolioStats.totalValueUsd.toLocaleString()}`}
          change={1.8}
          changeLabel="vs last week"
          icon={<BarChart2 className="w-4 h-4" />}
          accent="violet"
          index={1}
        />
        <StatCard
          label="Weighted Yield"
          value={`${portfolioStats.weightedYield.toFixed(1)}%`}
          change={0.6}
          changeLabel="vs last month"
          icon={<TrendingUp className="w-4 h-4" />}
          accent="emerald"
          index={2}
        />
        <StatCard
          label="7-Day Earnings"
          value={`${portfolioStats.earnings7d.toFixed(4)} Ï`}
          change={4.2}
          changeLabel="vs prior week"
          icon={<Zap className="w-4 h-4" />}
          accent="amber"
          index={3}
        />
      </div>

      {/* ââ Main Grid ââ */}
      <div className="grid grid-cols-12 gap-5">

        {/* Left â Charts (8 cols) */}
        <div className="col-span-12 lg:col-span-8 space-y-5">

          {/* Portfolio value */}
          <FadeIn delay={0.1}>
            <GlassCard padding="lg">
              <div className="flex items-center justify-between mb-5">
                <SectionTitle
                  label="14-day history"
                  title="Portfolio Value"
                />
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
          </FadeIn>

          {/* Subnet momentum */}
          <FadeIn delay={0.15}>
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

          {/* Weighted yield */}
          <FadeIn delay={0.2}>
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

        {/* Right â Side panels (4 cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-5">

          {/* Allocation */}
          <FadeIn delay={0.12}>
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
                {/* Label */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="font-bold text-cyan-300 uppercase"
                    style={{ fontSize: "9.5px", letterSpacing: "0.1em" }}
                  >
                    Top Recommendation
                  </span>
                  <span className="tag-cyan">{topRecBand}</span>
                </div>

                {/* Move arrow */}
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

                <p className="text-[11px] text-slate-500 leading-relaxed mb-4 line-clamp-2">
                  {topRec.rationale}
                </p>

                <button
                  className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-xs py-2.5 transition-all duration-200"
                  style={{
                    background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                    color: "#04060d",
                    boxShadow: "0 0 0 1px rgba(34,211,238,0.35), 0 4px 14px rgba(34,211,238,0.18), inset 0 1px 0 rgba(255,255,255,0.2)",
                  }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Review in Wallet
                </button>
              </div>
            </FadeIn>
          )}

          {/* Recent Activity */}
          <FadeIn delay={0.22}>
            <GlassCard padding="lg">
              <div className="mb-4">
                <SectionTitle label="Transaction log" title="Recent Activity" />
              </div>
              <div className="space-y-0.5">
                {recentChanges.map((change) => (
                  <div
                    key={change.id}
                    className="flex items-start gap-3 py-2.5"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                      )}
                      style={{
                        background: change.type === "MOVE" ? "rgba(34,211,238,0.1)" : "rgba(52,211,153,0.1)",
                        border: change.type === "MOVE" ? "1px solid rgba(34,211,238,0.18)" : "1px solid rgba(52,211,153,0.18)",
                      }}
                    >
                      <Activity
                        className="w-3.5 h-3.5"
                        style={{ color: change.type === "MOVE" ? "#22d3ee" : "#34d399" }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-white truncate" style={{ letterSpacing: "-0.01em" }}>
                        {change.type === "MOVE"
                          ? `${change.fromSubnet} â ${change.toSubnet}`
                          : `Added to ${change.subnet}`}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-0.5 tabular-nums">
                        {change.amount.toFixed(2)} Ï Â· {formatDate(change.timestamp)}
                      </p>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold flex-shrink-0 mt-0.5">
                      {change.status}
                    </span>
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
