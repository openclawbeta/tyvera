"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  accent?: "cyan" | "violet" | "emerald" | "amber" | "rose";
  index?: number;
}

const ACCENT = {
  cyan: {
    iconBg:   "rgba(34,211,238,0.1)",
    iconBdr:  "rgba(34,211,238,0.18)",
    icon:     "#22d3ee",
    bar:      "linear-gradient(90deg, #22d3ee, #38bdf8)",
    barGlow:  "rgba(34,211,238,0.35)",
    cardGlow: "0 0 32px rgba(34,211,238,0.06)",
    dot:      "#22d3ee",
  },
  violet: {
    iconBg:   "rgba(139,92,246,0.1)",
    iconBdr:  "rgba(139,92,246,0.18)",
    icon:     "#8b5cf6",
    bar:      "linear-gradient(90deg, #8b5cf6, #a78bfa)",
    barGlow:  "rgba(139,92,246,0.35)",
    cardGlow: "0 0 32px rgba(139,92,246,0.05)",
    dot:      "#8b5cf6",
  },
  emerald: {
    iconBg:   "rgba(52,211,153,0.1)",
    iconBdr:  "rgba(52,211,153,0.18)",
    icon:     "#34d399",
    bar:      "linear-gradient(90deg, #34d399, #6ee7b7)",
    barGlow:  "rgba(52,211,153,0.35)",
    cardGlow: "0 0 32px rgba(52,211,153,0.05)",
    dot:      "#34d399",
  },
  amber: {
    iconBg:   "rgba(251,191,36,0.1)",
    iconBdr:  "rgba(251,191,36,0.18)",
    icon:     "#fbbf24",
    bar:      "linear-gradient(90deg, #f59e0b, #fbbf24)",
    barGlow:  "rgba(251,191,36,0.35)",
    cardGlow: "0 0 32px rgba(251,191,36,0.04)",
    dot:      "#fbbf24",
  },
  rose: {
    iconBg:   "rgba(244,63,94,0.1)",
    iconBdr:  "rgba(244,63,94,0.18)",
    icon:     "#f43f5e",
    bar:      "linear-gradient(90deg, #f43f5e, #fb7185)",
    barGlow:  "rgba(244,63,94,0.35)",
    cardGlow: "0 0 32px rgba(244,63,94,0.05)",
    dot:      "#f43f5e",
  },
};

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  accent = "cyan",
  index = 0,
}: StatCardProps) {
  const a = ACCENT[accent];
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: index * 0.07,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.032) 0%, rgba(255,255,255,0.016) 100%)",
        border: "1px solid rgba(255,255,255,0.072)",
        borderRadius: "16px",
        boxShadow: `0 1px 0 rgba(255,255,255,0.045) inset, 0 4px 24px rgba(0,0,0,0.28), ${a.cardGlow}`,
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "0",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        transition: "border-color 0.25s, box-shadow 0.25s",
      }}
      whileHover={{
        borderColor: "rgba(255,255,255,0.1)",
        y: -1,
        transition: { duration: 0.2 },
      }}
    >
      {/* Subtle top-right radial */}
      <div
        className="absolute top-0 right-0 w-32 h-24 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top right, ${a.iconBg}, transparent 70%)`,
          opacity: 0.6,
        }}
      />

      {/* Label + Icon row */}
      <div className="flex items-center justify-between mb-4 relative">
        <span
          className="uppercase font-semibold text-slate-500"
          style={{ fontSize: "10px", letterSpacing: "0.08em" }}
        >
          {label}
        </span>
        {icon && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: a.iconBg,
              border: `1px solid ${a.iconBdr}`,
              color: a.icon,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div
        className="font-bold text-white leading-none mb-2 relative"
        style={{ fontSize: "26px", letterSpacing: "-0.03em" }}
      >
        {value}
      </div>

      {/* Change */}
      {change !== undefined && (
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-semibold mb-4",
            isPositive ? "text-emerald-400" : isNegative ? "text-rose-400" : "text-slate-500",
          )}
        >
          {isPositive && <TrendingUp className="w-3 h-3" />}
          {isNegative && <TrendingDown className="w-3 h-3" />}
          {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
          <span>
            {isPositive ? "+" : ""}{change.toFixed(2)}%
          </span>
          {changeLabel && (
            <span className="text-slate-600 font-normal">{changeLabel}</span>
          )}
        </div>
      )}
      {change === undefined && <div className="mb-4" />}

      {/* Accent bar */}
      <div className="h-px w-full" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="mt-3 flex items-center gap-2">
        <div
          className="h-[3px] w-10 rounded-full"
          style={{
            background: a.bar,
            boxShadow: `0 0 8px ${a.barGlow}`,
          }}
        />
      </div>
    </motion.div>
  );
}
