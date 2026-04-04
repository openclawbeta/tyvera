"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Shield, CheckCircle, AlertTriangle,
  Zap, Lock, Eye, XCircle, Wallet, Loader2,
} from "lucide-react";
import { cn, subnetGradient } from "@/lib/utils";
import { RiskBadge } from "./risk-badge";
import { useWallet } from "@/lib/wallet-context";
import type { RecommendationUiModel as Recommendation } from "@/lib/types/recommendations";

interface ReviewPanelProps {
  rec: Recommendation | null;
}

function SubnetPill({ netuid, name, yieldRate }: { netuid: number; name: string; yieldRate: number }) {
  return (
    <div
      className="flex items-center gap-3 p-3.5 rounded-xl"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.065)",
      }}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
          `bg-gradient-to-br ${subnetGradient(netuid)}`,
        )}
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
      >
        {netuid}
      </div>
      <div>
        <div className="text-[13px] font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>
          {name}
        </div>
        <div className="text-[10px] text-slate-600 font-mono mt-0.5">{yieldRate}% est. APR</div>
      </div>
    </div>
  );
}

function TrustRow({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: "rgba(52,211,153,0.1)",
          border: "1px solid rgba(52,211,153,0.18)",
        }}
      >
        <Icon className="w-2.5 h-2.5 text-emerald-400" />
      </div>
      <span className="text-[11px] text-slate-400 leading-snug">{text}</span>
    </div>
  );
}

function DataRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      <span className="text-[11px] text-slate-500">{label}</span>
      <span
        className="font-semibold font-mono tabular-nums"
        style={{
          fontSize: "11px",
          color: highlight ? "#f8fafc" : "#cbd5e1",
          fontWeight: highlight ? 700 : 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Wallet-aware footer                                                  */
/* ─────────────────────────────────────────────────────────────────── */

function ReviewFooter({ rec }: { rec: Recommendation }) {
  const { walletState, openModal, verify, requestApproval } = useWallet();

  function handleSubmit() {
    requestApproval({
      id: `approval-${rec.id}`,
      type: "reallocation",
      fromSubnet: { netuid: rec.fromSubnet.netuid, name: rec.fromSubnet.name },
      toSubnet:   { netuid: rec.toSubnet.netuid,   name: rec.toSubnet.name   },
      amount: rec.amount,
      fee: rec.fees.total,
      description: `Move ${rec.amount.toFixed(4)} τ from ${rec.fromSubnet.name} to ${rec.toSubnet.name} for estimated +${rec.projectedEdge.toFixed(1)}% yield edge.`,
    });
  }

  const isPendingApproval = walletState === "pending_approval";

  return (
    <div
      className="px-5 py-4 flex-shrink-0 space-y-2"
      style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}
    >
      {/* Primary CTA — varies by wallet state */}
      {walletState === "disconnected" && (
        <button
          onClick={openModal}
          className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-[13px] py-3 transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, rgba(34,211,238,0.12) 0%, rgba(14,165,233,0.08) 100%)",
            border: "1px solid rgba(34,211,238,0.22)",
            color: "#67e8f9",
            letterSpacing: "-0.01em",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "linear-gradient(135deg, rgba(34,211,238,0.2) 0%, rgba(14,165,233,0.14) 100%)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "linear-gradient(135deg, rgba(34,211,238,0.12) 0%, rgba(14,165,233,0.08) 100%)";
          }}
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet to Submit
        </button>
      )}

      {walletState === "connecting" && (
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-[13px] py-3 cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "#475569",
            letterSpacing: "-0.01em",
          }}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Connecting…
        </button>
      )}

      {walletState === "connected" && (
        <button
          onClick={verify}
          className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-[13px] py-3 transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.08) 100%)",
            border: "1px solid rgba(251,191,36,0.22)",
            color: "#fde68a",
            letterSpacing: "-0.01em",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(245,158,11,0.14) 100%)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.08) 100%)";
          }}
        >
          <Shield className="w-4 h-4" />
          Verify Wallet First
        </button>
      )}

      {walletState === "verifying" && (
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-[13px] py-3 cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "#475569",
            letterSpacing: "-0.01em",
          }}
        >
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#fbbf24" }} />
          Verifying…
        </button>
      )}

      {walletState === "verified" && (
        <button
          onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-[13px] py-3 transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
            color: "#04060d",
            boxShadow: "0 0 0 1px rgba(34,211,238,0.4), 0 4px 16px rgba(34,211,238,0.22), inset 0 1px 0 rgba(255,255,255,0.22)",
            letterSpacing: "-0.01em",
          }}
        >
          <Zap className="w-4 h-4" />
          Submit in Wallet
        </button>
      )}

      {isPendingApproval && (
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-[13px] py-3 cursor-not-allowed"
          style={{
            background: "rgba(251,191,36,0.07)",
            border: "1px solid rgba(251,191,36,0.2)",
            color: "#fbbf24",
            letterSpacing: "-0.01em",
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: "#fbbf24",
              boxShadow: "0 0 6px rgba(251,191,36,0.6)",
              animation: "pulse-dot 1.2s ease-in-out infinite",
            }}
          />
          Approval in progress…
        </button>
      )}

      {/* Secondary: ignore */}
      <button
        className="w-full flex items-center justify-center gap-2 rounded-xl font-medium text-xs py-2.5 transition-all duration-150"
        style={{ color: "#64748b", background: "transparent" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = "#f87171";
          (e.currentTarget as HTMLElement).style.background = "rgba(244,63,94,0.05)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = "#64748b";
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        <XCircle className="w-3.5 h-3.5" />
        Ignore this recommendation
      </button>
    </div>
  );
}

