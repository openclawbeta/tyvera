"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ArrowRight,
  Calculator,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  RotateCcw,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn, subnetGradient } from "@/lib/utils";
import type { SubnetDetailModel } from "@/lib/types/subnets";
import type { AllocationModel } from "@/lib/types/portfolio";

/* ─────────────────────────────────────────────────────────────────── */
/* Types                                                                 */
/* ─────────────────────────────────────────────────────────────────── */

interface ReallocationSimulatorProps {
  allocations: AllocationModel[];
  subnets: SubnetDetailModel[];
  totalStakedTao: number;
}

interface SimMove {
  fromNetuid: number;
  toNetuid: number;
  amountTao: number;
}

interface SimResult {
  currentYield: number;
  projectedYield: number;
  yieldDelta: number;
  currentRisk: string;
  projectedRisk: string;
  allocations: { netuid: number; name: string; current: number; projected: number; yieldPct: number }[];
}

/* ─────────────────────────────────────────────────────────────────── */
/* Helpers                                                               */
/* ─────────────────────────────────────────────────────────────────── */

function riskLabel(score: number): string {
  if (score >= 75) return "Conservative";
  if (score >= 50) return "Moderate";
  if (score >= 25) return "Aggressive";
  return "Speculative";
}

function riskColor(score: number): string {
  if (score >= 75) return "text-emerald-300";
  if (score >= 50) return "text-amber-300";
  if (score >= 25) return "text-orange-400";
  return "text-rose-400";
}

function computeDiversification(fractions: number[]): number {
  const nonZero = fractions.filter((f) => f > 0);
  if (nonZero.length <= 1) return 10;
  const hhi = nonZero.reduce((acc, f) => acc + f * f, 0);
  return Math.round(Math.max(10, Math.min(100, (1 - hhi) * 100)));
}

/* ─────────────────────────────────────────────────────────────────── */
/* Sub-components                                                        */
/* ─────────────────────────────────────────────────────────────────── */

