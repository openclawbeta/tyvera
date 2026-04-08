"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Download, RefreshCw, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { DataSourceBadge } from "@/components/ui-custom/data-source-badge";
import { fetchSubnetsFromApi, getSubnets } from "@/lib/api/subnets";
import type { RiskLevel, SubnetDetailModel } from "@/lib/types/subnets";
import { cn, formatLargeNumber, riskBg, scoreColor } from "@/lib/utils";

const CATEGORY_OPTIONS = ["All", "AI", "Creative", "Infrastructure", "Data", "Finance", "Science", "Language", "Multi-Modal"];
const PRESET_OPTIONS = [
  "Best risk-adjusted",
  "Low risk only",
  "High liquidity",
  "Momentum leaders",
  "Confidence 80+",
];

function formatLiquidity(liquidity: number): string {
  if (liquidity >= 1_000_000) return `${(liquidity / 1_000_000).toFixed(1)}M τ`;
  if (liquidity >= 1_000) return `${formatLargeNumber(liquidity)} τ`;
  return `${liquidity.toFixed(0)} τ`;
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

export default function MetricsPage() {
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

  const filtered = useMemo(() => {
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
    }

    return list.sort((a, b) => {
      if (preset === "Momentum leaders") return b.yieldDelta7d - a.yieldDelta7d;
      if (preset === "High liquidity") return b.liquidity - a.liquidity;
      return b.score - a.score;
    });
  }, [subnets, category, preset]);

  const topEmissions = useMemo(() => [...filtered].sort((a, b) => b.emissions - a.emissions).slice(0, 5), [filtered]);
  const improving = useMemo(() => [...filtered].sort((a, b) => b.yieldDelta7d - a.yieldDelta7d).slice(0, 3), [filtered]);
  const deteriorating = useMemo(() => [...filtered].sort((a, b) => a.yieldDelta7d - b.yieldDelta7d).slice(0, 3), [filtered]);

  const avgYield = filtered.length ? filtered.reduce((sum, s) => sum + s.yield, 0) / filtered.length : 0;
  const avgScore = filtered.length ? filtered.reduce((sum, s) => sum + s.score, 0) / filtered.length : 0;
  const lowRiskCount = filtered.filter((s) => s.risk === "LOW").length;
  const topMomentum = improving[0];
  const risingRisk = filtered.filter((s) => s.risk === "HIGH" || s.risk === "SPECULATIVE").length;
  const maxEmission = topEmissions.length ? Math.max(...topEmissions.map((s) => s.emissions)) : 0;

  const bestOpportunity = filtered[0];
  const warningSubnet = deteriorating.find((s) => s.risk === "HIGH" || s.risk === "SPECULATIVE") ?? deteriorating[0];

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <PageHeader
          title="Metrics"
          subtitle="Live subnet intelligence across yield, liquidity, emissions, confidence, and risk. Built as a subnet allocation decision surface."
          className="items-start"
        >
          <div className="flex items-center gap-2">
            <DataSourceBadge source={dataSource} ageSec={snapshotAge} />
          </div>
        </PageHeader>

        <div className="flex flex-wrap items-center gap-2">
          {['24H', '7D', '30D'].map((range) => (
            <button key={range} className={cn('btn-ghost text-xs', range === '7D' && 'text-cyan-300 border-cyan-400/20 bg-cyan-400/10')}>
              {range}
            </button>
          ))}
          <button className="btn-ghost text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button className="btn-ghost text-xs gap-1.5">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        {[
          { label: 'Tracked Subnets', value: String(filtered.length), sub: 'current result set' },
          { label: 'Average Yield', value: `${avgYield.toFixed(1)}%`, sub: 'active subnet average' },
          { label: 'Average Score', value: avgScore.toFixed(1), sub: 'composite quality' },
          { label: 'Low-Risk Count', value: String(lowRiskCount), sub: 'allocator-friendlier set' },
          { label: 'Top Momentum', value: topMomentum ? `SN${topMomentum.netuid}` : '—', sub: topMomentum ? `${topMomentum.yieldDelta7d.toFixed(1)}% 7d` : 'no data' },
          { label: 'Rising Risk Flags', value: String(risingRisk), sub: 'high/speculative names' },
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
              'px-3 py-2 rounded-full text-xs font-medium border transition-all',
              preset === option
                ? 'bg-cyan-400/15 text-cyan-300 border-cyan-400/25'
                : 'bg-white/[0.03] text-slate-500 border-white/[0.07] hover:text-slate-300 hover:bg-white/[0.05]',
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
              'px-3 py-2 rounded-full text-xs font-medium border transition-all',
              category === option
                ? 'bg-violet-400/15 text-violet-300 border-violet-400/25'
                : 'bg-white/[0.03] text-slate-500 border-white/[0.07] hover:text-slate-300 hover:bg-white/[0.05]',
            )}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[1.7fr_0.9fr] gap-5">
        <div className="space-y-5">
          <GlassCard padding="lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[17px] font-bold text-white tracking-[-0.02em]">Ranked subnet metrics</div>
                <div className="text-[12px] text-slate-500 mt-1">Default sort is composite score so the page reinforces quality-first decisions.</div>
              </div>
              <div className="text-[11px] text-slate-500">{filtered.length} visible</div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <div className="min-w-[1050px]">
                <div className="grid grid-cols-[80px_1.4fr_.9fr_.9fr_.9fr_1fr_.85fr_.85fr_.85fr_.85fr] gap-3 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 bg-white/[0.03] border-b border-white/[0.05]">
                  <div>Subnet</div><div>Name</div><div>Yield</div><div>Score</div><div>Risk</div><div>Liquidity</div><div>Stakers</div><div>Emissions</div><div>7D</div><div>Conf.</div>
                </div>
                {filtered.slice(0, 14).map((subnet) => (
                  <button
                    key={subnet.netuid}
                    onClick={() => setSelected(subnet)}
                    className={cn(
                      'grid w-full text-left grid-cols-[80px_1.4fr_.9fr_.9fr_.9fr_1fr_.85fr_.85fr_.85fr_.85fr] gap-3 px-4 py-3 border-b border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.03] transition-all',
                      selected?.netuid === subnet.netuid && 'bg-cyan-400/[0.05]'
                    )}
                  >
                    <div className="font-mono text-[12px] text-slate-300">SN{subnet.netuid}</div>
                    <div>
                      <div className="text-[13px] font-semibold text-white">{subnet.name}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">{subnet.category} • {subnet.age}d old</div>
                    </div>
                    <div className="font-mono text-[12px] text-slate-200">{subnet.yield.toFixed(1)}%</div>
                    <div className={cn('font-mono text-[12px] font-semibold', scoreColor(subnet.score))}>{subnet.score.toFixed(1)}</div>
                    <div><span className={cn('px-2 py-1 rounded-full text-[10px] font-semibold border', riskBg(subnet.risk))}>{subnet.risk}</span></div>
                    <div className="font-mono text-[12px] text-slate-300">{formatLiquidity(subnet.liquidity)}</div>
                    <div className="font-mono text-[12px] text-slate-300">{formatLargeNumber(subnet.stakers)}</div>
                    <div className="font-mono text-[12px] text-slate-300">{subnet.emissions.toFixed(1)} τ/d</div>
                    <div className={cn('font-mono text-[12px] font-semibold', subnet.yieldDelta7d >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                      {subnet.yieldDelta7d >= 0 ? '+' : ''}{subnet.yieldDelta7d.toFixed(1)}%
                    </div>
                    <div className="font-mono text-[12px] text-slate-300">{subnet.confidence ?? '—'}</div>
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <GlassCard padding="lg">
              <div className="text-[15px] font-bold text-white mb-1">Yield vs Liquidity</div>
              <div className="text-[12px] text-slate-500 mb-4">The main trap-detection view. High-yield names with weak liquidity should stand out immediately.</div>
              <div className="relative h-72 rounded-xl border border-white/[0.06] bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] bg-white/[0.02] overflow-hidden">
                <div className="absolute left-3 top-3 text-[10px] uppercase tracking-[0.08em] text-slate-600 font-semibold">Yield</div>
                <div className="absolute right-3 bottom-3 text-[10px] uppercase tracking-[0.08em] text-slate-600 font-semibold">Liquidity</div>
                {filtered.slice(0, 10).map((subnet, idx) => {
                  const left = Math.min(88, Math.max(8, (subnet.liquidity / Math.max(...filtered.map((s) => s.liquidity), 1)) * 100));
                  const top = Math.min(82, Math.max(10, 90 - (subnet.yield / Math.max(...filtered.map((s) => s.yield), 1)) * 70));
                  const color = subnet.risk === 'LOW' ? '#34d399' : subnet.risk === 'MODERATE' ? '#fbbf24' : '#fb7185';
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
                {filtered.slice(0, 10).map((subnet) => {
                  const left = Math.min(88, Math.max(8, subnet.score));
                  const top = Math.min(82, Math.max(10, 100 - riskRank(subnet.risk) * 22));
                  const color = subnet.risk === 'LOW' ? '#34d399' : subnet.risk === 'MODERATE' ? '#fbbf24' : '#fb7185';
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
              <div className="text-[15px] font-bold text-white mb-1">Movers / deteriorators</div>
              <div className="text-[12px] text-slate-500 mb-4">Fast operational read of where conditions are improving or deteriorating.</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-white mb-3"><TrendingUp className="w-4 h-4 text-emerald-400" /> Improving now</div>
                  <div className="space-y-3">
                    {improving.map((subnet) => (
                      <div key={subnet.netuid} className="text-[12px]">
                        <div className="font-semibold text-slate-200">SN{subnet.netuid} {subnet.name}</div>
                        <div className="text-emerald-400 font-mono">+{subnet.yieldDelta7d.toFixed(1)}% 7d</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-white mb-3"><TrendingDown className="w-4 h-4 text-rose-400" /> Deteriorating now</div>
                  <div className="space-y-3">
                    {deteriorating.map((subnet) => (
                      <div key={subnet.netuid} className="text-[12px]">
                        <div className="font-semibold text-slate-200">SN{subnet.netuid} {subnet.name}</div>
                        <div className="text-rose-400 font-mono">{subnet.yieldDelta7d.toFixed(1)}% 7d</div>
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
                  <div className="text-[17px] font-bold text-white tracking-[-0.02em]">Subnet detail</div>
                  <div className="text-[12px] text-slate-500 mt-1">How the algorithm should explain a subnet, not just rank it.</div>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[14px] font-semibold text-white">SN{selected.netuid} {selected.name}</div>
                  <div className="text-[12px] text-slate-500 mt-2">{selected.category} • {selected.age} days old • {selected.symbol}</div>
                  <div className="mt-4 text-[12px] text-slate-400 leading-relaxed">
                    {selected.summary ?? selected.description}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[14px] font-semibold text-white">Algorithm interpretation</div>
                  <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
                    <ShieldCheck className="w-3.5 h-3.5" /> {selected.score >= 85 ? 'ACCUMULATE' : selected.score >= 75 ? 'HOLD / WATCH' : 'WATCH CAREFULLY'}
                  </div>
                  <div className="mt-4 text-[12px] text-slate-400 leading-relaxed">
                    Tyvera currently likes this subnet because it combines better-than-average structural score with allocator-quality signals around liquidity, participation, and risk posture.
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[14px] font-semibold text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Risk note</div>
                  <div className="mt-3 text-[12px] text-slate-400 leading-relaxed">
                    Even strong subnets can deteriorate. Users should still inspect yield trend, liquidity support, confidence, and emissions durability before allocating fresh stake.
                  </div>
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        <div className="space-y-5">
          <GlassCard padding="lg" glow="cyan">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">Best opportunities</div>
            {bestOpportunity && (
              <div className="space-y-4">
                <div>
                  <div className="text-[15px] font-semibold text-white">SN{bestOpportunity.netuid} {bestOpportunity.name}</div>
                  <div className="text-[12px] text-slate-400 leading-relaxed mt-2">
                    Strongest composite quality right now with healthier allocator support than most alternatives.
                  </div>
                </div>
                <div className="text-[12px] text-emerald-300">Score {bestOpportunity.score.toFixed(1)} • {bestOpportunity.risk} risk • confidence {bestOpportunity.confidence ?? '—'}</div>
              </div>
            )}
          </GlassCard>

          <GlassCard padding="lg">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">Risk warnings</div>
            {warningSubnet && (
              <div className="space-y-4">
                <div>
                  <div className="text-[15px] font-semibold text-white">SN{warningSubnet.netuid} {warningSubnet.name}</div>
                  <div className="text-[12px] text-slate-400 leading-relaxed mt-2">
                    High headline reward but weaker supporting conditions. This is the kind of subnet the metrics page should help users avoid over-allocating into.
                  </div>
                </div>
                <div className="text-[12px] text-rose-300">{warningSubnet.yield.toFixed(1)}% yield • {warningSubnet.risk} risk • {warningSubnet.yieldDelta7d.toFixed(1)}% 7d</div>
              </div>
            )}
          </GlassCard>

          <GlassCard padding="lg">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">Reallocation watch</div>
            <div className="text-[15px] font-semibold text-white">Potential shift: SN19 → SN49</div>
            <div className="text-[12px] text-slate-400 leading-relaxed mt-2">
              Better score, better confidence, better liquidity support. Recommendation logic should treat this as a watch signal, not automatic execution.
            </div>
          </GlassCard>

          <GlassCard padding="lg">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3">Why this page matters</div>
            <div className="text-[12px] text-slate-400 leading-relaxed">
              This page should compress subnet complexity into visible evidence for staking decisions. It is not just a ranking list — it is a decision surface.
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
