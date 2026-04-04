"use client";

import { motion } from "framer-motion";
import { ArrowRight, XCircle, Zap } from "lucide-react";
import { cn, subnetGradient } from "@/lib/utils";
import { RiskBadge } from "./risk-badge";
import type { RecommendationUiModel as Recommendation } from "@/lib/types/recommendations";

interface RecommendationCardProps {
  rec: Recommendation;
  selected?: boolean;
  onSelect?: () => void;
  index?: number;
}

const BAND = {
  STRONG: {
    border:   "rgba(34,211,238,0.28)",
    bg:       "rgba(34,211,238,0.045)",
    glow:     "0 0 32px rgba(34,211,238,0.07)",
    dot:      "#22d3ee",
    dotGlow:  "0 0 6px rgba(34,211,238,0.6)",
    label:    "Strong Signal",
    scoreClr: "#22d3ee",
    badgeBg:  "rgba(34,211,238,0.1)",
    badgeBdr: "rgba(34,211,238,0.22)",
  },
  MODERATE: {
    border:   "rgba(251,191,36,0.2)",
    bg:       "rgba(251,191,36,0.03)",
    glow:     "0 0 32px rgba(251,191,36,0.04)",
    dot:      "#fbbf24",
    dotGlow:  "0 0 6px rgba(251,191,36,0.5)",
    label:    "Moderate Signal",
    scoreClr: "#fbbf24",
    badgeBg:  "rgba(251,191,36,0.1)",
    badgeBdr: "rgba(251,191,36,0.22)",
  },
  MILD: {
    border:   "rgba(255,255,255,0.068)",
    bg:       "rgba(255,255,255,0.018)",
    glow:     "",
    dot:      "#64748b",
    dotGlow:  "",
    label:    "Mild Signal",
    scoreClr: "#94a3b8",
    badgeBg:  "rgba(255,255,255,0.06)",
    badgeBdr: "rgba(255,255,255,0.1)",
  },
};

