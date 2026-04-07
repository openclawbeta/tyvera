"use client";

import { cn } from "@/lib/utils";

const TICKER_ITEMS = [
  { label: "SN1 · Apex",              yield: "18.4%", delta: +0.6 },
  { label: "SN49 · Hivetrain",        yield: "24.2%", delta: +1.3 },
  { label: "SN18 · Cortex.t",         yield: "21.8%", delta: +1.2 },
  { label: "SN25 · Mainframe",        yield: "19.7%", delta: +0.9 },
  { label: "SN4 · Targon",            yield: "20.1%", delta: +0.4 },
  { label: "SN8 · Taoshi",            yield: "17.6%", delta: +2.1 },
  { label: "SN21 · OMEGA",            yield: "16.9%", delta: +0.8 },
  { label: "SN32 · ItsAI",            yield: "15.3%", delta: -0.5 },
  { label: "SN3 · Templar",           yield: "14.2%", delta: +1.8 },
  { label: "SN19 · Nineteen",         yield: "22.4%", delta: -1.2 },
  { label: "SN40 · Chunking",         yield: "18.7%", delta: -2.3 },
  { label: "SN11 · Transcription",    yield: "12.9%", delta: +0.5 },
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
