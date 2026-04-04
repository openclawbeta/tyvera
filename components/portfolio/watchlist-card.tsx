"use client";

import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { cn, subnetGradient, scoreColor } from "@/lib/utils";
import type { WatchlistItemModel as WatchlistItem } from "@/lib/types/portfolio";

interface WatchlistCardProps {
  items: WatchlistItem[];
}

export function WatchlistCard({ items }: WatchlistCardProps) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.netuid}
          className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.09] transition-all duration-200 cursor-pointer"
        >
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
            `bg-gradient-to-br ${subnetGradient(item.netuid)}`,
          )}>
            {item.netuid}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white truncate">{item.name}</span>
              {item.alert && (
                <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
              )}
            </div>
            {item.alert && (
              <span className="text-[10px] text-amber-400/70">{item.alert}</span>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-xs font-mono font-semibold text-white">{item.yield}%</div>
            <div className={cn(
              "flex items-center gap-0.5 text-[10px] justify-end",
              item.yieldDelta7d >= 0 ? "text-emerald-400" : "text-rose-400",
            )}>
              {item.yieldDelta7d >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {item.yieldDelta7d >= 0 ? "+" : ""}{item.yieldDelta7d}%
            </div>
          </div>

          <div className={cn("text-xs font-bold w-6 text-right", scoreColor(item.score))}>
            {item.score}
          </div>
        </div>
      ))}
    </div>
  );
}
