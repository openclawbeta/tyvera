"use client";

import { cn } from "@/lib/utils";
import type { AllocationModel as Allocation } from "@/lib/types/portfolio";

interface AllocationBarListProps {
  allocations: Allocation[];
}

export function AllocationBarList({ allocations }: AllocationBarListProps) {
  return (
    <div className="space-y-3">
      {allocations.map((a) => (
        <div key={a.netuid} className="group">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: a.color }}
              />
              <span className="text-xs font-medium text-slate-300">{a.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400">{a.amountTao.toFixed(2)} τ</span>
              <span className="text-xs font-semibold text-white w-10 text-right">
                {(a.fraction * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${a.fraction * 100}%`,
                background: a.color,
                boxShadow: `0 0 8px ${a.color}50`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
