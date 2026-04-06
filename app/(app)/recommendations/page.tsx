"use client";

import { useState } from "react";
import {
  Filter, Clock, CheckCircle, Wallet, Shield, AlertCircle,
  ArrowRight, Zap, XCircle, AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { ReviewPanel } from "@/components/recommendations/review-panel";
import { RiskBadge } from "@/components/recommendations/risk-badge";
import { getRecommendations } from "@/lib/api/recommendations";
import { useWallet } from "@/lib/wallet-context";
import { cn, subnetGradient } from "@/lib/utils";
import type { RecommendationUiModel as Recommendation } from "@/lib/types/recommendations";

/* ─────────────────────────────────────────────────────────────────────
   Band metadata
   ───────────────────────────────────────────────────────────────────── */

const BAND_META = {
  STRONG: {
    dot: "#22d3ee", dotGlow: "rgba(34,211,238,0.6)",
    label: "Strong Signal",
    border: "rgba(34,211,238,0.28)", bg: "rgba(34,211,238,0.04)",
    scoreClr: "#22d3ee",
    scoreBg: "rgba(34,211,238,0.1)", scoreBdr: "rgba(34,211,238,0.22)",
    cardShadow: "0 0 22px rgba(34,211,238,0.05), inset 0 1px 0 rgba(255,255,255,0.04)",
  },
  MODERATE: {
    dot: "#fbbf24", dotGlow: "rgba(251,191,36,0.5)",
    label: "Moderate Signal",
    border: "rgba(251,191,36,0.2)", bg: "rgba(251,191,36,0.03)",
    scoreClr: "#fbbf24",
    scoreBg: "rgba(251,191,36,0.1)", scoreBdr: "rgba(251,191,36,0.22)",
    cardShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 24px rgba(0,0,0,0.3)",
  },
  MILD: {
    dot: "#64748b", dotGlow: "",
    label: "Mild Signal",
    border: "rgba(255,255,255,0.07)", bg: "rgba(255,255,255,0.018)",
    scoreClr: "#94a3b8",
    scoreBg: "rgba(255,255,255,0.06)", scoreBdr: "rgba(255,255,255,0.1)",
    cardShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 24px rgba(0,0,0,0.3)",
  },
};

/* ─────────────────────────────────────────────────────────────────────
   Shared sub-components
   ───────────────────────────────────────────────────────────────────── */

function SubnetAvatar({ netuid, size = 40 }: { netuid: number; size?: number }) {
  return (
    <div
      className={cn(
        "rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0",
        `bg-gradient-to-br ${subnetGradient(netuid)}`,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size <= 36 ? 11 : 13,
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
    <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: color, boxShadow: `0 0 6px ${glow}` }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Wallet banner (unchanged logic from original)
   ───────────────────────────────────────────────────────────────────── */

function WalletBanner() {
  const { walletState, openModal, verify } = useWallet();

  if (walletState === "verified" || walletState === "pending_approval") {
    return (
      <FadeIn>
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.14)" }}
        >
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="text-[12px] text-slate-400">
            <span className="font-semibold text-emerald-300">You approve every move.</span>{" "}
            Recommendations are suggestions only. Nothing executes until you sign in your wallet.
          </p>
          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            <Shield className="w-3 h-3 text-slate-600" />
            <span className="text-[10px] text-slate-600">Wallet verified</span>
          </div>
        </div>
      </FadeIn>
    );
  }

  if (walletState === "connected") {
    return (
      <FadeIn>
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.18)" }}
        >
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-[12px] text-slate-400 flex-1">
            <span className="font-semibold text-amber-300">Wallet verification required.</span>{" "}
            Sign a one-time message to confirm ownership before submitting any moves. No TAO is spent.
          </p>
          <button
            onClick={verify}
            className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
            style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.18)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.1)"; }}
          >
            <Shield className="w-3 h-3" />
            Verify now
          </button>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-xl"
        style={{ background: "rgba(34,211,238,0.04)", border: "1px solid rgba(34,211,238,0.14)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)" }}
        >
          <Wallet className="w-4 h-4" style={{ color: "#22d3ee" }} />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-white mb-0.5" style={{ letterSpacing: "-0.01em" }}>
            Connect your wallet to execute recommendations
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Browse freely — wallet connection is only needed when you want to approve a move.
            Your seed phrase is never stored. You approve every transaction individually.
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex-shrink-0 flex items-center gap-2 text-[12px] font-semibold px-4 py-2 rounded-xl transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, rgba(34,211,238,0.14) 0%, rgba(14,165,233,0.1) 100%)",
            border: "1px solid rgba(34,211,238,0.25)",
            color: "#67e8f9",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "linear-gradient(135deg, rgba(34,211,238,0.22) 0%, rgba(14,165,233,0.16) 100%)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(34,211,238,0.38)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "linear-gradient(135deg, rgba(34,211,238,0.14) 0%, rgba(14,165,233,0.1) 100%)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(34,211,238,0.25)";
          }}
        >
          <Wallet className="w-3.5 h-3.5" />
          Connect Wallet
        </button>
      </div>
    </FadeIn>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Primary decision block
   ───────────────────────────────────────────────────────────────────── */