function SubnetAvatar({ netuid, size = "sm" }: { netuid: number; size?: "sm" | "md" }) {
  const dim = size === "sm" ? 32 : 40;
  const font = size === "sm" ? 11 : 13;
  return (
    <div
      className={cn(
        "rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0",
        `bg-gradient-to-br ${subnetGradient(netuid)}`,
      )}
      style={{
        width: dim,
        height: dim,
        fontSize: font,
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
      }}
    >
      {netuid}
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? "#22d3ee" : value >= 60 ? "#f59e0b" : "#94a3b8";
  const glow  = value >= 80 ? "rgba(34,211,238,0.4)" : value >= 60 ? "rgba(245,158,11,0.4)" : "transparent";
  return (
    <div
      className="w-full h-[3px] rounded-full overflow-hidden"
      style={{ background: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${value}%`,
          background: color,
          boxShadow: `0 0 6px ${glow}`,
        }}
      />
    </div>
  );
}

export function RecommendationCard({ rec, selected, onSelect, index = 0 }: RecommendationCardProps) {
  const b = BAND[rec.band];

  const baseStyle = {
    borderRadius: "16px",
    padding: "20px",
    cursor: "pointer",
    border: `1px solid ${selected ? "rgba(34,211,238,0.35)" : b.border}`,
    background: selected ? "rgba(34,211,238,0.04)" : b.bg,
    boxShadow: selected
      ? "0 0 0 1px rgba(34,211,238,0.15), 0 0 32px rgba(34,211,238,0.07), 0 1px 0 rgba(255,255,255,0.05) inset"
      : `0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.25)${b.glow ? `, ${b.glow}` : ""}`,
    transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -1, transition: { duration: 0.18 } }}
      onClick={onSelect}
      style={baseStyle}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: b.dot, boxShadow: b.dotGlow }}
          />
          <span
            className="font-semibold text-slate-400 uppercase"
            style={{ fontSize: "10px", letterSpacing: "0.07em" }}
          >
            {b.label}
          </span>
          <div className="w-px h-3" style={{ background: "rgba(255,255,255,0.1)" }} />
          <RiskBadge risk={rec.riskLevel} />
        </div>
        {/* Score pill */}
        <div
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1"
          style={{ background: b.badgeBg, border: `1px solid ${b.badgeBdr}` }}
        >
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Score</span>
          <span
            className="font-bold tabular-nums"
            style={{ fontSize: "13px", letterSpacing: "-0.02em", color: b.scoreClr }}
          >
            {(rec.score * 100).toFixed(0)}
          </span>
        </div>
      </div>

      {/* ── Move Direction ── */}
      <div className="flex items-center gap-3 mb-5">
        {/* From */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <SubnetAvatar netuid={rec.fromSubnet.netuid} size="md" />
          <div className="min-w-0">
            <div className="text-[9.5px] text-slate-600 uppercase tracking-wider mb-0.5">From</div>
            <div className="text-sm font-semibold text-white truncate" style={{ letterSpacing: "-0.01em" }}>
              {rec.fromSubnet.name}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">{rec.fromSubnet.yield}% APR</div>
          </div>
        </div>

        {/* Arrow + edge */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{
              background: "rgba(34,211,238,0.08)",
              border: "1px solid rgba(34,211,238,0.18)",
              boxShadow: "0 0 12px rgba(34,211,238,0.06)",
            }}
          >
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-bold text-cyan-300 tabular-nums">
              +{rec.projectedEdge.toFixed(1)}%
            </span>
          </div>
          <span className="text-[9px] text-slate-600 uppercase tracking-wider">edge</span>
        </div>

        {/* To */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
          <div className="min-w-0 text-right">
            <div className="text-[9.5px] text-slate-600 uppercase tracking-wider mb-0.5">To</div>
            <div className="text-sm font-semibold text-white truncate" style={{ letterSpacing: "-0.01em" }}>
              {rec.toSubnet.name}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">{rec.toSubnet.yield}% APR</div>
          </div>
          <SubnetAvatar netuid={rec.toSubnet.netuid} size="md" />
        </div>
      </div>

      {/* ── Key metrics ── */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: "Move",      value: `${rec.amount.toFixed(2)} τ` },
          { label: "Fee",       value: `${rec.fees.total.toFixed(5)} τ` },
          { label: "Breakeven", value: `${rec.breakeven}d` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl px-3 py-2.5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.055)",
            }}
          >
            <div className="text-[9.5px] text-slate-600 uppercase tracking-wider mb-1">{label}</div>
            <div
              className="font-bold text-white tabular-nums"
              style={{ fontSize: "13px", letterSpacing: "-0.02em" }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Confidence ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9.5px] text-slate-600 uppercase tracking-wider">Confidence</span>
          <span className="text-[10px] font-semibold text-slate-400">{rec.confidenceLabel} · {rec.confidence}%</span>
        </div>
        <ConfidenceBar value={rec.confidence} />
      </div>

      {/* ── Rationale ── */}
      <p
        className="text-slate-500 leading-relaxed line-clamp-2 mb-5"
        style={{ fontSize: "11px" }}
      >
        {rec.rationale}
      </p>

      {/* ── Divider ── */}
      <div className="divider mb-4" />

      {/* ── Actions ── */}
      <div className="flex items-center gap-2">
        <button
          className="flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold text-xs py-2.5 transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
            color: "#04060d",
            boxShadow: "0 0 0 1px rgba(34,211,238,0.35), 0 4px 14px rgba(34,211,238,0.18), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 0 0 1px rgba(34,211,238,0.5), 0 6px 18px rgba(34,211,238,0.25), inset 0 1px 0 rgba(255,255,255,0.25)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 0 0 1px rgba(34,211,238,0.35), 0 4px 14px rgba(34,211,238,0.18), inset 0 1px 0 rgba(255,255,255,0.2)";
          }}
        >
          <Zap className="w-3.5 h-3.5" />
          Review & Submit
        </button>
        <button
          className="flex items-center gap-1.5 rounded-xl font-medium text-xs py-2.5 px-3 transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#64748b",
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#94a3b8";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.14)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#64748b";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
          }}
        >
          <XCircle className="w-3.5 h-3.5" />
          Ignore
        </button>
      </div>
    </motion.div>
  );
}
