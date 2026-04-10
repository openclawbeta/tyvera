"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Download, RefreshCw, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { DataSourceBadge } from "@/components/ui-custom/data-source-badge";
import { fetchSubnetsFromApi, getSubnets } from "@/lib/api/subnets";
import type { RiskLevel, SubnetDetailModel } from "@/lib/types/subnets";
import { cn, formatLargeNumber, subnetGradient } from "@/lib/utils";
import { MetricsDataTable } from "@/components/subnets/metrics-data-table";

const CATEGORY_OPTIONS = ["All", "AI", "Creative", "Infrastructure", "Data", "Finance", "Science", "Language", "Multi-Modal"];
const PRESET_OPTIONS = [
  "Best risk-adjusted",
  "Low risk only",
  "High liquidity",
  "Momentum leaders",
  "Confidence 80+",
  "Traction leaders",
];

function formatLiquidity(liquidity: number): string {
  if (liquidity >= 1_000_000) return `${(liquidity / 1_000_000).toFixed(1)}M τ`;
  if (liquidity >= 1_000) return `${formatLargeNumber(liquidity)} τ`;
  return `${liquidity.toFixed(0)} τ`;
}

function formatFlow(flow: number): string {
  const sign = flow >= 0 ? "+" : "";
  if (Math.abs(flow) >= 1_000_000) return `${sign}${(flow / 1_000_000).toFixed(1)}M τ`;
  if (Math.abs(flow) >= 1_000) return `${sign}${(flow / 1_000).toFixed(1)}K τ`;
  return `${sign}${flow.toFixed(1)} τ`;
}

function emissionsWidth(value: number, max: number): string {
  if (max <= 0) return "0%";
  return `${Math.max(8, Math.round((value / max) * 100))}%`;
}

function riskRank(risk: RiskLevel): number {
  if (risk === "LOW") return 1;
  if (risk === "MODERATE") return 2;
  if (risk === "HIGH") return 3;
  return 4;
}

function getFlow24h(subnet: SubnetDetailModel): number {
  if (typeof subnet.flow24h === "number") return subnet.flow24h;
  if (typeof subnet.inflow === "number") return subnet.inflow;
  return 0;
}

function getFlowPct(subnet: SubnetDetailModel): number {
  if (typeof subnet.inflowPct === "number") return subnet.inflowPct;
  if (subnet.liquidity > 0) return (getFlow24h(subnet) / subnet.liquidity) * 100;
  return 0;
}

