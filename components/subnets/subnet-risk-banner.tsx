"use client";

import { useState } from "react";
import { AlertTriangle, ShieldAlert, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import type { RiskFlag } from "@/lib/data/subnets-real-helpers";

/* ─── Risk acknowledgment banner ─────────────────────────────────────
 *
 * Rendered on subnet detail pages when `detectRiskFlags()` returns any
 * warnings.  The user must expand and explicitly acknowledge risks
 * before the banner collapses.
 *
 * Two display modes:
 *   - "inline"  → compact pill for cards / table rows (just the top flag)
 *   - "full"    → expandable banner for the detail page
 * ──────────────────────────────────────────────────────────────────── */

interface SubnetRiskBannerProps {
  flags: RiskFlag[];
  subnetName: string;
  mode?: "full" | "inline";
}

const SEVERITY_STYLES = {
  warning: {
    bg: "rgba(239,68,68,0.06)",
    border: "rgba(239,68,68,0.18)",
    icon: "text-red-400",
    titleColor: "text-red-300",
    bodyColor: "text-red-200/60",
    pillBg: "bg-red-500/10 border-red-500/20 text-red-400",
  },
  caution: {
    bg: "rgba(251,191,36,0.06)",
    border: "rgba(251,191,36,0.16)",
    icon: "text-amber-400",
    titleColor: "text-amber-300",
    bodyColor: "text-amber-200/60",
    pillBg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  },
};

export function SubnetRiskBanner({ flags, subnetName, mode = "full" }: SubnetRiskBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  if (flags.length === 0) return null;

  // Highest severity wins for banner styling
  const topSeverity = flags.some((f) => f.severity === "warning") ? "warning" : "caution";
  const styles = SEVERITY_STYLES[topSeverity];

  // ── Inline pill mode (for cards / table rows) ─────────────────────
  if (mode === "inline") {
    const label = topSeverity === "warning" ? "High Risk" : "Caution";
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${styles.pillBg}`}
        title={flags[0].message}
      >
        <AlertTriangle className="w-2.5 h-2.5" />
        {label}
        {flags.length > 1 && (
          <span className="opacity-60">+{flags.length - 1}</span>
        )}
      </span>
    );
  }

  // ── Full banner mode (detail page) ────────────────────────────────

  if (acknowledged) {
    return (
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
        style={{
          background: "rgba(34,197,94,0.05)",
          border: "1px solid rgba(34,197,94,0.15)",
        }}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
        <p className="text-[11px] text-green-300/70">
          Risks acknowledged for {subnetName}. Proceed with your own research.
        </p>
        <button
          onClick={() => setAcknowledged(false)}
          className="ml-auto text-[10px] text-green-400/50 hover:text-green-300 transition-colors"
        >
          Review again
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:brightness-110"
      >
        <ShieldAlert className={`w-4 h-4 flex-shrink-0 ${styles.icon}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-[12px] font-semibold ${styles.titleColor}`}>
            {flags.length === 1
              ? flags[0].title
              : `${flags.length} risk factors detected`}
          </p>
          {!expanded && (
            <p className={`text-[11px] ${styles.bodyColor} mt-0.5 line-clamp-1`}>
              {flags[0].message}
            </p>
          )}
        </div>
        {expanded
          ? <ChevronUp className={`w-3.5 h-3.5 flex-shrink-0 ${styles.icon}`} />
          : <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 ${styles.icon}`} />
        }
      </button>

      {/* Expanded details + acknowledgment */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {flags.map((flag) => {
            const fs = SEVERITY_STYLES[flag.severity];
            return (
              <div
                key={flag.id}
                className="flex items-start gap-2.5"
              >
                <AlertTriangle className={`w-3 h-3 flex-shrink-0 mt-0.5 ${fs.icon}`} />
                <div>
                  <p className={`text-[11px] font-semibold ${fs.titleColor}`}>
                    {flag.title}
                  </p>
                  <p className={`text-[11px] ${fs.bodyColor} mt-0.5 leading-relaxed`}>
                    {flag.message}
                  </p>
                </div>
              </div>
            );
          })}

          <div
            className="pt-3 mt-1"
            style={{ borderTop: `1px solid ${styles.border}` }}
          >
            <button
              onClick={() => {
                setAcknowledged(true);
                setExpanded(false);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-semibold transition-all duration-200 hover:brightness-125"
              style={{
                background: topSeverity === "warning"
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(251,191,36,0.12)",
                border: `1px solid ${styles.border}`,
                color: topSeverity === "warning" ? "#fca5a5" : "#fde68a",
              }}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              I understand the risks
            </button>
            <p className="text-[10px] text-slate-600 mt-2">
              This is not financial advice. Always do your own research before allocating TAO.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Yield outlier tag (for table / card views) ─────────────────── */

export function YieldOutlierTag({ yield: yieldPct }: { yield: number }) {
  if (yieldPct <= 100) return null;

  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border bg-red-500/10 border-red-500/20 text-red-400"
      title={`${yieldPct.toFixed(0)}% yield is an extreme outlier — likely unsustainable`}
    >
      <AlertTriangle className="w-2 h-2" />
      OUTLIER
    </span>
  );
}
