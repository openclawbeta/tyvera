"use client";

import { useEffect, useState } from "react";

interface TickerData {
  taoUsd: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
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
        const res = await fetch("/api/tao-rate");
        if (!res.ok) throw new Error("Failed to fetch ticker");
        const data: TickerData = await res.json();
        setTicker(data);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching ticker:", err);
        setIsLoading(false);
      }
    };

    fetchTicker();

    // Poll every 60 seconds
    const interval = setInterval(fetchTicker, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch subnet count
  useEffect(() => {
    const fetchSubnets = async () => {
      try {
        const res = await fetch("/api/subnets");
        if (!res.ok) throw new Error("Failed to fetch subnets");
        const data: SubnetData[] = await res.json();
        setSubnetCount(data.length);
      } catch (err) {
        console.error("Error fetching subnets:", err);
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
        className="h-8 flex items-center px-4 gap-4 text-xs text-slate-500"
        style={{
          background: "rgba(0,0,0,0.4)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
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
    // Placeholder: "7914629" (will be replaced if an API is added)
    return "7914629";
  };

  // Mobile: Show only price and 24h change
  if (isMobile) {
    return (
      <div
        className="h-8 flex items-center px-4 gap-3 font-mono text-xs text-white flex-shrink-0"
        style={{
          background: "rgba(0,0,0,0.4)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
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
      className="h-8 flex items-center px-4 gap-4 font-mono text-xs text-slate-300 flex-shrink-0 overflow-hidden"
      style={{
        background: "rgba(0,0,0,0.4)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
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