export default function MetricsPage() {
  const router = useRouter();
  const seed = getSubnets();
  const [subnets, setSubnets] = useState<SubnetDetailModel[]>(() => seed);
  const [dataSource, setDataSource] = useState("static-snapshot");
  const [snapshotAge, setSnapshotAge] = useState<number | null>(null);
  const [preset, setPreset] = useState("Best risk-adjusted");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<SubnetDetailModel | null>(() => seed[0] ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSubnetsFromApi()
      .then((result) => {
        if (cancelled) return;
        setSubnets(result.subnets);
        setDataSource(result.dataSource);
        setSnapshotAge(result.snapshotAgeSec);
        setSelected((current) => current ?? result.subnets[0] ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const baseFiltered = useMemo(() => {
    let list = [...subnets].filter((s) => s.netuid !== 0 && s.liquidity > 0);

    if (category !== "All") {
      list = list.filter((s) => s.category === category);
    }

    switch (preset) {
      case "Low risk only":
        list = list.filter((s) => s.risk === "LOW");
        break;
      case "High liquidity":
        list = list.filter((s) => s.liquidity >= 5_000);
        break;
      case "Momentum leaders":
        list = list.filter((s) => s.yieldDelta7d > 0);
        break;
      case "Confidence 80+":
        list = list.filter((s) => (s.confidence ?? 0) >= 80);
        break;
      case "Traction leaders":
        list = list.filter((s) => getFlow24h(s) > 0);
        break;
    }

    return list;
  }, [subnets, category, preset]);

  const filtered = baseFiltered;

  const topEmissions = useMemo(() => [...filtered].sort((a, b) => b.emissions - a.emissions).slice(0, 5), [filtered]);
  const improving = useMemo(() => [...filtered].sort((a, b) => b.yieldDelta7d - a.yieldDelta7d).slice(0, 3), [filtered]);
  const deteriorating = useMemo(() => [...filtered].sort((a, b) => a.yieldDelta7d - b.yieldDelta7d).slice(0, 3), [filtered]);
  const topInflows = useMemo(() => [...filtered].sort((a, b) => getFlow24h(b) - getFlow24h(a)).slice(0, 3), [filtered]);
  const topOutflows = useMemo(() => [...filtered].sort((a, b) => getFlow24h(a) - getFlow24h(b)).slice(0, 3), [filtered]);

  const avgYield = filtered.length ? filtered.reduce((sum, s) => sum + s.yield, 0) / filtered.length : 0;
  const avgScore = filtered.length ? filtered.reduce((sum, s) => sum + s.score, 0) / filtered.length : 0;
  const lowRiskCount = filtered.filter((s) => s.risk === "LOW").length;
  const topMomentum = improving[0];
  const highestInflow = topInflows[0];
  const maxEmission = topEmissions.length ? Math.max(...topEmissions.map((s) => s.emissions)) : 0;

  const bestOpportunity = [...filtered].sort((a, b) => b.score - a.score)[0];
  const warningSubnet = deteriorating.find((s) => s.risk === "HIGH" || s.risk === "SPECULATIVE") ?? deteriorating[0];

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <PageHeader
          title="Metrics"
          subtitle="Live subnet intelligence across yield, liquidity, emissions, confidence, risk, and traction. Built as a subnet allocation decision surface."
          className="items-start"
        >
          <div className="flex items-center gap-2">
            <DataSourceBadge source={dataSource} ageSec={snapshotAge} />
          </div>
        </PageHeader>

        <div className="flex flex-wrap items-center gap-2">
          {["24H", "7D", "30D"].map((range) => (
            <span key={range} className={cn("btn-ghost text-xs cursor-default opacity-70", range === "7D" && "text-cyan-300 border-cyan-400/20 bg-cyan-400/10 opacity-100")}>
              {range}
            </span>
          ))}
          <span className="btn-ghost text-xs gap-1.5 cursor-default opacity-70">
            <Download className="w-3.5 h-3.5" /> Export CSV (soon)
          </span>
          <button onClick={() => window.location.reload()} className="btn-ghost text-xs gap-1.5">
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        {[
          { label: "Tracked Subnets", value: String(filtered.length), sub: "full filtered result set" },
          { label: "Average Yield", value: `${avgYield.toFixed(1)}%`, sub: "active subnet average" },
          { label: "Average Score", value: avgScore.toFixed(1), sub: "composite quality" },
          { label: "Low-Risk Count", value: String(lowRiskCount), sub: "allocator-friendlier set" },
          { label: "Top Momentum", value: topMomentum ? `SN${topMomentum.netuid}` : "—", sub: topMomentum ? `${topMomentum.yieldDelta7d.toFixed(1)}% 7d` : "no data" },
          { label: "Highest Inflow", value: highestInflow ? `SN${highestInflow.netuid}` : "—", sub: highestInflow ? formatFlow(getFlow24h(highestInflow)) : "no data" },
        ].map((stat) => (
          <GlassCard key={stat.label} padding="md">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">{stat.label}</div>
            <div className="mt-2 text-[28px] font-black text-white tracking-[-0.03em]">{stat.value}</div>
            <div className="mt-1 text-[11px] text-slate-500">{stat.sub}</div>
          </GlassCard>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESET_OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => setPreset(option)}
            className={cn(
              "px-3 py-2 rounded-full text-xs font-medium border transition-all",
              preset === option
                ? "bg-cyan-400/15 text-cyan-300 border-cyan-400/25"
                : "bg-white/[0.03] text-slate-500 border-white/[0.07] hover:text-slate-300 hover:bg-white/[0.05]",
            )}
          >
            {option}
          </button>
        ))}
        <div className="w-px h-4 bg-white/10 mx-1" />
        {CATEGORY_OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => setCategory(option)}
            className={cn(
              "px-3 py-2 rounded-full text-xs font-medium border transition-all",
              category === option
                ? "bg-violet-400/15 text-violet-300 border-violet-400/25"
                : "bg-white/[0.03] text-slate-500 border-white/[0.07] hover:text-slate-300 hover:bg-white/[0.05]",
            )}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[1fr_340px] gap-5 overflow-hidden">
        <div className="space-y-5 min-w-0">
          <GlassCard padding="lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[17px] font-bold text-white tracking-[-0.02em]">Ranked subnet metrics</div>
                <div className="text-[12px] text-slate-500 mt-1">Metrics now uses the same denser table language as Subnets, with traction-focused fields layered in.</div>
              </div>
              <div className="text-[11px] text-slate-500">{filtered.length} visible</div>
            </div>

            <MetricsDataTable
              subnets={filtered}
              onSelect={(netuid) => router.push(`/subnets/${netuid}`)}
            />
          </GlassCard>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <GlassCard padding="lg">
              <div className="text-[15px] font-bold text-white mb-1">Yield vs Liquidity</div>
              <div className="text-[12px] text-slate-500 mb-4">The main trap-detection view. High-yield names with weak liquidity should stand out immediately.</div>
              <div className="relative h-72 rounded-xl border border-white/[0.06] bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] bg-white/[0.02] overflow-hidden">
                <div className="absolute left-3 top-3 text-[10px] uppercase tracking-[0.08em] text-slate-600 font-semibold">Yield</div>
                <div className="absolute right-3 bottom-3 text-[10px] uppercase tracking-[0.08em] text-slate-600 font-semibold">Liquidity</div>
                {filtered.slice(0, 16).map((subnet) => {
                  const left = Math.min(88, Math.max(8, (subnet.liquidity / Math.max(...filtered.map((s) => s.liquidity), 1)) * 100));
                  const top = Math.min(82, Math.max(10, 90 - (subnet.yield / Math.max(...filtered.map((s) => s.yield), 1)) * 70));
                  const color = subnet.risk === "LOW" ? "#34d399" : subnet.risk === "MODERATE" ? "#fbbf24" : "#fb7185";
                  return (
                    <div
                      key={subnet.netuid}
                      className="absolute w-3 h-3 rounded-full"
                      style={{ left: `${left}%`, top: `${top}%`, background: color, boxShadow: `0 0 12px ${color}` }}
                      title={`SN${subnet.netuid} ${subnet.name}`}
                    />
                  );
                })}
              </div>
            </GlassCard>

            <GlassCard padding="lg">
              <div className="text-[15px] font-bold text-white mb-1">Score vs Risk Quadrant</div>
              <div className="text-[12px] text-slate-500 mb-4">A Tyvera-native structure view: strong/safe names should cluster distinctly from fragile ones.</div>
              <div className="relative h-72 rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/[0.05]" />
                <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.05]" />
                <div className="absolute top-3 right-3 text-[10px] uppercase tracking-[0.08em] text-slate-600 font-semibold">Strong / Safe</div>
                <div className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.08em] text-slate-600 font-semibold">Weak / Safe</div>
                <div className="absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.08em] text-slate-600 font-semibold">Weak / Risky</div>
                <div className="absolute bottom-3 right-3 text-[10px] uppercase tracking-[0.08em] text-slate-600 font-semibold">Strong / Risky</div>
                {filtered.slice(0, 16).map((subnet) => {
                  const left = Math.min(88, Math.max(8, subnet.score));
                  const top = Math.min(82, Math.max(10, 100 - riskRank(subnet.risk) * 22));
                  const color = subnet.risk === "LOW" ? "#34d399" : subnet.risk === "MODERATE" ? "#fbbf24" : "#fb7185";
                  return (
                    <div
                      key={subnet.netuid}
                      className="absolute w-3 h-3 rounded-full"
                      style={{ left: `${left}%`, top: `${top}%`, background: color, boxShadow: `0 0 12px ${color}` }}
                      title={`SN${subnet.netuid} ${subnet.name}`}
                    />
                  );
                })}
              </div>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <GlassCard padding="lg">
              <div className="text-[15px] font-bold text-white mb-1">Emissions concentration</div>
              <div className="text-[12px] text-slate-500 mb-4">Shows where network reward concentration currently sits.</div>
              <div className="space-y-3">
                {topEmissions.map((subnet) => (
                  <div key={subnet.netuid} className="grid grid-cols-[120px_1fr_56px] gap-3 items-center">
                    <div className="text-[12px] text-slate-300">SN{subnet.netuid} {subnet.symbol}</div>
                    <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500" style={{ width: emissionsWidth(subnet.emissions, maxEmission) }} />
                    </div>
                    <div className="text-[12px] text-slate-400 font-mono">{subnet.emissions.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard padding="lg">
              <div className="text-[15px] font-bold text-white mb-1">Traction / rotation</div>
              <div className="text-[12px] text-slate-500 mb-4">Shows where stake appears to be flowing in and out right now.</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-white mb-3"><ArrowUpRight className="w-4 h-4 text-emerald-400" /> Inflows</div>
                  <div className="space-y-3">
                    {topInflows.map((subnet) => (
                      <div key={subnet.netuid} className="text-[12px]">
                        <div className="font-semibold text-slate-200">SN{subnet.netuid} {subnet.name}</div>
                        <div className="text-emerald-400 font-mono">{formatFlow(getFlow24h(subnet))} • {getFlowPct(subnet).toFixed(1)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-white mb-3"><ArrowDownLeft className="w-4 h-4 text-rose-400" /> Outflows</div>
                  <div className="space-y-3">
                    {topOutflows.map((subnet) => (
                      <div key={subnet.netuid} className="text-[12px]">
                        <div className="font-semibold text-slate-200">SN{subnet.netuid} {subnet.name}</div>
                        <div className="text-rose-400 font-mono">{formatFlow(getFlow24h(subnet))} • {getFlowPct(subnet).toFixed(1)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {selected && (
            <GlassCard padding="lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[17px] font-bold text-white tracking-[-0.02em]">Selected subnet preview</div>
                  <div className="text-[12px] text-slate-500 mt-1">Use the table to scan fast, then click through to the full subnet page for deep detail.</div>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br", subnetGradient(selected.netuid))}>{selected.netuid}</div>
                    <div>
                      <div className="text-[14px] font-semibold text-white">{selected.name}</div>
                      <div className="text-[12px] text-slate-500 mt-1">{selected.category} • {selected.age} days old • {selected.symbol}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-[12px] text-slate-400 leading-relaxed">{selected.summary ?? selected.description}</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[14px] font-semibold text-white">Algorithm interpretation</div>
                  <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
                    <ShieldCheck className="w-3.5 h-3.5" /> {selected.score >= 85 ? "ACCUMULATE" : selected.score >= 75 ? "HOLD / WATCH" : "WATCH CAREFULLY"}
                  </div>
                  <div className="mt-4 text-[12px] text-slate-400 leading-relaxed">Tyvera currently likes this subnet because it combines better-than-average structural score with allocator-quality signals around liquidity, participation, risk posture, and visible traction.</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[14px] font-semibold text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Click-through</div>
                  <div className="mt-3 text-[12px] text-slate-400 leading-relaxed">Click any row to open the full subnet detail page. Metrics should help users rank and scan, while `/subnets/[netuid]` should carry the deeper analysis.</div>
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        <div className="space-y-5 min-w-0">
          <GlassCard padding="lg" glow="cyan">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">Best opportunities</div>
            {bestOpportunity && (
              <div className="space-y-4">
                <div>
                  <div className="text-[14px] font-semibold text-white">SN{bestOpportunity.netuid} {bestOpportunity.name}</div>
                  <div className="text-[12px] text-slate-400 leading-relaxed mt-2">Strongest composite quality right now with healthier allocator support than most alternatives.</div>
                </div>
                <div className="text-[12px] text-emerald-300">Score {bestOpportunity.score.toFixed(1)} • {bestOpportunity.risk} risk • confidence {bestOpportunity.confidence ?? "—"}</div>
              </div>
            )}
          </GlassCard>

          <GlassCard padding="lg">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">Risk warnings</div>
            {warningSubnet && (
              <div className="space-y-4">
                <div>
                  <div className="text-[14px] font-semibold text-white">SN{warningSubnet.netuid} {warningSubnet.name}</div>
                  <div className="text-[12px] text-slate-400 leading-relaxed mt-2">High headline reward but weaker supporting conditions. This is the kind of subnet the metrics page should help users avoid over-allocating into.</div>
                </div>
                <div className="text-[12px] text-rose-300">{warningSubnet.yield.toFixed(1)}% yield • {warningSubnet.risk} risk • {warningSubnet.yieldDelta7d.toFixed(1)}% 7d</div>
              </div>
            )}
          </GlassCard>

          <GlassCard padding="lg">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">Traction now</div>
            <div className="space-y-4">
              {topInflows.slice(0, 2).map((subnet) => (
                <div key={subnet.netuid}>
                  <div className="text-[14px] font-semibold text-white">SN{subnet.netuid} {subnet.name}</div>
                  <div className="text-[12px] text-slate-400 leading-relaxed mt-2">Gaining visible stake traction. Useful for spotting which subnets are attracting fresh allocator attention.</div>
                  <div className="mt-2 text-[12px] text-emerald-300">{formatFlow(getFlow24h(subnet))} • {getFlowPct(subnet).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard padding="lg">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">Why this page matters</div>
            <div className="text-[12px] text-slate-400 leading-relaxed">Metrics should compress subnet complexity into visible evidence for staking decisions. Use it to sort, scan, compare traction, and then click deeper into full subnet analysis.</div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
