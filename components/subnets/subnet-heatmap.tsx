"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SubnetDetailModel } from "@/lib/types/subnets";

type ColorMetric = "change24h" | "change1w" | "emissions" | "risk";

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  subnet: SubnetDetailModel | null;
}

export function SubnetHeatmap({ subnets }: { subnets: SubnetDetailModel[] }) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    subnet: null,
  });
  const [colorMetric, setColorMetric] = useState<ColorMetric>("change24h");

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case "LOW":
        return "#22c55e";
      case "MODERATE":
        return "#eab308";
      case "HIGH":
        return "#f97316";
      case "SPECULATIVE":
        return "#ef4444";
      default:
        return "#334155";
    }
  };

  const getChangeColor = (value: number | undefined): string => {
    if (value === undefined || value === null) return "#334155";

    // Interpolate between red (-10%), neutral (0%), green (+10%)
    if (value <= -10) return "#ef4444";
    if (value >= 10) return "#22c55e";

    if (value < 0) {
      // Red gradient: #334155 (0%) to #ef4444 (-10%)
      const intensity = Math.abs(value) / 10;
      const r = Math.round(51 + (239 - 51) * intensity);
      const g = Math.round(65 + (68 - 65) * intensity);
      const b = Math.round(85 + (68 - 85) * intensity);
      return `rgb(${r}, ${g}, ${b})`;
    }

    if (value > 0) {
      // Green gradient: #334155 (0%) to #22c55e (+10%)
      const intensity = value / 10;
      const r = Math.round(51 + (34 - 51) * intensity);
      const g = Math.round(65 + (197 - 65) * intensity);
      const b = Math.round(85 + (94 - 85) * intensity);
      return `rgb(${r}, ${g}, ${b})`;
    }

    return "#334155";
  };

  const getEmissionsColor = (emissions: number): string => {
    // Low (#334155) to High (#22d3ee)
    const maxEmissions = Math.max(...subnets.map(s => s.emissions || 0)) || 1;
    const intensity = emissions / maxEmissions;

    const r = Math.round(51 + (34 - 51) * intensity);
    const g = Math.round(65 + (211 - 65) * intensity);
    const b = Math.round(85 + (238 - 85) * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getCellColor = (subnet: SubnetDetailModel): string => {
    switch (colorMetric) {
      case "change24h":
        return getChangeColor(subnet.change24h);
      case "change1w":
        return getChangeColor(subnet.change1w);
      case "emissions":
        return getEmissionsColor(subnet.emissions || 0);
      case "risk":
        return getRiskColor(subnet.risk);
      default:
        return "#334155";
    }
  };

  const maxLiquidity = Math.max(...subnets.map(s => s.liquidity || 1)) || 1;

  const handleMouseEnter = (
    subnet: SubnetDetailModel,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      subnet,
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, subnet: null });
  };

  const formatValue = (value: number | undefined): string => {
    if (value === undefined || value === null) return "—";
    if (Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + "M";
    if (Math.abs(value) >= 1000) return (value / 1000).toFixed(1) + "K";
    return value.toFixed(2);
  };

  return (
    <div className="w-full space-y-4">
      {/* Color Metric Toggle */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setColorMetric("change24h")}
          className={cn(
            "px-3 py-1 rounded text-sm font-medium transition-all",
            colorMetric === "change24h"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
              : "bg-slate-800/30 text-slate-400 border border-slate-700/50 hover:border-slate-600/50"
          )}
        >
          24h Change
        </button>
        <button
          onClick={() => setColorMetric("change1w")}
          className={cn(
            "px-3 py-1 rounded text-sm font-medium transition-all",
            colorMetric === "change1w"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
              : "bg-slate-800/30 text-slate-400 border border-slate-700/50 hover:border-slate-600/50"
          )}
        >
          1w Change
        </button>
        <button
          onClick={() => setColorMetric("emissions")}
          className={cn(
            "px-3 py-1 rounded text-sm font-medium transition-all",
            colorMetric === "emissions"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
              : "bg-slate-800/30 text-slate-400 border border-slate-700/50 hover:border-slate-600/50"
          )}
        >
          Emissions
        </button>
        <button
          onClick={() => setColorMetric("risk")}
          className={cn(
            "px-3 py-1 rounded text-sm font-medium transition-all",
            colorMetric === "risk"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
              : "bg-slate-800/30 text-slate-400 border border-slate-700/50 hover:border-slate-600/50"
          )}
        >
          Risk Level
        </button>
      </div>

      {/* Heatmap Grid */}
      <div
        className="grid gap-2 w-full"
        style={{
          gridAutoFlow: "dense",
          gridAutoRows: "minmax(80px, auto)",
        }}
      >
        {subnets.map((subnet) => {
          const liquidityFlex = (subnet.liquidity || 1) / maxLiquidity;
          const gridSpan = Math.max(1, Math.ceil(liquidityFlex * 3));

          return (
            <Link
              key={subnet.id}
              href={`/subnets/${subnet.netuid}`}
              className="contents"
            >
              <div
                style={{
                  gridColumn: `span ${gridSpan}`,
                  gridRow: `span ${gridSpan}`,
                  backgroundColor: getCellColor(subnet),
                }}
                onMouseEnter={(e) => handleMouseEnter(subnet, e)}
                onMouseLeave={handleMouseLeave}
                className={cn(
                  "relative rounded-lg p-3 cursor-pointer",
                  "transition-all duration-200",
                  "border border-slate-600/30 hover:border-cyan-500/50",
                  "flex flex-col justify-between overflow-hidden",
                  "hover:shadow-lg hover:shadow-cyan-500/20",
                  "group"
                )}
              >
                {/* Subtle gradient overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(6, 182, 212, 0.3), transparent)",
                  }}
                />

                <div className="relative z-10 flex flex-col gap-1">
                  {/* Subnet Name */}
                  <div className="text-sm font-semibold text-white truncate">
                    {subnet.name}
                  </div>

                  {/* NetUID */}
                  <div className="text-xs text-slate-400">
                    SN{subnet.netuid}
                  </div>
                </div>

                {/* 24h Change */}
                <div className="relative z-10">
                  <div
                    className={cn(
                      "text-sm font-medium",
                      (subnet.change24h ?? 0) >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    )}
                  >
                    {(subnet.change24h ?? 0) >= 0 ? "+" : ""}
                    {(subnet.change24h ?? 0).toFixed(1)}%
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.subnet && (
        <div
          className={cn(
            "fixed z-50 bg-slate-900/95 border border-slate-700/50 rounded-lg p-4",
            "shadow-xl backdrop-blur-sm pointer-events-none"
          )}
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: "translate(-50%, -100%)",
            maxWidth: "280px",
          }}
        >
          <div className="space-y-2">
            {/* Name and NetUID */}
            <div>
              <div className="font-semibold text-white text-sm">
                {tooltip.subnet.name}
              </div>
              <div className="text-xs text-slate-400">
                SN{tooltip.subnet.netuid}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-700/30" />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-slate-500 uppercase tracking-wide">
                  Emissions
                </div>
                <div className="text-cyan-300 font-medium">
                  {formatValue(tooltip.subnet.emissions)}
                </div>
              </div>
              <div>
                <div className="text-slate-500 uppercase tracking-wide">
                  Yield
                </div>
                <div className="text-slate-300 font-medium">
                  {(tooltip.subnet.yield ?? 0).toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-slate-500 uppercase tracking-wide">
                  Liquidity
                </div>
                <div className="text-slate-300 font-medium">
                  ${formatValue(tooltip.subnet.liquidity)}
                </div>
              </div>
              <div>
                <div className="text-slate-500 uppercase tracking-wide">
                  Risk
                </div>
                <div
                  className="font-medium"
                  style={{ color: getRiskColor(tooltip.subnet.risk) }}
                >
                  {tooltip.subnet.risk}
                </div>
              </div>
            </div>

            {/* 24h Change */}
            <div className="text-xs">
              <div className="text-slate-500 uppercase tracking-wide">
                24h Change
              </div>
              <div
                className="font-medium"
                style={{
                  color: getChangeColor(tooltip.subnet.change24h),
                }}
              >
                {(tooltip.subnet.change24h ?? 0) >= 0 ? "+" : ""}
                {(tooltip.subnet.change24h ?? 0).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Tooltip Arrow */}
          <div
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full"
            style={{
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid rgb(15, 23, 42)",
            }}
          />
        </div>
      )}
    </div>
  );
}
