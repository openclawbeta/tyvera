"use client";

import { ArrowRightLeft, CheckCircle2, Crown, GitCompare, Shield, TrendingUp, Users, Zap } from "lucide-react";
import { cn, riskBg, scoreBg, subnetGradient } from "@/lib/utils";
import type { SubnetDetailModel } from "@/lib/types/subnets";

const TAO_BASELINE_YIELD = 14.5;

/* ─────────────────────────────────────────────────────────────────── */
/* Types                                                                 */
/* ─────────────────────────────────────────────────────────────────── */

interface SubnetComparePanelProps {
  subnets: SubnetDetailModel[]; // 2-4 subnets
  onClear: () => void;
}

type MetricDef = {
  label: string;
  getValue: (s: SubnetDetailModel) => number;
  format: (v: number) => string;
  higherIsBetter: boolean;
};

/* ─────────────────────────────────────────────────────────────────── */
/* Metric definitions                                                    */
/* ─────────────────────────────────────────────────────────────────── */

const METRICS: MetricDef[] = [
  { label: "Yield", getValue: (s) => s.yield, format: (v) => `${v}%`, higherIsBetter: true },
  { label: "Score", getValue: (s) => s.score, format: (v) => String(v), higherIsBetter: true },
  { label: "Confidence", getValue: (s) => s.confidence ?? 0, format: (v) => String(v), higherIsBetter: true },
  { label: "Liquidity", getValue: (s) => s.liquidity, format: (v) => `${v.toLocaleString()} τ`, higherIsBetter: true },
  { label: "Stakers", getValue: (s) => s.stakers, format: (v) => v.toLocaleString(), higherIsBetter: true },
  { label: "Emissions", getValue: (s) => s.emissions, format: (v) => `${v} τ`, higherIsBetter: true },
  { label: "Validator take", getValue: (s) => s.validatorTake, format: (v) => `${v}%`, higherIsBetter: false },
  { label: "Breakeven", getValue: (s) => s.breakeven, format: (v) => `${v}d`, higherIsBetter: false },
  { label: "Age", getValue: (s) => s.age, format: (v) => `${v}d`, higherIsBetter: true },
];

/* ─────────────────────────────────────────────────────────────────── */
/* Sub-components                                                        */
/* ─────────────────────────────────────────────────────────────────── */

