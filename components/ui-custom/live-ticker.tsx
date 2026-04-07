"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SubnetTicker {
  label: string;
  yieldRate: string;
  delta: number;
}

function TickerItem({ label, yieldRate, delta }: { label: string; yieldRate: string; delta: number }) {
  const isPos = delta >= 0;
  return (
    <div className="flex items-center gap-2.5 px-4 flex-shrink-0" style={{ borderRight: "1px solid rgba(255,255,255,0.045)" }}>
      <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap tracking-tight">
        {label}
      </span>
      <span className="text-[11px] font-bold text-white font-mono tabular-nums">
        {yieldRate}
      </span>
      <span
        className={cn(
          "text-[10px] font-semibold tabular-nums",
          isPos ? "text-emerald-400" : "text-rose-400",
        )}
      >
        {isPos ? "▲" : "▼"}{"\u2009"}{Math.abs(delta).toFixed(1)}%
      </span>
    </div>
  );
}

export function LiveTicker() {
  const [items, setItems] = useState<SubnetTicker[]>([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const fetchSubnets = async () => {
      try {
        const res = await fetch("/api/subnets");
        if (!res.ok) throw new Error("Failed to fetch subnets");

        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return;

        // Sort by yield descending, take top 16
        const sorted = [...data]
          .filter((s: any) => typeof s.yield === "number" && s.yield > 0)
          .sort((a: any, b: any) => b.yield - a.yield)
          .slice(0, 16);

        const mapped: SubnetTicker[] = sorted.map((s: any) => ({
          label: `SN${s.netuid} · ${s.name}`,
          yieldRate: `${Number(s.yield).toFixed(1)}%`,
          delta: Number(s.yieldDelta7d ?? 0),
        }));

        if (mapped.length > 0) {
          setItems(mapped);
          setIsLive(true);
        }
      } catch {
        // Keep whatever data we have — don't clear on error
      }
    };

    fetchSubnets();
    // Refresh every 5 minutes (matches API cache TTL)
    const interval = setInterval(fetchSubnets, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Don't render until we have data
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 min-w-0 w-full">
        <div className="flex items-center gap-1.5 flex-shrink-0 pr-3" style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          <span className="font-semibold text-slate-600 uppercase" style={{ fontSize: "9px", letterSpacing: "0.1em" }}>
            Loading
          </span>
        </div>
      </div>
    );
  }

  // Duplicate for seamless scroll
  const scrollItems = [...items, ...items];

  return (
    <div className="flex items-center gap-3 min-w-0 w-full">
      {/* Live indicator */}
      <div className="flex items-center gap-1.5 flex-shrink-0 pr-3" style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}>
        <span
          className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot"
          style={{ boxShadow: "0 0 5px rgba(52,211,153,0.6)" }}
        />
        <span
          className="font-semibold text-slate-600 uppercase"
          style={{ fontSize: "9px", letterSpacing: "0.1em" }}
        >
          {isLive ? "Live" : "Loading"}
        </span>
      </div>

      {/* Scrolling strip */}
      <div className="flex-1 overflow-hidden min-w-0">
        <div className="ticker-track inline-flex min-w-max whitespace-nowrap will-change-transform">
          {scrollItems.map((item, i) => (
            <TickerItem
              key={i}
              label={item.label}
              yieldRate={item.yieldRate}
              delta={item.delta}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
