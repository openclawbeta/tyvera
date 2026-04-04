"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, BookmarkCheck, TrendingUp, TrendingDown, Users, Layers, Zap, BarChart2, Eye } from "lucide-react";
import { cn, subnetGradient, scoreBg, riskBg, formatLargeNumber } from "@/lib/utils";
import { MetricPill } from "@/components/ui-custom/metric-pill";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import type { SubnetDetailModel as Subnet } from "@/lib/types/subnets";

interface SubnetDetailPreviewProps {
  subnet: Subnet | null;
}

export function SubnetDetailPreview({ subnet }: SubnetDetailPreviewProps) {
  if (!subnet) {
    return (
      <div className="glass h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-4">
          <Eye className="w-5 h-5 text-slate-600" />
        </div>
        <p className="text-sm font-medium text-slate-400 mb-1">Select a subnet</p>
        <p className="text-xs text-slate-600">Click any subnet card to see detailed analytics and stats.</p>
      </div>
    );
  }

  const chartData = subnet.momentum.map((value, i) => ({
    label: `d${i + 1}`,
    value,
  }));

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={subnet.id}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: 0.25 }}
        className="glass h-full flex flex-col overflow-auto"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0",
              `bg-gradient-to-br ${subnetGradient(subnet.netuid)}`,
            )}>
              {subnet.netuid}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white">{subnet.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">SN{subnet.netuid} · {subnet.category}</p>
                </div>
                <button className="text-slate-600 hover:text-cyan-400 transition-colors mt-0.5">
                  {subnet.isWatched
                    ? <BookmarkCheck className="w-4 h-4 text-cyan-400" />
                    : <Bookmark className="w-4 h-4" />
                  }
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={cn("tag border text-[10px] font-bold", scoreBg(subnet.score))}>Score {subnet.score}</span>
                <span className={cn("tag border text-[10px]", riskBg(subnet.risk))}>{subnet.risk}</span>
                <span className="tag-slate text-[10px]">{subnet.age}d old</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Description */}
          <p className="text-xs text-slate-400 leading-relaxed">{subnet.description}</p>

          {/* Yield headline */}
          <div className="p-4 rounded-xl bg-cyan-400/[0.05] border border-cyan-400/[0.15]">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-cyan-300/60 uppercase tracking-wider mb-1">Est. APR</p>
                <p className="text-3xl font-bold text-white font-mono">{subnet.yield}%</p>
              </div>
              <MetricPill value={subnet.yieldDelta7d} />
            </div>
          </div>

          {/* 14d chart */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">14-Day Yield Trend</p>
            <SimpleLineChart
              data={chartData}
              color={subnet.yieldDelta7d >= 0 ? "#22d3ee" : "#f43f5e"}
              height={100}
              suffix="%"
              gradientId={`subnet-${subnet.netuid}`}
            />
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Layers, label: "Liquidity",      value: `${formatLargeNumber(subnet.liquidity)} τ` },
              { icon: Users,  label: "Stakers",        value: subnet.stakers.toLocaleString() },
              { icon: Zap,    label: "Daily Emissions", value: `${subnet.emissions} τ` },
              { icon: BarChart2, label: "Validator Take", value: `${subnet.validatorTake}%` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] text-slate-500">{label}</span>
                </div>
                <div className="text-sm font-bold text-white font-mono">{value}</div>
              </div>
            ))}
          </div>

          {/* Inflow */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">7-Day Net Inflow</p>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              {subnet.inflow >= 0
                ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                : <TrendingDown className="w-4 h-4 text-rose-400" />
              }
              <span className={cn("text-sm font-bold font-mono", subnet.inflow >= 0 ? "text-emerald-300" : "text-rose-300")}>
                {subnet.inflow >= 0 ? "+" : ""}{subnet.inflow} τ
              </span>
              <span className={cn("text-xs ml-auto", subnet.inflowPct >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {subnet.inflowPct >= 0 ? "+" : ""}{subnet.inflowPct}%
              </span>
            </div>
          </div>

          {/* Breakeven */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <span className="text-xs text-slate-400">Fee breakeven (move)</span>
            <span className="text-xs font-semibold text-white">~{subnet.breakeven} days</span>
          </div>
        </div>

        {/* CTA */}
        <div className="p-5 border-t border-white/[0.06]">
          <button className="w-full btn-primary justify-center py-2.5 text-sm">
            <Zap className="w-4 h-4" />
            View Full Analytics
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