function SubnetSelector({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number | null;
  options: { netuid: number; name: string }[];
  onChange: (netuid: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.netuid === value);

  return (
    <div className="relative">
      <div className="text-[10px] uppercase tracking-wider text-slate-600 mb-1.5">{label}</div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left",
          "bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.12] transition-colors",
        )}
      >
        {selected ? (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold text-white",
                `bg-gradient-to-br ${subnetGradient(selected.netuid)}`,
              )}
            >
              {selected.netuid}
            </div>
            <span className="text-xs text-white truncate">{selected.name}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-500">Select subnet…</span>
        )}
        {open ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl bg-slate-900 border border-white/[0.1] shadow-xl">
          {options.map((opt) => (
            <button
              key={opt.netuid}
              onClick={() => { onChange(opt.netuid); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.06] transition-colors",
                opt.netuid === value && "bg-white/[0.04]",
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white",
                  `bg-gradient-to-br ${subnetGradient(opt.netuid)}`,
                )}
              >
                {opt.netuid}
              </div>
              <span className="text-xs text-slate-300 truncate">{opt.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricDelta({ label, current, projected, suffix = "", higherIsBetter = true }: {
  label: string;
  current: string;
  projected: string;
  suffix?: string;
  higherIsBetter?: boolean;
}) {
  const curNum = parseFloat(current);
  const projNum = parseFloat(projected);
  const delta = projNum - curNum;
  const isPositive = higherIsBetter ? delta > 0 : delta < 0;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400 tabular-nums">{current}{suffix}</span>
        <ArrowRight className="w-3 h-3 text-slate-600" />
        <span className={cn("text-xs font-semibold tabular-nums", isPositive ? "text-emerald-300" : delta === 0 ? "text-slate-400" : "text-rose-400")}>
          {projected}{suffix}
        </span>
        {delta !== 0 && (
          <span className={cn("text-[10px] font-semibold", isPositive ? "text-emerald-400" : "text-rose-400")}>
            ({delta > 0 ? "+" : ""}{delta.toFixed(2)}{suffix})
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Main component                                                        */
/* ─────────────────────────────────────────────────────────────────── */

export function ReallocationSimulator({ allocations, subnets, totalStakedTao }: ReallocationSimulatorProps) {
  const [fromNetuid, setFromNetuid] = useState<number | null>(null);
  const [toNetuid, setToNetuid] = useState<number | null>(null);
  const [amountTao, setAmountTao] = useState(0.5);
  const [showDetails, setShowDetails] = useState(false);

  const subnetMap = useMemo(() => {
    const map = new Map<number, SubnetDetailModel>();
    subnets.forEach((s) => map.set(s.netuid, s));
    return map;
  }, [subnets]);

  const allocationMap = useMemo(() => {
    const map = new Map<number, AllocationModel>();
    allocations.forEach((a) => map.set(a.netuid, a));
    return map;
  }, [allocations]);

  // Subnet options for selectors
  const fromOptions = allocations.map((a) => ({ netuid: a.netuid, name: a.name }));
  const toOptions = subnets
    .filter((s) => s.netuid !== fromNetuid)
    .map((s) => ({ netuid: s.netuid, name: s.name }));

  // Max amount based on selected source
  const maxAmount = fromNetuid ? (allocationMap.get(fromNetuid)?.amountTao ?? 0) : 0;

  // Simulation result
  const result = useMemo<SimResult | null>(() => {
    if (!fromNetuid || !toNetuid || amountTao <= 0 || amountTao > maxAmount) return null;

    const fromSubnet = subnetMap.get(fromNetuid);
    const toSubnet = subnetMap.get(toNetuid);
    if (!fromSubnet || !toSubnet) return null;

    // Current weighted yield
    const currentYield = allocations.reduce((acc, a) => acc + a.yield * a.fraction, 0);

    // Build projected allocations
    const projected = allocations.map((a) => {
      let newAmount = a.amountTao;
      if (a.netuid === fromNetuid) newAmount -= amountTao;
      if (a.netuid === toNetuid) newAmount += amountTao;
      return { ...a, amountTao: newAmount };
    });

    // Add toNetuid if not already in allocations
    if (!projected.find((p) => p.netuid === toNetuid)) {
      projected.push({
        netuid: toNetuid,
        name: toSubnet.name,
        symbol: `τ${toNetuid}`,
        amountTao,
        fraction: 0,
        yield: toSubnet.yield,
        yieldDelta7d: toSubnet.yieldDelta7d,
        value: 0,
        earnings7d: 0,
        color: "#64748b",
      });
    }

    // Recalculate fractions
    const totalTao = projected.reduce((acc, p) => acc + p.amountTao, 0);
    projected.forEach((p) => { p.fraction = totalTao > 0 ? p.amountTao / totalTao : 0; });

    // Projected weighted yield — use subnet yield data
    const projectedYield = projected.reduce((acc, p) => {
      const subnetYield = subnetMap.get(p.netuid)?.yield ?? p.yield;
      return acc + subnetYield * p.fraction;
    }, 0);

    // Risk scores
    const currentFractions = allocations.map((a) => a.fraction);
    const projectedFractions = projected.filter((p) => p.amountTao > 0).map((p) => p.fraction);
    const currentDiversification = computeDiversification(currentFractions);
    const projectedDiversification = computeDiversification(projectedFractions);

    return {
      currentYield: +currentYield.toFixed(2),
      projectedYield: +projectedYield.toFixed(2),
      yieldDelta: +(projectedYield - currentYield).toFixed(2),
      currentRisk: riskLabel(currentDiversification),
      projectedRisk: riskLabel(projectedDiversification),
      allocations: projected
        .filter((p) => p.amountTao > 0)
        .map((p) => ({
          netuid: p.netuid,
          name: p.name,
          current: allocationMap.get(p.netuid)?.amountTao ?? 0,
          projected: p.amountTao,
          yieldPct: subnetMap.get(p.netuid)?.yield ?? p.yield,
        })),
    };
  }, [fromNetuid, toNetuid, amountTao, maxAmount, allocations, subnetMap, allocationMap]);

  const handleReset = useCallback(() => {
    setFromNetuid(null);
    setToNetuid(null);
    setAmountTao(0.5);
    setShowDetails(false);
  }, []);

  const canSimulate = fromNetuid !== null && toNetuid !== null && amountTao > 0 && amountTao <= maxAmount;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 28px rgba(0,0,0,0.28)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Calculator className="w-4 h-4 text-amber-300" />
        <span className="text-[11px] uppercase tracking-[0.12em] text-amber-300 font-semibold">
          Reallocation Simulator
        </span>
      </div>
      <p className="text-sm text-slate-400 mb-5">
        Model &ldquo;what if&rdquo; scenarios before moving your stake.
      </p>

      {/* Move builder */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 mb-5">
        <SubnetSelector label="Move from" value={fromNetuid} options={fromOptions} onChange={setFromNetuid} />
        <div className="hidden sm:flex items-end justify-center pb-2.5">
          <ArrowRight className="w-5 h-5 text-slate-600" />
        </div>
        <SubnetSelector label="Move to" value={toNetuid} options={toOptions} onChange={setToNetuid} />
      </div>

      {/* Amount slider */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-600">Amount</span>
          <span className="text-xs font-semibold text-white tabular-nums">{amountTao.toFixed(2)} τ</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAmountTao(Math.max(0.01, amountTao - 0.1))}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
          >
            <Minus className="w-3 h-3 text-slate-400" />
          </button>
          <input
            type="range"
            min={0.01}
            max={maxAmount || 1}
            step={0.01}
            value={amountTao}
            onChange={(e) => setAmountTao(parseFloat(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none bg-white/[0.08] accent-cyan-400"
          />
          <button
            onClick={() => setAmountTao(Math.min(maxAmount, amountTao + 0.1))}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
          >
            <Plus className="w-3 h-3 text-slate-400" />
          </button>
        </div>
        {fromNetuid && (
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-slate-600">0.01 τ</span>
            <span className="text-[10px] text-slate-600">Max: {maxAmount.toFixed(2)} τ</span>
          </div>
        )}
      </div>

      {/* Results */}
      {canSimulate && result && (
        <div className="rounded-xl border border-white/[0.06] bg-black/10 p-4">
          {/* Impact summary */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">Yield Impact</div>
              <div className={cn("text-lg font-bold tabular-nums", result.yieldDelta > 0 ? "text-emerald-300" : result.yieldDelta < 0 ? "text-rose-400" : "text-slate-400")}>
                {result.yieldDelta > 0 ? "+" : ""}{result.yieldDelta}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">Projected Yield</div>
              <div className="text-lg font-bold text-white tabular-nums">{result.projectedYield}%</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">Risk Profile</div>
              <div className={cn("text-sm font-semibold", riskColor(result.projectedRisk === "Conservative" ? 80 : result.projectedRisk === "Moderate" ? 60 : 30))}>
                {result.projectedRisk}
              </div>
            </div>
          </div>

          {/* Before/after metrics */}
          <div className="border-t border-white/[0.06] pt-3">
            <MetricDelta label="Weighted yield" current={String(result.currentYield)} projected={String(result.projectedYield)} suffix="%" />
            <MetricDelta label="Risk profile" current={result.currentRisk} projected={result.projectedRisk} suffix="" />
          </div>

          {/* Allocation details (collapsible) */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 mt-3 text-[10px] uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showDetails ? "Hide" : "Show"} allocation breakdown
          </button>

          {showDetails && (
            <div className="mt-3 space-y-0">
              {result.allocations.map((a) => (
                <div key={a.netuid} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white",
                        `bg-gradient-to-br ${subnetGradient(a.netuid)}`,
                      )}
                    >
                      {a.netuid}
                    </div>
                    <span className="text-xs text-slate-400">{a.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 tabular-nums">{a.current.toFixed(2)}τ</span>
                    <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
                    <span className={cn(
                      "text-xs font-semibold tabular-nums",
                      a.projected > a.current ? "text-emerald-300" : a.projected < a.current ? "text-rose-400" : "text-slate-400",
                    )}>
                      {a.projected.toFixed(2)}τ
                    </span>
                    <span className="text-[10px] text-slate-600 ml-1">({a.yieldPct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={handleReset}
          className="btn-ghost text-xs gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
        {canSimulate && result && result.yieldDelta > 0 && (
          <div className="flex items-center gap-2 ml-auto text-[11px] text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>This move would improve your portfolio yield by {result.yieldDelta}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
