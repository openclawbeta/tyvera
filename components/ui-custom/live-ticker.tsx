"use client";

import { cn } from "@/lib/utils";

const TICKER_ITEMS = [
  { label: "SN1 · Text Prompting",    yield: "24.3%", delta: +1.2 },
  { label: "SN49 · Protein Folding",  yield: "26.7%", delta: +0.4 },
  { label: "SN18 · Image Gen",        yield: "23.0%", delta: +1.8 },
  { label: "SN25 · Code Execution",   yield: "22.1%", delta: +1.5 },
  { label: "SN4 · Multi-Modality",    yield: "21.7%", delta: +0.8 },
  { label: "SN8 · Time Series",       yield: "19.4%", delta: +2.6 },
  { label: "SN21 · Embedding",        yield: "18.6%", delta: +0.3 },
  { label: "SN32 · Audio Synth",      yield: "17.8%", delta: -1.0 },
  { label: "SN3 · Data Scraping",     yield: "15.0%", delta: -2.1 },
  { label: "SN19 · Video Gen",        yield: "28.4%", delta: -3.2 },
  { label: "SN40 · Prediction",       yield: "32.1%", delta: -8.4 },
  { label: "SN11 · Storage",          yield: "13.2%", delta: -0.4 },
];

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
        {isPos ? "▲" : "▼"}&thinsp;{Math.abs(delta).toFixed(1)}%
      </span>
    </div>
  );
}

export function LiveTicker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

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
          Live
        </span>
      </div>

      {/* Scrolling strip */}
      <div className="flex-1 overflow-hidden min-w-0">
        <div className="ticker-track inline-flex min-w-max whitespace-nowrap will-change-transform">
          {items.map((item, i) => (
            <TickerItem
              key={i}
              label={item.label}
              yieldRate={item.yield}
              delta={item.delta}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