const PANEL_GLASS = {
  background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.016) 100%)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 24px rgba(0,0,0,0.3)",
  borderRadius: "16px",
};

export function ReviewPanel({ rec }: ReviewPanelProps) {
  if (!rec) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-8 text-center"
        style={PANEL_GLASS}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <Eye className="w-5 h-5" style={{ color: "#334155" }} />
        </div>
        <p className="text-[13px] font-medium text-slate-400 mb-1.5">No recommendation selected</p>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Select a recommendation card to review details and initiate a move.
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={rec.id}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="h-full flex flex-col overflow-auto"
        style={PANEL_GLASS}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.055)" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="font-bold text-slate-300 uppercase"
              style={{ fontSize: "9.5px", letterSpacing: "0.1em" }}
            >
              Reallocation Review
            </span>
            <RiskBadge risk={rec.riskLevel} />
          </div>
          <p className="text-[11px] text-slate-600">Review details below, then submit in your wallet.</p>
        </div>

        {/* Body */}
        <div className="flex-1 px-5 py-4 space-y-5 overflow-auto">

          {/* Move direction */}
          <div>
            <div className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-[0.1em] mb-2.5">
              Move Direction
            </div>
            <SubnetPill
              netuid={rec.fromSubnet.netuid}
              name={rec.fromSubnet.name}
              yieldRate={rec.fromSubnet.yield}
            />
            <div className="flex items-center justify-center my-2.5 gap-2">
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl"
                style={{
                  background: "rgba(34,211,238,0.08)",
                  border: "1px solid rgba(34,211,238,0.18)",
                  boxShadow: "0 0 10px rgba(34,211,238,0.05)",
                }}
              >
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-bold text-cyan-300 tabular-nums">
                  +{rec.projectedEdge.toFixed(1)}% edge
                </span>
              </div>
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
            <SubnetPill
              netuid={rec.toSubnet.netuid}
              name={rec.toSubnet.name}
              yieldRate={rec.toSubnet.yield}
            />
          </div>

          {/* Transaction details */}
          <div>
            <div className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-[0.1em] mb-2.5">
              Transaction Details
            </div>
            <div
              className="rounded-xl px-3.5 py-1"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.055)",
              }}
            >
              <DataRow label="Amount to move"   value={`${rec.amount.toFixed(4)} τ`} />
              <DataRow label="Move fee (0.05%)" value={`${rec.fees.move.toFixed(5)} τ`} />
              <DataRow label="Chain fee (est.)" value={`${rec.fees.chain.toFixed(5)} τ`} />
              <DataRow label="Breakeven"        value={`~${rec.breakeven} days`} />
              <div className="flex items-center justify-between pt-2.5 pb-1.5">
                <span className="text-[11px] font-semibold text-slate-300">Total fees</span>
                <span
                  className="font-bold font-mono tabular-nums text-white"
                  style={{ fontSize: "12px" }}
                >
                  {rec.fees.total.toFixed(5)} τ
                </span>
              </div>
            </div>
          </div>

          {/* Engine assessment */}
          <div>
            <div className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-[0.1em] mb-2.5">
              Engine Assessment
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Confidence", main: `${rec.confidence}%`, sub: rec.confidenceLabel },
                { label: "Score",      main: (rec.score * 100).toFixed(0), sub: rec.band },
              ].map(({ label, main, sub }) => (
                <div
                  key={label}
                  className="p-3 rounded-xl text-center"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="text-[9.5px] text-slate-600 uppercase tracking-wider mb-1.5">{label}</div>
                  <div
                    className="font-bold text-white tabular-nums"
                    style={{ fontSize: "20px", letterSpacing: "-0.025em" }}
                  >
                    {main}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5 uppercase tracking-wider">{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rationale */}
          <div>
            <div className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-[0.1em] mb-2.5">
              Rationale
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{rec.rationale}</p>
          </div>

          {/* Risk bullets */}
          {rec.riskBullets.length > 0 && (
            <div
              className="p-3.5 rounded-xl"
              style={{
                background: "rgba(251,191,36,0.05)",
                border: "1px solid rgba(251,191,36,0.14)",
              }}
            >
              <div className="flex items-center gap-1.5 mb-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                  Things to know
                </span>
              </div>
              <ul className="space-y-1.5">
                {rec.riskBullets.map((b, i) => (
                  <li key={i} className="text-[11px] text-amber-200/60 leading-relaxed">
                    · {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trust copy */}
          <div
            className="p-3.5 rounded-xl space-y-2.5"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.055)",
            }}
          >
            <div className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-[0.1em] mb-1">
              Protection Active
            </div>
            <TrustRow icon={Shield}      text="You approve every move in your wallet." />
            <TrustRow icon={Lock}        text="No seed phrase storage. Ever." />
            <TrustRow icon={Eye}         text="No silent execution — full transparency." />
            <TrustRow icon={CheckCircle} text="Wallet remains under your control." />
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-slate-700 leading-relaxed">
            This suggestion is generated from on-chain data and is not financial advice. Staking
            yields change continuously. Past emission rates do not guarantee future returns.
          </p>
        </div>

        {/* Footer */}
        <ReviewFooter rec={rec} />
      </motion.div>
    </AnimatePresence>
  );
}
