"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BarChart3, Calendar, Lock, TrendingUp } from "lucide-react";
import { cn, subnetGradient } from "@/lib/utils";
import type { SubnetDetailModel } from "@/lib/types/subnets";
import type { Tier } from "@/lib/types/tiers";

/* ─────────────────────────────────────────────────────────────────── */
/* Types                                                                 */
/* ─────────────────────────────────────────────────────────────────── */

interface SubnetHistoryPanelProps {
  subnet: SubnetDetailModel;
  tier: Tier;
}

type MetricKey = "yield" | "emissions" | "liquidity" | "stakers";
type RangeKey = "30d" | "90d" | "365d";

interface HistoryPoint {
  label: string;
  yield: number;
  emissions: number;
  liquidity: number;
  stakers: number;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Synthetic history generator                                           */
/*                                                                       */
/* Phase 6 will replace this with real chain data.                       */
/* For now, generates plausible time series from subnet snapshot.        */
/* ─────────────────────────────────────────────────────────────────── */

function generateHistory(subnet: SubnetDetailModel, days: number): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  const now = Date.now();
  const dayMs = 86_400_000;

  for (let i = days; i >= 0; i--) {
    const t = i / days;
    const noise = Math.sin(i * 0.7) * 0.15 + Math.cos(i * 1.3) * 0.1;
    const trend = (1 - t) * 0.2; // slight upward trend toward present

    const date = new Date(now - i * dayMs);
    const label = days <= 30
      ? `${date.getMonth() + 1}/${date.getDate()}`
      : days <= 90
      ? `${date.getMonth() + 1}/${date.getDate()}`
      : `${date.toLocaleString("default", { month: "short" })} ${date.getDate()}`;

    points.push({
      label,
      yield: +(subnet.yield * (0.8 + trend + noise * 0.3)).toFixed(2),
      emissions: +(subnet.emissions * (0.7 + trend + noise * 0.25)).toFixed(2),
      liquidity: Math.round(subnet.liquidity * (0.6 + trend + noise * 0.2)),
      stakers: Math.round(subnet.stakers * (0.5 + trend * 1.5 + noise * 0.1)),
    });
  }
  return points;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Chart tooltip                                                         */
/* ─────────────────────────────────────────────────────────────────── */

const METRIC_CONFIG: Record<MetricKey, { label: string; color: string; suffix: string; format: (v: number) => string }> = {
  yield:     { label: "Yield",     color: "#22d3ee", suffix: "%",  format: (v) => `${v}%` },
  emissions: { label: "Emissions", color: "#8b5cf6", suffix: " τ", format: (v) => `${v} τ` },
  liquidity: { label: "Liquidity", color: "#10b981", suffix: " τ", format: (v) => `${v.toLocaleString()} τ` },
  stakers:   { label: "Stakers",   color: "#f59e0b", suffix: "",   format: (v) => v.toLocaleString() },
};

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="glass px-3 py-2.5 text-xs space-y-1 min-w-[120px]">
      <p className="text-slate-400 font-semibold">{point.label}</p>
      {payload.map((entry: any) => {
        const key = entry.dataKey as MetricKey;
        const config = METRIC_CONFIG[key];
        return (
          <div key={key} className="flex items-center justify-between gap-4">
            <span className="text-slate-500">{config?.label ?? key}</span>
            <span className="font-semibold text-white">{config?.format(entry.value) ?? entry.value}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Range gate helper                                                     */
/* ─────────────────────────────────────────────────────────────────── */

const RANGE_TIER_REQUIREMENTS: Record<RangeKey, Tier[]> = {
  "30d":  ["analyst", "strategist", "institutional"],
  "90d":  ["strategist", "institutional"],
  "365d": ["institutional"],
};

function rangeAllowed(range: RangeKey, tier: Tier): boolean {
  return RANGE_TIER_REQUIREMENTS[range].includes(tier);
}

function minTierForRange(range: RangeKey): string {
  if (range === "30d") return "Analyst";
  if (range === "90d") return "Strategist";
  return "Institutional";
}

/* ─────────────────────────────────────────────────────────────────── */
/* Main component                                                        */
/* ─────────────────────────────────────────────────────────────────── */

export function SubnetHistoryPanel({ subnet, tier }: SubnetHistoryPanelProps) {
  const [range, setRange] = useState<RangeKey>("30d");
  const [metric, setMetric] = useState<MetricKey>("yield");

  const rangeDays: Record<RangeKey, number> = { "30d": 30, "90d": 90, "365d": 365 };
  const allowed = rangeAllowed(range, tier);

  const data = useMemo(
    () => (allowed ? generateHistory(subnet, rangeDays[range]) : []),
    [subnet, range, allowed],
  );

  // Summary stats
  const summary = useMemo(() => {
    if (!data.length) return null;
    const values = data.map((d) => d[metric]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const current = values[values.length - 1];
    const start = values[0];
    const change = current - start;
    return { min, max, avg: +avg.toFixed(2), current, change: +change.toFixed(2) };
  }, [data, metric]);

  const config = METRIC_CONFIG[metric];

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
      <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-violet-300" />
            <span className="text-[11px] uppercase tracking-[0.12em] text-violet-300 font-semibold">
              Historical Analytics
            </span>
          </div>
          <p className="text-sm text-slate-400">
            {subnet.name} — SN{subnet.netuid}
          </p>
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-1.5">
          {(["30d", "90d", "365d"] as RangeKey[]).map((r) => {
            const isAllowed = rangeAllowed(r, tier);
            return (
              <button
                key={r}
                onClick={() => isAllowed && setRange(r)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors",
                  r === range && isAllowed
                    ? "bg-violet-500/20 text-violet-300 border border-violet-400/30"
                    : isAllowed
                    ? "bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:text-slate-300"
                    : "bg-white/[0.02] text-slate-700 border border-white/[0.04] cursor-not-allowed",
                )}
              >
                <span className="flex items-center gap-1">
                  {!isAllowed && <Lock className="w-2.5 h-2.5" />}
                  {r}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Metric selector */}
      <div className="flex items-center gap-2 mb-4">
        {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setMetric(key)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors",
              key === metric
                ? "bg-white/[0.08] text-white border border-white/[0.12]"
                : "text-slate-500 hover:text-slate-300",
            )}
          >
            {METRIC_CONFIG[key].label}
          </button>
        ))}
      </div>

      {/* Lock screen for unavailable ranges */}
      {!allowed ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <Lock className="w-6 h-6 text-amber-400/60 mb-3" />
          <p className="text-sm font-semibold text-white mb-1">
            {range} history requires {minTierForRange(range)}
          </p>
          <p className="text-xs text-slate-500">
            Upgrade your plan to unlock extended historical data.
          </p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="rounded-xl bg-black/10 border border-white/[0.05] p-3">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id={`histGrad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={config.color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={config.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#475569", fontSize: 9 }}
                  interval={Math.max(0, Math.floor(data.length / 8) - 1)}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#475569", fontSize: 9 }}
                  tickFormatter={(v) => metric === "liquidity" || metric === "stakers" ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                />
                <Tooltip content={ChartTooltip} />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke={config.color}
                  strokeWidth={1.5}
                  fill={`url(#histGrad-${metric})`}
                  dot={false}
                  activeDot={{ r: 4, fill: config.color, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Summary stats */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
              {[
                { label: "Current", value: config.format(summary.current) },
                { label: "Average", value: config.format(summary.avg) },
                { label: "Min", value: config.format(summary.min) },
                { label: "Max", value: config.format(summary.max) },
                { label: "Change", value: `${summary.change > 0 ? "+" : ""}${config.format(summary.change)}`, positive: summary.change > 0 },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-3 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-slate-600 mb-1">{stat.label}</div>
                  <div className={cn(
                    "text-sm font-bold tabular-nums",
                    stat.label === "Change"
                      ? stat.positive ? "text-emerald-300" : "text-rose-400"
                      : "text-white",
                  )}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
