"use client";

import { useEffect, useState } from "react";
import { Info, TrendingUp, TrendingDown, ArrowRightLeft, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { DataSourceBadge } from "@/components/ui-custom/data-source-badge";
import type { HolderIntelSnapshot } from "@/lib/types/holders";
import { formatCurrencyValue } from "@/lib/currency";
import { useTaoRate } from "@/lib/hooks/use-tao-rate";

interface RealAttributionResponse {
  snapshot: {
    fetchedAt: string;
    source: string;
    notes?: string;
  };
  summary: {
    available: boolean;
    source: string;
    trackedPositions: number;
    trackedWallets: number;
    notes?: string;
  };
}

interface HolderApiResponse extends HolderIntelSnapshot {
  _meta?: {
    source?: string;
    attribution?: string;
    note?: string;
  };
}

function strategyTone(tag: string): string {
  if (tag === "root-heavy") return "text-cyan-300";
  if (tag === "subnet-heavy") return "text-violet-300";
  if (tag === "rotating") return "text-amber-300";
  return "text-emerald-300";
}

export default function HoldersPage() {
  const [data, setData] = useState<HolderIntelSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [realAttribution, setRealAttribution] = useState<RealAttributionResponse | null>(null);
  const [holderMeta, setHolderMeta] = useState<HolderApiResponse["_meta"] | null>(null);
  const { rate: taoUsdRate } = useTaoRate();

  useEffect(() => {
    Promise.all([
      fetch("/api/holders", { cache: "no-store" }).then((res) => res.json()),
      fetch("/api/holders/real", { cache: "no-store" }).then((res) => res.json()).catch(() => null),
    ])
      .then(([json, real]) => {
        const holderResponse = json as HolderApiResponse;
        setData(holderResponse);
        setHolderMeta(holderResponse._meta ?? null);
        setRealAttribution(real as RealAttributionResponse | null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto space-y-7">
      <PageHeader
        title="Holder Intelligence"
        subtitle="Top 100 wallet cohort tracking across root stake and subnet rotations"
      >
        <div className="flex items-center gap-2">
          <DataSourceBadge source="api" ageSec={null} />
          {data && (
            <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
              holderMeta?.source === "tao-app"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : data.source === "chain-partial"
                ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                : "border-amber-400/20 bg-amber-400/10 text-amber-300"
            }`}>
              {holderMeta?.source === "tao-app" ? "TAO.app" : data.source === "chain-partial" ? "Chain Partial" : "Modeled"}
            </span>
          )}
        </div>
      </PageHeader>

      <FadeIn>
        <div
          className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
          style={{
            background: holderMeta?.source === "tao-app" ? "rgba(16,185,129,0.05)" : "rgba(251,191,36,0.04)",
            border: holderMeta?.source === "tao-app" ? "1px solid rgba(16,185,129,0.14)" : "1px solid rgba(251,191,36,0.12)",
          }}
        >
          <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${holderMeta?.source === "tao-app" ? "text-emerald-300" : "text-amber-300"}`} />
          <div className="text-[12px] text-slate-300">
            {holderMeta?.source === "tao-app" ? (
              <>
                <span className="font-semibold text-emerald-300">TAO.app-backed holder intelligence.</span> This view is using
                external holder concentration and flow analytics as a live provider fallback.
                <div className="mt-2 text-[11px] text-slate-400">Powered by TAO.app API</div>
              </>
            ) : (
              <>
                <span className="font-semibold text-amber-300">Modeled intelligence layer.</span> This first version is a structured
                cohort view for product development: it distinguishes root-vs-subnet posture, dominant allocations, and rotation patterns,
                but it is not yet sourced from live wallet-level chain attribution.
              </>
            )}
          </div>
        </div>
      </FadeIn>

      {realAttribution && (
        <FadeIn delay={0.03}>
          <div
            className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
            style={{
              background: realAttribution.summary.available ? "rgba(34,211,238,0.04)" : "rgba(148,163,184,0.05)",
              border: realAttribution.summary.available ? "1px solid rgba(34,211,238,0.12)" : "1px solid rgba(148,163,184,0.12)",
            }}
          >
            <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${realAttribution.summary.available ? "text-cyan-300" : "text-slate-400"}`} />
            <div className="text-[12px] text-slate-300">
              <span className={`font-semibold ${realAttribution.summary.available ? "text-cyan-300" : "text-slate-300"}`}>
                {realAttribution.summary.available ? "Real attribution available." : "Real attribution scaffold added."}
              </span>{" "}
              {realAttribution.summary.available
                ? `Tracking ${realAttribution.summary.trackedWallets} wallets across ${realAttribution.summary.trackedPositions} positions from chain data.`
                : (realAttribution.summary.notes ?? "Live holder attribution is not yet wired; this endpoint is the honest staging point for real chain-backed ingestion.")}
              <div className="mt-2 text-[10px] text-slate-500">
                Snapshot source: <span className="font-semibold text-slate-300">{realAttribution.snapshot.source}</span>
                {realAttribution.snapshot.fetchedAt ? <> · fetched {new Date(realAttribution.snapshot.fetchedAt).toLocaleString()}</> : null}
              </div>
            </div>
          </div>
        </FadeIn>
      )}

      {loading || !data ? (
        <GlassCard padding="lg">
          <div className="py-16 text-center text-slate-500 text-sm">Loading holder intelligence…</div>
        </GlassCard>
      ) : (
        <>
          <FadeIn delay={0.05}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Tracked TAO", value: formatCurrencyValue(data.summary.totalTrackedTao, "tau", taoUsdRate) },
                { label: "Root Staked", value: `${formatCurrencyValue(data.summary.rootStakedTao, "tau", taoUsdRate)} · ${data.summary.rootSharePct}%` },
                { label: "Subnet Staked", value: `${formatCurrencyValue(data.summary.subnetStakedTao, "tau", taoUsdRate)} · ${data.summary.subnetSharePct}%` },
                { label: "Top Rotation", value: data.summary.topRotations[0] ?? "—" },
              ].map((stat) => (
                <GlassCard key={stat.label} padding="md">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">{stat.label}</div>
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                </GlassCard>
              ))}
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <FadeIn delay={0.08}>
              <GlassCard padding="lg">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-white">Top wallet cohort</h3>
                  <p className="text-[11px] text-slate-600 mt-1">Showing all {data.topHolders.length} tracked wallets</p>
                </div>
                <div className="space-y-3 max-h-[840px] overflow-auto pr-1">
                  {data.topHolders.map((holder) => (
                    <div key={holder.wallet} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/15 flex items-center justify-center text-xs font-bold text-cyan-300">
                          #{holder.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-white">{holder.label}</div>
                              <div className="text-[10px] text-slate-600 font-mono">{holder.wallet}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-white">{formatCurrencyValue(holder.totalTao, "tau", taoUsdRate)}</div>
                              <div className={`text-[10px] font-semibold uppercase tracking-wider ${strategyTone(holder.strategyTag)}`}>
                                {holder.strategyTag}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                            <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2">
                              <div className="text-slate-500 mb-1">Root stake</div>
                              <div className="font-semibold text-slate-200">{formatCurrencyValue(holder.rootStakedTao, "tau", taoUsdRate)}</div>
                            </div>
                            <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2 text-right">
                              <div className="text-slate-500 mb-1">Subnet stake</div>
                              <div className="font-semibold text-slate-200">{formatCurrencyValue(holder.subnetStakedTao, "tau", taoUsdRate)}</div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {holder.allocationMix.slice(0, 4).map((allocation) => (
                              <span key={`${holder.wallet}-${allocation.netuid}`} className="inline-flex items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[10px] text-slate-300">
                                <Wallet className="w-3 h-3" />
                                {allocation.subnetName}: {allocation.percentage}%
                              </span>
                            ))}
                          </div>

                          <div className="mt-3 space-y-1.5">
                            {holder.recentMoves.map((move, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-400">
                                <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
                                <span className="flex-1">{move.summary}</span>
                                <span className="font-mono text-slate-300">{formatCurrencyValue(move.amountTao, "tau", taoUsdRate)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </FadeIn>

            <FadeIn delay={0.1}>
              <GlassCard padding="lg">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-white">Subnet cohort flows</h3>
                  <p className="text-[11px] text-slate-600 mt-1">Where tracked wallets are increasing or decreasing exposure</p>
                </div>
                <div className="space-y-3">
                  {data.subnetFlows.map((flow) => {
                    const positive = flow.netflowTao >= 0;
                    return (
                      <div key={flow.netuid} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{flow.subnetName}</div>
                            <div className="text-[10px] text-slate-600">SN{flow.netuid}</div>
                          </div>
                          <div className={`text-sm font-bold ${positive ? "text-emerald-300" : "text-rose-300"}`}>
                            {positive ? <TrendingUp className="w-4 h-4 inline mr-1" /> : <TrendingDown className="w-4 h-4 inline mr-1" />}
                            {positive ? "+" : ""}{formatCurrencyValue(flow.netflowTao, "tau", taoUsdRate)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                          <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2">
                            <div className="text-slate-500 mb-1">Inflow</div>
                            <div className="font-semibold text-emerald-300">{formatCurrencyValue(flow.inflowTao, "tau", taoUsdRate)}</div>
                          </div>
                          <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2 text-right">
                            <div className="text-slate-500 mb-1">Outflow</div>
                            <div className="font-semibold text-rose-300">{formatCurrencyValue(flow.outflowTao, "tau", taoUsdRate)}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500">
                          <span>{flow.holdersIncreasing} holders increasing</span>
                          <span>{flow.holdersDecreasing} holders decreasing</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </FadeIn>

            <FadeIn delay={0.12}>
              <GlassCard padding="lg">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-white">What this page now covers</h3>
                  <p className="text-[11px] text-slate-600 mt-1">First usable version of the holder-intel surface</p>
                </div>
                <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="font-semibold text-white mb-1">Included now</div>
                    <ul className="space-y-1 text-[12px] text-slate-400">
                      <li>• Top 100 tracked wallet cohort</li>
                      <li>• Root staking vs subnet staking posture</li>
                      <li>• Dominant subnet allocations per wallet</li>
                      <li>• Cohort inflow / outflow by subnet</li>
                      <li>• Rotation summaries for product intelligence</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.03] p-3">
                    <div className="font-semibold text-amber-300 mb-1">Still missing</div>
                    <ul className="space-y-1 text-[12px] text-slate-400">
                      <li>• Live wallet attribution from chain data</li>
                      <li>• Verifiable real top-holder ranking</li>
                      <li>• Real historical cohort movement snapshots</li>
                      <li>• Wallet-by-wallet provenance and alerts</li>
                    </ul>
                  </div>
                </div>
              </GlassCard>
            </FadeIn>
          </div>
        </>
      )}
    </div>
  );
}
