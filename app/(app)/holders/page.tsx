"use client";

import { useEffect, useState } from "react";
import { Info, TrendingUp, TrendingDown, ArrowRightLeft, Wallet, Radar, Shield } from "lucide-react";
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
      fetch("/api/holders/real", { cache: "no-store" })
        .then((res) => res.json())
        .catch(() => null),
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
    <div className="mx-auto max-w-[1440px] space-y-8">
      <PageHeader title="Holder Intelligence" subtitle="Top wallet cohort tracking across root stake and subnet rotations">
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="inline-flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Cohort monitoring surface
          </div>
          <DataSourceBadge source="api" ageSec={null} />
          {data && (
            <span
              className={`inline-flex items-center rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                holderMeta?.source === "tao-app"
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : data.source === "chain-partial"
                    ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                    : "border-amber-400/20 bg-amber-400/10 text-amber-300"
              }`}
            >
              {holderMeta?.source === "tao-app" ? "TAO.app" : data.source === "chain-partial" ? "Chain Partial" : "Modeled"}
            </span>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
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
              <Radar className="h-3 w-3" />
              holder cohort engine
            </div>

            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white md:text-[40px]">
              Track who holds size
              <span className="block bg-[linear-gradient(135deg,#67e8f9_0%,#4f7cff_55%,#8b5cf6_100%)] bg-clip-text text-transparent">
                before their flows reshape the field.
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-[15px]">
              Holder Intelligence is the cohort-monitoring surface: wallet concentration, root-vs-subnet posture, and directional flow organized to reveal where dominant capital is positioned and rotating.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                { label: "Monitoring mode", value: "Cohort-first", note: "Focus on concentration and rotation", tone: "text-cyan-300" },
                {
                  label: "Attribution posture",
                  value: holderMeta?.source === "tao-app" ? "Provider-backed" : data?.source === "chain-partial" ? "Chain-partial" : "Modeled",
                  note: holderMeta?.source === "tao-app" ? "External holder attribution is active" : data?.source === "chain-partial" ? "Real chain coverage is partial" : "Structured product-development intelligence",
                  tone: holderMeta?.source === "tao-app" ? "text-emerald-300" : data?.source === "chain-partial" ? "text-cyan-300" : "text-amber-300",
                },
                { label: "Trust model", value: "Truthful state", note: "Provider quality stays explicit throughout", tone: "text-white" },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</div>
                  <div className={`mt-2 text-base font-semibold tracking-tight ${card.tone}`}>{card.value}</div>
                  <div className="mt-1 text-xs text-slate-500">{card.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {[
            {
              label: "Cohort monitor",
              title: "Track concentration across the top wallet layer.",
              detail: "This page is for understanding who controls size, where stake is concentrated, and how the dominant cohort is positioned.",
            },
            {
              label: "Flow intelligence",
              title: "Map wallet rotation into subnet-level movement.",
              detail: "The valuable output here is not raw wallet lists — it is directional flow, posture shifts, and exposure changes across subnets.",
            },
            {
              label: "Truthfulness first",
              title: "Provider quality must remain explicit.",
              detail: "Modeled, chain-partial, and TAO.app-backed states stay visible so users know whether this is real attribution or staged intelligence.",
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

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Holder intelligence workflow
      </div>

      <FadeIn>
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3.5"
          style={{
            background: holderMeta?.source === "tao-app" ? "rgba(16,185,129,0.05)" : "rgba(251,191,36,0.04)",
            border: holderMeta?.source === "tao-app" ? "1px solid rgba(16,185,129,0.14)" : "1px solid rgba(251,191,36,0.12)",
          }}
        >
          <Info className={`mt-0.5 h-4 w-4 shrink-0 ${holderMeta?.source === "tao-app" ? "text-emerald-300" : "text-amber-300"}`} />
          <div className="text-[12px] text-slate-300">
            {holderMeta?.source === "tao-app" ? (
              <>
                <span className="font-semibold text-emerald-300">TAO.app-backed holder intelligence.</span> This view is using external holder concentration and flow analytics as a live provider fallback.
                <div className="mt-2 text-[11px] text-slate-400">Powered by TAO.app API</div>
              </>
            ) : (
              <>
                <span className="font-semibold text-amber-300">Modeled intelligence layer.</span> This current view is a structured cohort approximation for product development: it distinguishes root-vs-subnet posture, dominant allocations, and rotation patterns, but it is not yet sourced from live wallet-level chain attribution.
              </>
            )}
          </div>
        </div>
      </FadeIn>

      {realAttribution && (
        <FadeIn delay={0.03}>
          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3.5"
            style={{
              background: realAttribution.summary.available ? "rgba(34,211,238,0.04)" : "rgba(148,163,184,0.05)",
              border: realAttribution.summary.available ? "1px solid rgba(34,211,238,0.12)" : "1px solid rgba(148,163,184,0.12)",
            }}
          >
            <Info className={`mt-0.5 h-4 w-4 shrink-0 ${realAttribution.summary.available ? "text-cyan-300" : "text-slate-400"}`} />
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
          <div className="py-16 text-center text-sm text-slate-500">Loading holder intelligence…</div>
        </GlassCard>
      ) : (
        <>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Holder cohort overview
          </div>

          <FadeIn delay={0.05}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[
                { label: "Tracked TAO", value: formatCurrencyValue(data.summary.totalTrackedTao, "tau", taoUsdRate) },
                { label: "Root Staked", value: `${formatCurrencyValue(data.summary.rootStakedTao, "tau", taoUsdRate)} · ${data.summary.rootSharePct}%` },
                { label: "Subnet Staked", value: `${formatCurrencyValue(data.summary.subnetStakedTao, "tau", taoUsdRate)} · ${data.summary.subnetSharePct}%` },
                { label: "Top Rotation", value: data.summary.topRotations[0] ?? "—" },
              ].map((stat) => (
                <GlassCard key={stat.label} padding="md">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{stat.label}</div>
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                </GlassCard>
              ))}
            </div>
          </FadeIn>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Wallet ranking, flow, and coverage
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <FadeIn delay={0.08}>
              <GlassCard padding="lg">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-white">Top wallet cohort</h3>
                  <p className="mt-1 text-[11px] text-slate-600">Showing all {data.topHolders.length} tracked wallets</p>
                </div>
                <div className="max-h-[840px] space-y-3 overflow-auto pr-1">
                  {data.topHolders.map((holder) => (
                    <div key={holder.wallet} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/10 text-xs font-bold text-cyan-300">
                          #{holder.rank}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-white">{holder.label}</div>
                              <div className="font-mono text-[10px] text-slate-600">{holder.wallet}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-white">{formatCurrencyValue(holder.totalTao, "tau", taoUsdRate)}</div>
                              <div className={`text-[10px] font-semibold uppercase tracking-wider ${strategyTone(holder.strategyTag)}`}>{holder.strategyTag}</div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                            <div className="rounded-lg border border-white/[0.05] bg-white/[0.03] p-2">
                              <div className="mb-1 text-slate-500">Root stake</div>
                              <div className="font-semibold text-slate-200">{formatCurrencyValue(holder.rootStakedTao, "tau", taoUsdRate)}</div>
                            </div>
                            <div className="rounded-lg border border-white/[0.05] bg-white/[0.03] p-2 text-right">
                              <div className="mb-1 text-slate-500">Subnet stake</div>
                              <div className="font-semibold text-slate-200">{formatCurrencyValue(holder.subnetStakedTao, "tau", taoUsdRate)}</div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {holder.allocationMix.slice(0, 4).map((allocation) => (
                              <span key={`${holder.wallet}-${allocation.netuid}`} className="inline-flex items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[10px] text-slate-300">
                                <Wallet className="h-3 w-3" />
                                {allocation.subnetName}: {allocation.percentage}%
                              </span>
                            ))}
                          </div>

                          <div className="mt-3 space-y-1.5">
                            {holder.recentMoves.map((move, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-400">
                                <ArrowRightLeft className="h-3 w-3 text-cyan-400" />
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
                  <p className="mt-1 text-[11px] text-slate-600">Where tracked wallets are increasing or decreasing exposure</p>
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
                            {positive ? <TrendingUp className="mr-1 inline h-4 w-4" /> : <TrendingDown className="mr-1 inline h-4 w-4" />}
                            {positive ? "+" : ""}
                            {formatCurrencyValue(flow.netflowTao, "tau", taoUsdRate)}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                          <div className="rounded-lg border border-white/[0.05] bg-white/[0.03] p-2">
                            <div className="mb-1 text-slate-500">Inflow</div>
                            <div className="font-semibold text-emerald-300">{formatCurrencyValue(flow.inflowTao, "tau", taoUsdRate)}</div>
                          </div>
                          <div className="rounded-lg border border-white/[0.05] bg-white/[0.03] p-2 text-right">
                            <div className="mb-1 text-slate-500">Outflow</div>
                            <div className="font-semibold text-rose-300">{formatCurrencyValue(flow.outflowTao, "tau", taoUsdRate)}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
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
                  <p className="mt-1 text-[11px] text-slate-600">First usable version of the holder-intel surface</p>
                </div>
                <div className="space-y-3 text-sm leading-relaxed text-slate-300">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="mb-1 font-semibold text-white">Included now</div>
                    <ul className="space-y-1 text-[12px] text-slate-400">
                      <li>• Top 100 tracked wallet cohort</li>
                      <li>• Root staking vs subnet staking posture</li>
                      <li>• Dominant subnet allocations per wallet</li>
                      <li>• Cohort inflow / outflow by subnet</li>
                      <li>• Rotation summaries for product intelligence</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.03] p-3">
                    <div className="mb-1 font-semibold text-amber-300">Still missing</div>
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

      <FadeIn>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "What this page should do",
              detail: "Show who controls size, how concentrated the cohort is, and where dominant wallets are rotating across the network.",
            },
            {
              title: "Why truthfulness matters",
              detail: "Holder intelligence is only useful if modeled, chain-partial, and provider-backed states remain explicit to the user.",
            },
            {
              title: "Best follow-on action",
              detail: "Use subnet flow and cohort posture to investigate which networks are accumulating attention before checking Subnets or Recommendations.",
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
