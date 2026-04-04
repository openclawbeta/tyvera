"use client";

import { cn, subnetGradient } from "@/lib/utils";
import { MetricPill } from "@/components/ui-custom/metric-pill";
import type { AllocationModel as Allocation } from "@/lib/types/portfolio";

interface HoldingsListProps {
  allocations: Allocation[];
}

export function HoldingsList({ allocations }: HoldingsListProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.05]">
            {["Subnet", "Staked", "Allocation", "Est. APR", "7d Δ", "7d Earnings"].map((h) => (
              <th key={h} className="pb-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider first:pl-0 last:text-right">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allocations.map((a, i) => (
            <tr key={a.netuid} className="data-row group">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
                    `bg-gradient-to-br ${subnetGradient(a.netuid)}`,
                  )}>
                    {a.netuid}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{a.name}</div>
                    <div className="text-[10px] text-slate-600 font-mono">{a.symbol}</div>
                  </div>
                </div>
              </td>
              <td className="py-3 pr-4">
                <span className="text-sm font-mono text-white">{a.amountTao.toFixed(2)} τ</span>
              </td>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${a.fraction * 100}%`, background: a.color }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{(a.fraction * 100).toFixed(1)}%</span>
                </div>
              </td>
              <td className="py-3 pr-4">
                <span className="text-sm font-mono text-white">{a.yield.toFixed(1)}%</span>
              </td>
              <td className="py-3 pr-4">
                <MetricPill value={a.yieldDelta7d} size="xs" />
              </td>
              <td className="py-3 text-right">
                <span className="text-xs font-mono text-emerald-400">+{a.earnings7d.toFixed(4)} τ</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
