"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw, Wallet, TrendingUp, Activity, Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { SectionTitle } from "@/components/ui-custom/section-title";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { MomentumBarChart } from "@/components/charts/momentum-bar-chart";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { AllocationBarList } from "@/components/charts/allocation-bar-list";
import { getPortfolio, getPortfolioActivity, getPortfolioHistory, fetchPortfolioHistory } from "@/lib/api/portfolio";
import { getRecommendations } from "@/lib/api/recommendations";
import { cn, subnetGradient, formatDate } from "@/lib/utils";
import { useWallet } from "@/lib/wallet-context";

export default function DashboardPage() {
  const router = useRouter();
  const { walletState, address, openModal } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [dashPeriod, setDashPeriod] = useState<"7d" | "14d" | "30d" | "90d">("14d");

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    window.location.reload();
  }, []);

  const isConnected = walletState !== "disconnected";

  const portfolio = isConnected ? getPortfolio() : null;
  const placeholderHistory = isConnected ? getPortfolioHistory() : null;
  const [history, setHistory] = useState(placeholderHistory);

  // Replace the placeholder with real snapshots from /api/portfolio/history
  // once the wallet address is known. Any transient failure keeps the
  // placeholder so the dashboard never goes blank.
  useEffect(() => {
    if (!address) {
      setHistory(null);
      return;
    }
    let cancelled = false;
    fetchPortfolioHistory(address, dashPeriod).then((real) => {
      if (cancelled) return;
      if (real && real.value.length > 0) setHistory(real);
    });
    return () => {
      cancelled = true;
    };
  }, [address, dashPeriod]);
  const recentChanges = isConnected ? getPortfolioActivity() : [];
  const recommendations = isConnected ? getRecommendations() : [];

  const portfolioStats = portfolio?.stats ?? null;
  const allocations = portfolio?.allocations ?? [];
  const portfolioChartData = history?.value ?? [];
  const yieldChartData = history?.yield ?? [];
  const topRec = recommendations[1] ?? recommendations[0] ?? null;
  const topRecBand = topRec?.band ?? "STRONG";

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <PageHeader title="Dashboard" subtitle="Your Bittensor portfolio at a glance">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleRefresh} className="btn-ghost gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </PageHeader>

      <FadeIn delay={0.03}>
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div
            className="relative overflow-hidden rounded-[28px] border border-white/8 p-6 md:p-7"
            style={{
              background:
                "linear-gradient(160deg, rgba(34,211,238,0.08) 0%, rgba(79,124,255,0.045) 28%, rgba(255,255,255,0.018) 62%, rgba(255,255,255,0.012) 100%)",
              boxShadow:
                "0 24px 80px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 40px rgba(34,211,238,0.04)",
            }}
          >
            <div className="absolute right-0 top-0 h-40 w-56 pointer-events-none" style={{ background: "radial-gradient(circle at top right, rgba(34,211,238,0.16), transparent 68%)" }} />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                <TrendingUp className="h-3 w-3" />
                Your TAO, at a glance
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white md:text-[40px]">
                Check in before you
                <span className="block bg-[linear-gradient(135deg,#67e8f9_0%,#4f7cff_55%,#8b5cf6_100%)] bg-clip-text text-transparent">
                  move capital.
                </span>
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-[15px]">
                Current value, weighted yield, and recent stake activity — the headline numbers you want to see first each morning before deciding whether to rebalance.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {[
                  { label: "Wallet", value: isConnected && portfolioStats ? "Connected" : "Not connected", note: isConnected ? "Your holdings are loaded below" : "Connect read-only to see your own book", tone: isConnected ? "text-cyan-300" : "text-amber-300" },
                  { label: "What you'll see", value: "Value + yield + flows", note: "Trend, staked total, and recent changes", tone: "text-white" },
                  { label: "Who decides", value: "You do", note: "Tyvera never signs a transaction for you", tone: "text-emerald-300" },
                ].map((card) => (
                  <div key={card.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</div>
                    <div className={cn("mt-2 text-base font-semibold tracking-tight", card.tone)}>{card.value}</div>
                    <div className="mt-1 text-xs text-slate-500">{card.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              {
                label: "Portfolio",
                title: "Value, staked total, and realized yield.",
                detail: "The chart answers the one question you care about first: what is your TAO exposure doing over the last week, two weeks, or month?",
              },
              {
                label: "Context",
                title: "Subnet momentum alongside your positions.",
                detail: "Network-wide yield and flow trends sit next to your holdings so you can tell when an opportunity is broad-based vs. concentrated.",
              },
              {
                label: "Suggested moves",
                title: "Recommendations tied to your actual book.",
                detail: "When a subnet in your portfolio drifts or a better one appears, the dashboard surfaces a concrete suggestion — not generic market commentary.",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 shadow-[0_14px_50px_rgba(0,0,0,0.24)]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                <div className="mt-3 text-lg font-semibold tracking-tight text-white">{item.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        {isConnected && portfolioStats ? (
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-12 lg:col-span-8 xl:col-span-9">
              <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.034),rgba(255,255,255,0.013))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Portfolio value</div>
                    <div className="mt-1 text-sm tracking-tight text-slate-300">How your holdings have trended over the selected window</div>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-xl border border-white/8 bg-white/[0.03] p-1">
                    {(["7d", "14d", "30d"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setDashPeriod(p)}
                        className="rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all duration-150"
                        style={{
                          color: p === dashPeriod ? "#a5f3fc" : "var(--aurora-sub)",
                          background: p === dashPeriod ? "rgba(34,211,238,0.1)" : "transparent",
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6 grid gap-3 md:grid-cols-[1.05fr_0.95fr]">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current value</div>
                    <div className="mt-2 text-[34px] font-bold leading-none tracking-[-0.03em] text-white tabular-nums">
                      ${portfolioStats.totalValueUsd.toLocaleString()}
                    </div>
                    <div className="mt-2 text-sm text-slate-500">Your total TAO and subnet stake, valued at today&rsquo;s price.</div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
                    {[
                      { label: "Total Staked", value: `${portfolioStats.totalStakedTao.toFixed(2)} τ` },
                      { label: "Weighted Yield", value: `${portfolioStats.weightedYield.toFixed(1)}%` },
                      { label: "7-Day Earnings", value: `${portfolioStats.earnings7d.toFixed(4)} τ` },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-4">
                        <div className="text-[9.5px] font-semibold uppercase tracking-widest text-slate-600">{stat.label}</div>
                        <div className="mt-2 text-lg font-bold leading-none tracking-[-0.02em] text-slate-200 tabular-nums">{stat.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <SimpleLineChart data={portfolioChartData} color="#5B4BC9" height={190} showGrid prefix="$" gradientId="portfolioGrad" />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-4">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.022] p-5 shadow-[0_16px_56px_rgba(0,0,0,0.26)]">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  <Activity className="h-3.5 w-3.5" />
                  How to read this
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    "Total value is the headline number — watch it day over day.",
                    "Weighted yield shows your blended APR across every subnet you\u2019re staked into.",
                    "Recent earnings tell you what the book has actually paid in TAO this week.",
                  ].map((line) => (
                    <div key={line} className="rounded-xl border border-white/6 bg-black/20 px-4 py-3 text-sm leading-relaxed text-slate-400">{line}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(160deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
            <div className="flex flex-col items-center py-10 text-center">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{
                  background: "rgba(34,211,238,0.07)",
                  border: "1px solid rgba(34,211,238,0.16)",
                }}
              >
                <Wallet className="h-6 w-6" style={{ color: "#5B4BC9" }} />
              </div>
              <p className="mb-1.5 text-[15px] font-semibold tracking-tight text-slate-300">Connect a wallet to view your portfolio</p>
              <p className="mb-6 max-w-md text-sm leading-relaxed text-slate-500">
                Portfolio value, staked TAO, yield, and recent activity appear here once a wallet is connected. Until then, the dashboard remains intentionally restrained.
              </p>
              <button
                onClick={openModal}
                className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200"
                style={{
                  background: "rgba(34,211,238,0.08)",
                  border: "1px solid rgba(34,211,238,0.2)",
                  color: "#5B4BC9",
                }}
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </button>
            </div>
          </div>
        )}
      </FadeIn>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FadeIn delay={0.1}>
          <GlassCard padding="lg">
            <div className="mb-5">
              <SectionTitle label="Yield comparison" title="Subnet Momentum" subtitle="Current yield vs 7-day trend">
                <span className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2 py-1 text-[9.5px] font-medium uppercase tracking-wider text-slate-600">
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
              <SectionTitle label="Portfolio APR" title="Weighted Yield" subtitle="14-day rolling average" />
            </div>
            {isConnected && yieldChartData.length > 0 ? (
              <SimpleLineChart data={yieldChartData} color="#8b5cf6" height={110} suffix="%" gradientId="yieldGrad" />
            ) : (
              <div className="flex items-center justify-center rounded-xl" style={{ height: 110, background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="text-[11px] text-slate-700">{isConnected ? "No yield history" : "Connect wallet to view"}</span>
              </div>
            )}
          </GlassCard>
        </FadeIn>
      </div>

      {isConnected && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <FadeIn delay={0.15}>
            <GlassCard padding="lg">
              <div className="mb-4">
                <SectionTitle label="Current positions" title="Allocation" />
              </div>
              <AllocationBarList allocations={allocations} />
            </GlassCard>
          </FadeIn>

          {topRec && (
            <FadeIn delay={0.18}>
              <div
                className="rounded-[24px] p-5"
                style={{
                  background: "rgba(34,211,238,0.04)",
                  border: "1px solid rgba(34,211,238,0.28)",
                  boxShadow: "0 0 0 1px rgba(34,211,238,0.1), 0 0 32px rgba(34,211,238,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[9.5px] font-bold uppercase text-cyan-300" style={{ letterSpacing: "0.1em" }}>
                    Top Recommendation
                  </span>
                  <span className="tag-cyan">{topRecBand}</span>
                </div>

                <div className="mb-4 flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white",
                      `bg-gradient-to-br ${subnetGradient(topRec.fromSubnet.netuid)}`,
                    )}
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
                  >
                    {topRec.fromSubnet.netuid}
                  </div>
                  <div className="flex flex-1 justify-center">
                    <ArrowRight className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white",
                      `bg-gradient-to-br ${subnetGradient(topRec.toSubnet.netuid)}`,
                    )}
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
                  >
                    {topRec.toSubnet.netuid}
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-[18px] font-bold tracking-[-0.02em] text-emerald-400 tabular-nums">+{topRec.projectedEdge.toFixed(1)}%</div>
                    <div className="text-[10px] text-slate-600">projected edge</div>
                  </div>
                </div>

                <p className="mb-4 text-[11px] leading-relaxed text-slate-500">{topRec.rationale}</p>

                <button
                  onClick={() => router.push("/recommendations")}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-semibold text-cyan-400 transition-all duration-150 hover:bg-cyan-400/10"
                  style={{ background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.15)" }}
                >
                  View Analysis <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </FadeIn>
          )}

          <FadeIn delay={0.2}>
            <GlassCard padding="lg">
              <div className="mb-4">
                <SectionTitle label="Recent changes" title="Activity" />
              </div>
              <div className="space-y-2.5">
                {recentChanges.map((change, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-white/[0.04] py-2 last:border-0">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: change.status === "CONFIRMED" ? "var(--aurora-up)" : "var(--aurora-sub)" }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] text-slate-300">
                        {change.type === "MOVE" && change.fromSubnet && change.toSubnet
                          ? `${change.fromSubnet} → ${change.toSubnet}`
                          : change.label ?? change.subnet ?? change.type}
                      </div>
                      <div className="text-[10px] text-slate-600">{formatDate(change.timestamp)}</div>
                    </div>
                    <div className="shrink-0 text-[11px] text-slate-400 tabular-nums">{change.amount.toFixed(2)}τ</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </FadeIn>
        </div>
      )}

      <FadeIn>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Check your portfolio",
              detail: "See your current TAO and subnet stake value, recent performance, and a simple read on whether your holdings are trending up or down.",
            },
            {
              title: "Spot what changed",
              detail: "Recent stake changes, subnet moves, and flagged activity surface here first so nothing slips past you between logins.",
            },
            {
              title: isConnected ? "Next step" : "Connect to personalize",
              detail: isConnected ? "Head to Recommendations or Subnets when you want to move capital — the dashboard flags when there's something worth reviewing." : "Connect a Polkadot.js, Talisman, or SubWallet account to see your own holdings. Read-only — Tyvera never requests signing permissions.",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-2xl border border-white/8 bg-white/[0.022] p-5">
              <div className="text-sm font-semibold tracking-tight text-white">{card.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.detail}</p>
            </div>
          ))}
        </div>
      </FadeIn>
    </div>
  );
}