function CompareHeader({ subnet, winCount, isOverallBest }: { subnet: SubnetDetailModel; winCount: number; isOverallBest: boolean }) {
  return (
    <div className={cn(
      "rounded-2xl p-4 border bg-white/[0.03] relative",
      isOverallBest ? "border-emerald-400/25" : "border-white/[0.07]",
    )}>
      {isOverallBest && (
        <div className="absolute -top-2.5 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
          style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399" }}
        >
          <Crown className="w-2.5 h-2.5" />
          Best overall
        </div>
      )}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white", `bg-gradient-to-br ${subnetGradient(subnet.netuid)}`)}>
          {subnet.netuid}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-white truncate">{subnet.name}</div>
          <div className="text-[11px] text-slate-500">SN{subnet.netuid} · {subnet.category}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className={cn("tag border", scoreBg(subnet.score))}>Score {subnet.score}</span>
        <span className={cn("tag border", riskBg(subnet.risk))}>{subnet.risk}</span>
        <span className="text-[10px] text-slate-500 self-center ml-1">
          {winCount} win{winCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

function BaselineCard({ subnet }: { subnet: SubnetDetailModel }) {
  const edgeVsTao = +(subnet.yield - TAO_BASELINE_YIELD).toFixed(2);
  const beatsTao = edgeVsTao > 0;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="text-[11px] uppercase tracking-[0.1em] text-slate-500 mb-2">
        Vs TAO staking baseline (~{TAO_BASELINE_YIELD}%)
      </div>
      <div className="flex items-center gap-2">
        <TrendingUp className={cn("w-3.5 h-3.5 flex-shrink-0", beatsTao ? "text-emerald-300" : "text-amber-300")} />
        <p className="text-[12px] text-slate-400">
          {beatsTao ? `+${edgeVsTao}% above` : `${edgeVsTao}% below`} baseline
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Main panel                                                            */
/* ─────────────────────────────────────────────────────────────────── */

export function SubnetComparePanel({ subnets, onClear }: SubnetComparePanelProps) {
  const count = subnets.length;

  // Calculate wins per subnet per metric
  const winCounts = subnets.map(() => 0);
  const metricWinners: number[][] = METRICS.map((metric) => {
    const values = subnets.map((s) => metric.getValue(s));
    const best = metric.higherIsBetter ? Math.max(...values) : Math.min(...values);
    const winners: number[] = [];
    values.forEach((v, i) => {
      if (v === best) {
        winners.push(i);
        winCounts[i]++;
      }
    });
    return winners;
  });

  const maxWins = Math.max(...winCounts);
  const overallBestIdx = winCounts.indexOf(maxWins);

  // Grid template for N subnets
  const colTemplate = count === 2
    ? "grid-cols-[1fr_auto_1fr]"
    : count === 3
    ? "grid-cols-3"
    : "grid-cols-2 lg:grid-cols-4";

  return (
    <div
      className="rounded-2xl p-4 sm:p-5"
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 28px rgba(0,0,0,0.28)",
      }}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitCompare className="w-4 h-4 text-cyan-300" />
            <span className="text-[11px] uppercase tracking-[0.12em] text-cyan-300 font-semibold">
              Compare {count} subnets
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Side-by-side metrics with winner highlights and TAO staking baseline.
          </p>
        </div>
        <button className="btn-ghost text-xs self-start sm:self-auto" onClick={onClear}>Clear compare</button>
      </div>

      {/* Subnet headers */}
      <div className={cn("grid gap-4 items-start", colTemplate)}>
        {subnets.map((subnet, i) => (
          <CompareHeader
            key={subnet.netuid}
            subnet={subnet}
            winCount={winCounts[i]}
            isOverallBest={i === overallBestIdx && maxWins > 0}
          />
        ))}
        {/* Divider for 2-subnet layout */}
        {count === 2 && (
          <div className="hidden lg:flex items-center justify-center h-full text-slate-600 order-2 col-start-2">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Metrics table */}
      <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/10 px-4 overflow-x-auto">
        {/* Table header */}
        <div
          className="grid items-center py-2.5 border-b border-white/[0.06]"
          style={{ gridTemplateColumns: `120px repeat(${count}, 1fr)` }}
        >
          <div className="text-[10px] uppercase tracking-wider text-slate-600">Metric</div>
          {subnets.map((s) => (
            <div key={s.netuid} className="text-[10px] uppercase tracking-wider text-slate-500 text-center font-semibold">
              SN{s.netuid}
            </div>
          ))}
        </div>

        {/* Metric rows */}
        {METRICS.map((metric, mi) => (
          <div
            key={metric.label}
            className="grid items-center py-3 border-b border-white/[0.05] last:border-0"
            style={{ gridTemplateColumns: `120px repeat(${count}, 1fr)` }}
          >
            <div className="text-[10px] uppercase tracking-wider text-slate-600">{metric.label}</div>
            {subnets.map((s, si) => {
              const isWinner = metricWinners[mi].includes(si);
              return (
                <div
                  key={s.netuid}
                  className={cn(
                    "text-sm font-semibold text-center tabular-nums",
                    isWinner ? "text-emerald-300" : "text-slate-400",
                  )}
                >
                  {metric.format(metric.getValue(s))}
                  {isWinner && metricWinners[mi].length === 1 && (
                    <span className="ml-1 text-[8px] text-emerald-500">●</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Category row (non-competitive) */}
      <div className="mt-3 rounded-xl border border-white/[0.05] bg-black/5 px-4 py-3">
        <div
          className="grid items-center"
          style={{ gridTemplateColumns: `120px repeat(${count}, 1fr)` }}
        >
          <div className="text-[10px] uppercase tracking-wider text-slate-600">Category</div>
          {subnets.map((s) => (
            <div key={s.netuid} className="text-xs text-slate-400 text-center">{s.category}</div>
          ))}
        </div>
      </div>

      {/* Baseline cards */}
      <div className={cn("grid gap-4 mt-5", colTemplate)}>
        {subnets.map((subnet) => (
          <BaselineCard key={subnet.netuid} subnet={subnet} />
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 mt-5 text-[11px] text-slate-500">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        <span>
          {subnets[overallBestIdx]?.name ?? "—"} leads with {maxWins} metric win{maxWins !== 1 ? "s" : ""}.
          All yields compared against TAO staking baseline (~{TAO_BASELINE_YIELD}%).
        </span>
      </div>
    </div>
  );
}
