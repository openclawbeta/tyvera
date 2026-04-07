"use client";

import { useState, useCallback } from "react";
import { Wallet, TrendingUp, BarChart2, Zap, Download, RefreshCw, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { StatCard } from "@/components/ui-custom/stat-card";
import { SectionTitle } from "@/components/ui-custom/section-title";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { AllocationChartCard } from "@/components/portfolio/allocation-chart-card";
import { HoldingsList } from "@/components/portfolio/holdings-list";
import { WatchlistCard } from "@/components/portfolio/watchlist-card";
import { ReallocationSimulator } from "@/components/portfolio/reallocation-simulator";
import { AlertsPanel } from "@/components/portfolio/alerts-panel";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { FeatureGate } from "@/components/entitlement/feature-gate";
import { getPortfolio, getPortfolioActivity, getPortfolioHistory, getWatchlist } from "@/lib/api/portfolio";
import { getRecommendations } from "@/lib/api/recommendations";
import { getSubnets } from "@/lib/api/subnets";
import { useWallet } from "@/lib/wallet-context";
import { cn, subnetGradient, formatDate } from "@/lib/utils";

export default function PortfolioPage() {
  const { walletState } = useWallet();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    window.location.reload();
  }, []);

  // Always load data so premium previews render even when disconnected
  const portfolio = getPortfolio();
  const history = getPortfolioHistory();
  const recentChanges = getPortfolioActivity();
  const watchlist = getWatchlist();
  const recommendations = getRecommendations();
  const allSubnets = getSubnets();

  const { stats: portfolioStats, allocations } = portfolio;
  const earningsData = Array.from({ length: 30 }, (_, i) => ({
    label: `d${i + 1}`,
    value: parseFloat((0.004 + Math.sin(i * 0.3) * 0.001 + i * 0.0001).toFixed(5)),
  }));
  const topRec = recommendations[1] ?? recommendations[0];

  const isDisconnected = walletState === "disconnected";

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Portfolio"
        subtitle="Your staked TAO positions and performance"
      >
        {!isDisconnected && (
          <>
            <button className="btn-ghost text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button onClick={handleRefresh} className="btn-ghost text-xs gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </>
        )}
      </PageHeader>

      {/* Connect wallet prompt when disconnected */}
      {isDisconnected && (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.018)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: "rgba(34,211,238,0.08)",
              border: "1px solid rgba(34,211,238,0.18)",
            }}
          >
            <Wallet className="w-5 h-5" style={{ color: "#22d3ee" }} />
          </div>
          <p className="text-[15px] font-semibold text-white mb-2" style={{ letterSpacing: "-0.01em" }}>
            No wallet connected
          </p>
          <p className="text-[13px] text-slate-500 text-center max-w-xs leading-relaxed">
            Connect your wallet to see your staked positions, earnings, and allocation.
          </p>
        </div>
      )}

      {/* Full portfolio content when connected */}
      {!isDisconnected && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total Staked"    value={`${portfolioStats.totalStakedTao.toFixed(2)} τ`}   change={2.4}  accent="cyan"    icon={<Wallet className="w-4 h-4" />}    index={0} />
            <StatCard label="Weighted Yield"  value={`${portfolioStats.weightedYield.toFixed(1)}%`}      change={0.6}  accent="emerald" icon={<TrendingUp className="w-4 h-4" />} index={1} />
            <StatCard label="30-Day Earnings" value={`${portfolioStats.earnings30d.toFixed(4)} τ`}       change={8.2}  accent="violet"  icon={<Zap className="w-4 h-4" />}       index={2} />
            <StatCard label="Diversification" value={`${portfolioStats.diversificationScore}/100`}       change={0}    accent="amber"   icon={<BarChart2 className="w-4 h-4" />}  index={3} />
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-12 gap-4">

            {/* Left — allocation + holdings */}
            <div className="col-span-12 lg:col-span-8 space-y-4">

              {/* Allocation chart */}
              <FadeIn delay={0.1}>
                <GlassCard>
                  <SectionTitle title="Allocation Breakdown" subtitle="Current stake distribution" />
                  <AllocationChartCard allocations={allocations} />
                </GlassCard>
              </FadeIn>

              {/* Holdings table */}
              <FadeIn delay={0.15}>
                <GlassCard>
                  <SectionTitle title="Holdings" subtitle={`${allocations.length} active positions`}>
                    <button className="btn-ghost text-xs">View all</button>
                  </SectionTitle>
                  <HoldingsList allocations={allocations} />
                </GlassCard>
              </FadeIn>

              {/* Daily earnings chart */}
              <FadeIn delay={0.2}>
                <GlassCard>
                  <SectionTitle title="Daily Earnings" subtitle="τ earned per day (30d)" />
                  <SimpleLineChart
                    data={earningsData}
                    color="#10b981"
                    height={120}
                    suffix=" τ"
                    gradientId="earningsGrad"
                  />
                </GlassCard>
              </FadeIn>

              {/* Recent changes */}
              <FadeIn delay={0.22}>
                <GlassCard>
                  <SectionTitle title="Transaction History" subtitle="Stake moves and additions" />
                  <div className="space-y-0">
                    {recentChanges.map((c) => (
                      <div key={c.id} className="flex items-center gap-4 py-3.5 border-b border-white/[0.04] last:border-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
                          c.type === "MOVE" ? "bg-gradient-to-br from-cyan-500 to-sky-700" : "bg-gradient-to-br from-emerald-500 to-teal-700",
                        )}>
                          {c.type === "MOVE" ? "→" : "+"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">
                            {c.type === "MOVE" ? `${c.fromSubnet} → ${c.toSubnet}` : `Staked to ${c.subnet}`}
                          </p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">tx: {c.txHash ? `${c.txHash.slice(0, 20)}…` : "—"}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-white">{c.amount.toFixed(2)} τ</p>
                          <p className="text-xs text-slate-500">{formatDate(c.timestamp)}</p>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-md flex-shrink-0">
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </FadeIn>
            </div>

            {/* Right sidebar */}
            <div className="col-span-12 lg:col-span-4 space-y-4">

              {/* Portfolio stats summary */}
              <FadeIn delay={0.12}>
                <GlassCard>
                  <SectionTitle title="Summary" />
                  <div className="space-y-3">
                    {[
                      { label: "Total positions",    value: `${allocations.length} subnets`                  },
                      { label: "Top position",        value: portfolioStats.topSubnet                        },
                      { label: "Est. monthly yield",  value: `${portfolioStats.earnings30d.toFixed(4)} τ`    },
                      { label: "Portfolio value",     value: `$${portfolioStats.totalValueUsd.toLocaleString()}` },
                      { label: "Avg validator take",  value: "15.5%"                                          },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                        <span className="text-xs text-slate-500">{label}</span>
                        <span className="text-xs font-semibold text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </FadeIn>

              {/* Watchlist */}
              <FadeIn delay={0.16}>
                <GlassCard>
                  <SectionTitle title="Watchlist" subtitle="Subnets you're tracking">
                    <div className="flex items-center gap-2">
                      <button className="btn-ghost text-xs">Compare</button>
                      <button className="btn-ghost text-xs">Edit</button>
                    </div>
                  </SectionTitle>
                  <WatchlistCard items={watchlist} />
                </GlassCard>
              </FadeIn>

              {/* Recommended move */}
              {topRec && (
                <FadeIn delay={0.2}>
                  <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.04] p-5">
                    <p className="text-[10px] font-semibold text-cyan-300 uppercase tracking-wider mb-3">Suggested Move</p>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white", `bg-gradient-to-br ${subnetGradient(topRec.fromSubnet.netuid)}`)}>
                        {topRec.fromSubnet.netuid}
                      </div>
                      <ArrowRight className="w-3 h-3 text-cyan-400" />
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white", `bg-gradient-to-br ${subnetGradient(topRec.toSubnet.netuid)}`)}>
                        {topRec.toSubnet.netuid}
                      </div>
                      <div className="ml-auto">
                        <span className="text-sm font-bold text-emerald-400">+{topRec.projectedEdge.toFixed(1)}%</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3 line-clamp-2">{topRec.rationale}</p>
                    <button className="w-full btn-primary justify-center text-xs py-2">
                      <Zap className="w-3.5 h-3.5" />
                      Review Move
                    </button>
                  </div>
                </FadeIn>
              )}
            </div>
          </div>
        </>
      )}

      {/* Premium feature previews — always visible (blurred + locked when not entitled) */}
      <FadeIn delay={isDisconnected ? 0.1 : 0.3}>
        <FeatureGate feature="reallocation">
          <ReallocationSimulator
            allocations={allocations}
            subnets={allSubnets}
            totalStakedTao={portfolioStats.totalStakedTao}
          />
        </FeatureGate>
      </FadeIn>

      <FadeIn delay={isDisconnected ? 0.15 : 0.35}>
        <FeatureGate feature="alerts">
          <AlertsPanel subnets={allSubnets} />
        </FeatureGate>
      </FadeIn>
    </div>
  );
}