function PrimaryBlock({
  rec,
  onReview,
}: {
  rec: Recommendation;
  onReview: () => void;
}) {
  const b = BAND_META[rec.band];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: b.bg,
        border: `1px solid ${b.border}`,
        boxShadow: b.cardShadow,
      }}
    >
      {/* Header: signal band + risk + score */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.055)" }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              background: b.dot,
              boxShadow: b.dotGlow ? `0 0 6px ${b.dotGlow}` : undefined,
            }}
          />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.07em]">
            {b.label}
          </span>
          <div className="w-px h-3" style={{ background: "rgba(255,255,255,0.1)" }} />
          <RiskBadge risk={rec.riskLevel} />
        </div>
        <div
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1"
          style={{ background: b.scoreBg, border: `1px solid ${b.scoreBdr}` }}
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

      <div className="p-6 space-y-5">

        {/* ── Move direction — conceptual anchor ── */}
        <div>
          <div className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-[0.1em] mb-3">
            Suggested Move
          </div>
          <div className="flex items-center gap-3">

            {/* From */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <SubnetAvatar netuid={rec.fromSubnet.netuid} size={44} />
              <div className="min-w-0">
                <div className="text-[9.5px] text-slate-600 uppercase tracking-wider mb-0.5">From</div>
                <div
                  className="text-[15px] font-semibold text-white leading-tight truncate"
                  style={{ letterSpacing: "-0.015em" }}
                >
                  {rec.fromSubnet.name}
                </div>
                <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                  {rec.fromSubnet.yield}% APR
                </div>
              </div>
            </div>

            {/* Edge — dominant quantitative signal */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1">
              <div
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                style={{
                  background: "rgba(34,211,238,0.08)",
                  border: "1px solid rgba(34,211,238,0.2)",
                }}
              >
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                <span
                  className="font-bold text-cyan-300 tabular-nums"
                  style={{ fontSize: "17px", letterSpacing: "-0.025em" }}
                >
                  +{rec.projectedEdge.toFixed(1)}%
                </span>
              </div>
              <span className="text-[9px] text-slate-600 uppercase tracking-wider">yield edge</span>
            </div>

            {/* To */}
            <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
              <div className="min-w-0 text-right">
                <div className="text-[9.5px] text-slate-600 uppercase tracking-wider mb-0.5">To</div>
                <div
                  className="text-[15px] font-semibold text-white leading-tight truncate"
                  style={{ letterSpacing: "-0.015em" }}
                >
                  {rec.toSubnet.name}
                </div>
                <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                  {rec.toSubnet.yield}% APR
                </div>
              </div>
              <SubnetAvatar netuid={rec.toSubnet.netuid} size={44} />
            </div>

          </div>
        </div>

        {/* ── Key metrics ── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Move",      value: `${rec.amount.toFixed(2)} τ` },
            { label: "Breakeven", value: `${rec.breakeven}d` },
            { label: "Total fee", value: `${rec.fees.total.toFixed(5)} τ` },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl px-3.5 py-2.5"
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
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9.5px] text-slate-600 uppercase tracking-wider">Confidence</span>
            <span className="text-[10px] font-semibold text-slate-400">
              {rec.confidenceLabel} · {rec.confidence}%
            </span>
          </div>
          <ConfidenceBar value={rec.confidence} />
        </div>

        {/* ── Rationale ── */}
        <p className="text-[11.5px] text-slate-400 leading-relaxed">
          {rec.rationale}
        </p>

        {/* ── Factor bullets ── */}
        {rec.factorBullets.length > 0 && (
          <div className="space-y-2.5">
            {rec.factorBullets.map((bullet, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span
                  className="mt-[4px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background:
                      bullet.direction === "POSITIVE" ? "#34d399"
                      : bullet.direction === "NEGATIVE" ? "#f87171"
                      : "#64748b",
                  }}
                />
                <div className="min-w-0">
                  <span className="text-[10.5px] font-semibold text-slate-400">{bullet.label} — </span>
                  <span className="text-[10.5px] text-slate-500 leading-relaxed">{bullet.sentence}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Risk bullets ── */}
        {rec.riskBullets.length > 0 && (
          <div
            className="p-3.5 rounded-xl"
            style={{
              background: "rgba(251,191,36,0.05)",
              border: "1px solid rgba(251,191,36,0.14)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[9.5px] font-bold text-amber-300 uppercase tracking-wider">
                Things to know
              </span>
            </div>
            <ul className="space-y-1.5">
              {rec.riskBullets.map((bullet, i) => (
                <li key={i} className="text-[11px] text-amber-200/60 leading-relaxed">
                  · {bullet}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Actions ── */}
        <div
          className="flex items-center gap-2 pt-1"
          style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}
        >
          <button
            className="flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold text-[12px] py-3 transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
              color: "#04060d",
              boxShadow: "0 2px 8px rgba(34,211,238,0.14), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
            onClick={onReview}
          >
            <Zap className="w-3.5 h-3.5" />
            Review & Submit
          </button>
          <button
            className="flex items-center gap-1.5 rounded-xl font-medium text-[11px] py-3 px-4 transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#64748b",
            }}
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

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Secondary queue row
   ───────────────────────────────────────────────────────────────────── */

function QueueRow({
  rec,
  onReview,
  isLast,
}: {
  rec: Recommendation;
  onReview: () => void;
  isLast: boolean;
}) {
  const b = BAND_META[rec.band];

  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5"
      style={{
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Signal */}
      <div className="flex items-center gap-2 flex-shrink-0 w-[130px]">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: b.dot,
            boxShadow: b.dotGlow ? `0 0 5px ${b.dotGlow}` : undefined,
          }}
        />
        <span className="text-[10px] font-medium text-slate-500 truncate">{b.label}</span>
      </div>

      {/* From → To */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-[11.5px] font-semibold text-slate-300 truncate">
          {rec.fromSubnet.name}
        </span>
        <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
        <span className="text-[11.5px] font-semibold text-slate-300 truncate">
          {rec.toSubnet.name}
        </span>
      </div>

      {/* Edge */}
      <div
        className="flex-shrink-0 rounded-lg px-2.5 py-1 text-[10.5px] font-bold tabular-nums"
        style={{
          background: "rgba(34,211,238,0.07)",
          border: "1px solid rgba(34,211,238,0.16)",
          color: "#67e8f9",
        }}
      >
        +{rec.projectedEdge.toFixed(1)}%
      </div>

      {/* Risk */}
      <div className="flex-shrink-0">
        <RiskBadge risk={rec.riskLevel} />
      </div>

      {/* Review CTA */}
      <button
        className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
          color: "#94a3b8",
        }}
        onClick={onReview}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = "#e2e8f0";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.16)";
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = "#94a3b8";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.09)";
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
        }}
      >
        Review
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────────── */

export default function RecommendationsPage() {
  const allRecs = getRecommendations();

  // Sort by score descending — highest conviction first
  const sorted = [...allRecs].sort((a, b) => b.score - a.score);
  const primary = sorted[0] ?? null;
  const queue   = sorted.slice(1);

  const [selected, setSelected] = useState<Recommendation | null>(primary);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Recommendations"
          subtitle="Risk-adjusted reallocation opportunities — you approve every move"
        />
        <div className="flex items-center gap-2 mt-0.5">
          <div
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
            style={{
              background: "rgba(34,211,238,0.07)",
              border: "1px solid rgba(34,211,238,0.18)",
            }}
          >
            <span
              className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse-dot"
              style={{ boxShadow: "0 0 4px rgba(34,211,238,0.6)" }}
            />
            <span className="text-[11px] font-semibold text-cyan-300">
              {allRecs.length} active
            </span>
          </div>
          <button className="btn-ghost gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
        </div>
      </div>

      {/* ── Wallet readiness ── */}
      <WalletBanner />

      {/* ── Primary decision zone ── */}
      {primary && (
        <FadeIn delay={0.05}>
          <div className="grid grid-cols-12 gap-5">

            {/* Primary block — dominant left column */}
            <div className="col-span-12 lg:col-span-8">
              <PrimaryBlock
                rec={primary}
                onReview={() => setSelected(primary)}
              />
            </div>

            {/* Review panel — adjacent right column */}
            <div className="col-span-12 lg:col-span-4 lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
              <ReviewPanel rec={selected} />
            </div>

          </div>
        </FadeIn>
      )}

      {/* ── Secondary queue ── */}
      {queue.length > 0 && (
        <FadeIn delay={0.12}>
          <div>
            <div className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-[0.12em] mb-3 px-1">
              Also active
            </div>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.018)",
                border: "1px solid rgba(255,255,255,0.065)",
              }}
            >
              {queue.map((rec, i) => (
                <QueueRow
                  key={rec.id}
                  rec={rec}
                  onReview={() => setSelected(rec)}
                  isLast={i === queue.length - 1}
                />
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* ── Next run ── */}
      <FadeIn delay={0.18}>
        <div
          className="text-center py-7 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.018)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Clock className="w-7 h-7 mx-auto mb-2.5" style={{ color: "#334155" }} />
          <p className="text-[13px] font-medium text-slate-500">
            Next scoring run in ~18 minutes
          </p>
          <p className="text-[11px] text-slate-700 mt-1">
            The engine scores all subnets every 30 minutes.
          </p>
        </div>
      </FadeIn>

    </div>
  );
}
