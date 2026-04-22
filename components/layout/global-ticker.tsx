"use client";

import { useEffect, useState } from "react";
import { Activity, CircleDot, Database, Layers3 } from "lucide-react";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { TICKER_REFRESH_MS } from "@/lib/config";

interface TickerData {
  taoUsd: number | null;
  change24h: number;
  marketCap: number;
  volume24h: number;
  blockHeight: number | null;
  fetchedAt: string | null;
  fallback: boolean;
  awaiting?: boolean;
  note?: string;
}

interface SubnetData {
  netuid: number;
  name: string;
  symbol: string;
}

// Chrome is driven by the `.global-ticker` CSS class (see globals.css) which
// carries the mode-aware background + border + shadow. That avoids the old
// bug where a hardcoded dark gradient collided with aurora-shell's
// dark-ink text overrides in light mode, producing dark-on-dark.

function MetricPill({
  icon,
  label,
  value,
  tone = "text-white",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.03] dark:border-white/8 dark:bg-white/[0.03] px-3 py-1.5 whitespace-nowrap">
      <span className="text-slate-500">{icon}</span>
      <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className={`text-[11px] font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

export function GlobalTicker() {
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [subnetCount, setSubnetCount] = useState<number>(0);
  // `isLoading` only flips true *after* mount so SSR renders a deterministic
  // neutral chrome instead of a "Loading market layer…" flash that briefly
  // appears on every navigation (flagged in customer POV review). The
  // awaiting-pricing-source state below serves as the graceful pre-data UI.
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const res = await fetchWithTimeout("/api/tao-rate", { timeoutMs: 8_000 });
        if (!res.ok) throw new Error("Failed to fetch ticker");
        const data: TickerData = await res.json();
        setTicker(data);
        setIsLoading(false);
      } catch {
        setIsLoading(false);
      }
    };

    fetchTicker();
    const interval = setInterval(fetchTicker, TICKER_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchSubnets = async () => {
      try {
        const res = await fetchWithTimeout("/api/subnets", { timeoutMs: 10_000 });
        if (!res.ok) throw new Error("Failed to fetch subnets");
        const raw = await res.json();
        const data: SubnetData[] = Array.isArray(raw) ? raw : raw?.subnets ?? [];
        setSubnetCount(data.length);
      } catch {
        /* noop */
      }
    };

    fetchSubnets();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatBlockHeight = (): string => {
    if (ticker?.blockHeight && ticker.blockHeight > 0) return ticker.blockHeight.toLocaleString();
    return "—";
  };

  // Initial SSR + pre-data state → skip the "Loading…" flash and render the
  // same neutral "awaiting pricing source" chrome we'll use if the fetch
  // actually returns no usable data. Identical shell, no copy swap on hydrate.
  if (isLoading || !ticker || ticker.awaiting || typeof ticker.taoUsd !== "number" || ticker.taoUsd <= 0) {
    return (
      <div className="global-ticker fixed left-0 right-0 top-0 z-30 h-8 px-3 lg:left-[248px] xl:left-[276px]">
        <div className="flex h-full items-center justify-between text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">τ</span>
            <span>Awaiting pricing source…</span>
          </div>
          <div className="hidden items-center gap-2 md:flex text-slate-500">
            <Database className="h-3.5 w-3.5" />
            source pending
          </div>
        </div>
      </div>
    );
  }

  const isPositive = ticker.change24h >= 0;
  const changeColor = isPositive ? "#34d399" : "#f87171";
  const changeAbs = Math.abs(ticker.change24h);
  const sourceLabel = ticker.fallback ? "Fallback" : "Primary";

  if (isMobile) {
    return (
      <div className="global-ticker fixed left-0 right-0 top-0 z-30 h-8 px-3 lg:left-[248px] xl:left-[276px]">
        <div className="flex h-full items-center justify-between gap-3 overflow-hidden text-[11px]">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="font-semibold text-white">τ ${ticker.taoUsd.toFixed(2)}</span>
            <span className="font-semibold" style={{ color: changeColor }}>
              {isPositive ? "+" : "-"}
              {changeAbs.toFixed(2)}%
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 whitespace-nowrap text-slate-500">
            <Layers3 className="h-3.5 w-3.5" />
            {subnetCount} subnets
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="global-ticker fixed left-0 right-0 top-0 z-30 h-8 px-3 lg:left-[248px] xl:left-[276px]">
      <div className="flex h-full items-center gap-2 overflow-hidden text-[11px] text-slate-300">
        <div className="flex items-center gap-2 whitespace-nowrap pl-1 pr-2">
          <span className="font-semibold text-white">τ ${ticker.taoUsd.toFixed(2)}</span>
          <span className="font-semibold" style={{ color: changeColor }}>
            {isPositive ? "+" : "-"}
            {changeAbs.toFixed(2)}%
          </span>
        </div>

        <div className="h-4 w-px bg-black/10 dark:bg-white/10" />

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <MetricPill icon={<Database className="h-3.5 w-3.5" />} label="Source" value={sourceLabel} tone={ticker.fallback ? "text-amber-300" : "text-emerald-300"} />
          <MetricPill icon={<Activity className="h-3.5 w-3.5" />} label="MCap" value={formatCurrency(ticker.marketCap)} />
          <MetricPill icon={<Activity className="h-3.5 w-3.5" />} label="Vol" value={formatCurrency(ticker.volume24h)} />
          <MetricPill icon={<CircleDot className="h-3.5 w-3.5" />} label="Block" value={formatBlockHeight()} />
          <MetricPill icon={<Layers3 className="h-3.5 w-3.5" />} label="Subnets" value={String(subnetCount)} />
        </div>
      </div>
    </div>
  );
}
