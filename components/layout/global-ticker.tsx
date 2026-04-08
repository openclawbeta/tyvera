"use client";

import { useEffect, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { TICKER_REFRESH_MS } from "@/lib/config";

interface TickerData {
  taoUsd: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  blockHeight: number | null;
  fetchedAt: string | null;
  fallback: boolean;
}

interface SubnetData {
  netuid: number;
  name: string;
  symbol: string;
}

export function GlobalTicker() {
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [subnetCount, setSubnetCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Fetch ticker data
  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const res = await fetchWithTimeout("/api/tao-rate", { timeoutMs: 8_000 });
        if (!res.ok) throw new Error("Failed to fetch ticker");
        const data: TickerData = await res.json();
        if (typeof data.taoUsd === "number" && data.taoUsd > 0) {
          setTicker(data);
        }
        setIsLoading(false);
      } catch {
        setIsLoading(false);
        // Keep previous ticker data if available — don't clear on error
      }
    };

    fetchTicker();

    // Poll every 60 seconds
    const interval = setInterval(fetchTicker, TICKER_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  // Fetch subnet count
  useEffect(() => {
    const fetchSubnets = async () => {
      try {
        const res = await fetchWithTimeout("/api/subnets", { timeoutMs: 10_000 });
        if (!res.ok) throw new Error("Failed to fetch subnets");
        const data: SubnetData[] = await res.json();
        setSubnetCount(data.length);
      } catch (err) {
        /* subnet count fetch failed — ticker renders without it */
      }
    };

    fetchSubnets();
  }, []);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isLoading && !ticker) {
    return (
      <div
        className="fixed top-0 right-0 left-0 lg:left-60 h-8 z-30 flex items-center px-4 gap-4 text-xs text-slate-500"
        style={{
          background: "rgba(0,0,0,0.85)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!ticker) {
    return null;
  }

  const isPositive = ticker.change24h >= 0;
  const changeColor = isPositive ? "#10b981" : "#ef4444";
  const changeArrow = isPositive ? "▲" : "▼";
  const changeAbs = Math.abs(ticker.change24h);

  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(2)}B`;
    }
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatBlockHeight = (): string => {
    if (ticker.blockHeight && ticker.blockHeight > 0) {
      return ticker.blockHeight.toLocaleString();
    }
    return "—";
  };

  // Mobile: Show only price and 24h change
  if (isMobile) {
    return (
      <div
        className="fixed top-0 right-0 left-0 lg:left-60 h-8 z-30 flex items-center px-4 gap-3 font-mono text-xs text-white"
        style={{
          background: "rgba(0,0,0,0.85)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <span className="text-sm font-semibold">τ</span>
        <span className="text-sm font-semibold">${ticker.taoUsd.toFixed(2)}</span>
        <span
          className="font-mono text-xs flex items-center gap-1"
          style={{ color: changeColor }}
        >
          {changeArrow} {changeAbs.toFixed(2)}%
        </span>
      </div>
    );
  }

  // Desktop: Full ticker with all metrics
  return (
    <div
      className="fixed top-0 right-0 left-0 lg:left-60 h-8 z-30 flex items-center px-4 gap-4 font-mono text-xs text-slate-300 overflow-hidden"
      style={{
        background: "rgba(0,0,0,0.85)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* TAO Price + 24h Change */}
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span style={{ color: "#ffffff" }}>τ</span>
        <span
          className="font-semibold"
          style={{ color: "#ffffff", fontSize: "13px" }}
        >
          ${ticker.taoUsd.toFixed(2)}
        </span>
        <span
          className="flex items-center gap-0.5"
          style={{ color: changeColor, fontSize: "11px" }}
        >
          {changeArrow} {changeAbs.toFixed(2)}%
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.08)" }} />

      {/* Market Cap */}
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span style={{ color: "rgba(255,255,255,0.6)" }}>MCap:</span>
        <span style={{ color: "#ffffff" }}>{formatCurrency(ticker.marketCap)}</span>
      </div>

      {/* Divider */}
      <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.08)" }} />

      {/* 24hr Volume */}
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span style={{ color: "rgba(255,255,255,0.6)" }}>Vol:</span>
        <span style={{ color: "#ffffff" }}>{formatCurrency(ticker.volume24h)}</span>
      </div>

      {/* Divider */}
      <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.08)" }} />

      {/* Block Height */}
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span style={{ color: "rgba(255,255,255,0.6)" }}>Block:</span>
        <span style={{ color: "#ffffff" }}>{formatBlockHeight()}</span>
      </div>

      {/* Divider */}
      <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.08)" }} />

      {/* Active Subnets */}
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span style={{ color: "rgba(255,255,255,0.6)" }}>Subnets:</span>
        <span style={{ color: "#ffffff" }}>{subnetCount}</span>
      </div>
    </div>
  );
}
