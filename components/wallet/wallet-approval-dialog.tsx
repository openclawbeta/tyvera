"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Shield, Lock, CheckCircle, Loader2, X,
  AlertTriangle, Zap, Eye, ExternalLink,
} from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────── */
/* Inner approval states                                                */
/* ─────────────────────────────────────────────────────────────────── */

type InternalStep = "review" | "signing" | "success";

function SubnetChip({ netuid, name, role }: { netuid: number; name: string; role: "from" | "to" }) {
  return (
    <div
      className="flex items-center gap-2.5 p-2.5 rounded-lg"
      style={{
        background: role === "to" ? "rgba(34,211,238,0.05)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${role === "to" ? "rgba(34,211,238,0.18)" : "rgba(255,255,255,0.065)"}`,
      }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
        style={{
          background: role === "to"
            ? "linear-gradient(135deg, #22d3ee, #0ea5e9)"
            : "linear-gradient(135deg, #475569, #334155)",
        }}
      >
        {netuid}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-white truncate">{name}</div>
        <div
          className="text-[9.5px] uppercase tracking-wider mt-0.5"
          style={{ color: role === "to" ? "#22d3ee" : "#475569" }}
        >
          {role === "from" ? "Exit" : "Enter"}
        </div>
      </div>
    </div>
  );
}

function TrustLine({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3 h-3 flex-shrink-0" style={{ color: "#34d399" }} />
      <span className="text-[10.5px] text-slate-500">{text}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Dialog component                                                     */
/* ─────────────────────────────────────────────────────────────────── */

export function WalletApprovalDialog() {
  const { walletState, approvalRequest, lastApprovalResult, resolveApproval, cancelApproval } = useWallet();
  const [step, setStep] = useState<InternalStep>("review");
  const isOpen = walletState === "pending_approval" && approvalRequest !== null;

  function handleApprove() {
    setStep("signing");
    // Simulate signing round-trip
    setTimeout(() => {
      setStep("success");
      setTimeout(() => {
        resolveApproval({ approved: true, txHash: "0x4a2c1e8f3b7d9a0c5e2f1b4d" });
        setStep("review");
      }, 1400);
    }, 2000);
  }

  function handleReject() {
    setStep("review");
    cancelApproval();
  }

  if (!approvalRequest) return null;

  const req = approvalRequest;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="approval-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(4,6,13,0.7)", backdropFilter: "blur(4px)" }}
          />

          {/* Dialog — anchored bottom-right of main content area */}
          <motion.div
            key="approval-dialog"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-50"
            style={{ bottom: "32px", right: "16px", width: "min(360px, calc(100vw - 32px))" }}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(145deg, rgba(10,14,26,0.99) 0%, rgba(7,10,18,1) 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.7), 0 0 40px rgba(34,211,238,0.06)",
              }}
            >
              {/* Header glow line */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[1px] pointer-events-none"
                style={{ background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.4), transparent)" }}
              />

              <AnimatePresence mode="wait">

                {/* ── Review step ── */}
                {step === "review" && (
                  <motion.div
                    key="review"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {/* Header */}
                    <div
                      className="flex items-center justify-between px-5 py-4"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: "rgba(34,211,238,0.1)",
                            border: "1px solid rgba(34,211,238,0.22)",
                          }}
                        >
                          <Zap className="w-3 h-3" style={{ color: "#22d3ee" }} />
                        </div>
                        <div>
                          <p
                            className="font-bold text-white"
                            style={{ fontSize: "12px", letterSpacing: "-0.01em" }}
                          >
                            Wallet Approval Required
                          </p>
                          <p className="text-[10px] text-slate-600">Review before signing</p>
                        </div>
                      </div>
                      <button
                        onClick={handleReject}
                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                        style={{ color: "#475569" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                          (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                          (e.currentTarget as HTMLElement).style.color = "#475569";
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-4 space-y-4">
                      {/* Description */}
                      <p className="text-[11px] text-slate-400 leading-relaxed">{req.description}</p>

                      {/* Move direction */}
                      <div className="space-y-1.5">
                        <SubnetChip netuid={req.fromSubnet.netuid} name={req.fromSubnet.name} role="from" />
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.05)" }} />
                          <div
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                            style={{
                              background: "rgba(34,211,238,0.07)",
                              border: "1px solid rgba(34,211,238,0.16)",
                            }}
                          >
                            <ArrowRight className="w-3 h-3" style={{ color: "#22d3ee" }} />
                            <span className="text-[10px] font-bold tabular-nums" style={{ color: "#67e8f9" }}>
                              {req.amount.toFixed(4)} τ
                            </span>
                          </div>
                          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.05)" }} />
                        </div>
                        <SubnetChip netuid={req.toSubnet.netuid} name={req.toSubnet.name} role="to" />
                      </div>

                      {/* Fee row */}
                      <div
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.055)",
                        }}
                      >
                        <span className="text-[11px] text-slate-500">Total fee</span>
                        <span className="text-[11px] font-mono font-semibold text-slate-300 tabular-nums">
                          {req.fee.toFixed(5)} τ
                        </span>
                      </div>

                      {/* Trust guarantees */}
                      <div
                        className="p-3 rounded-lg space-y-1.5"
                        style={{
                          background: "rgba(255,255,255,0.018)",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <TrustLine icon={Shield}      text="Your wallet remains in your control." />
                        <TrustLine icon={Lock}        text="No seed phrase is ever stored or sent." />
                        <TrustLine icon={Eye}         text="You can reject this in your extension." />
                        <TrustLine icon={CheckCircle} text="Only this specific action will execute." />
                      </div>

                      {/* Warning */}
                      <div
                        className="flex items-start gap-2 p-2.5 rounded-lg"
                        style={{
                          background: "rgba(251,191,36,0.05)",
                          border: "1px solid rgba(251,191,36,0.14)",
                        }}
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-[1px]" />
                        <p className="text-[10.5px] text-amber-200/50 leading-relaxed">
                          On-chain actions are irreversible. Verify subnet details before approving.
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div
                      className="px-5 py-4 space-y-2"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}
                    >
                      <button
                        onClick={handleApprove}
                        className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-[13px] py-2.5 transition-all duration-200"
                        style={{
                          background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                          color: "#04060d",
                          boxShadow: "0 0 0 1px rgba(34,211,238,0.4), 0 4px 16px rgba(34,211,238,0.22), inset 0 1px 0 rgba(255,255,255,0.22)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        <Zap className="w-4 h-4" />
                        Approve in Wallet
                      </button>
                      <button
                        onClick={handleReject}
                        className="w-full flex items-center justify-center gap-2 py-2 text-[11px] font-medium rounded-xl transition-all"
                        style={{ color: "#64748b" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.color = "#f87171";
                          (e.currentTarget as HTMLElement).style.background = "rgba(244,63,94,0.05)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.color = "#64748b";
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── Signing step ── */}
                {step === "signing" && (
                  <motion.div
                    key="signing"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center text-center p-8"
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{
                        background: "rgba(34,211,238,0.08)",
                        border: "1px solid rgba(34,211,238,0.2)",
                      }}
                    >
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#22d3ee" }} />
                    </div>
                    <p className="text-[14px] font-semibold text-white mb-1.5" style={{ letterSpacing: "-0.01em" }}>
                      Waiting for wallet…
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Confirm the transaction in your Polkadot.js extension to proceed.
                    </p>
                    <div
                      className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl"
                      style={{
                        background: "rgba(34,211,238,0.05)",
                        border: "1px solid rgba(34,211,238,0.14)",
                      }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: "#22d3ee",
                          boxShadow: "0 0 6px rgba(34,211,238,0.6)",
                          animation: "pulse-dot 1.4s ease-in-out infinite",
                        }}
                      />
                      <span className="text-[10.5px] text-cyan-400">Broadcasting to Bittensor network</span>
                    </div>
                    <p className="text-[10px] text-slate-700 mt-3">You can close your extension and return here.</p>
                  </motion.div>
                )}

                {/* ── Success step ── */}
                {step === "success" && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center text-center p-8"
                  >
                    <div className="relative mb-4">
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: "radial-gradient(ellipse, rgba(52,211,153,0.2) 0%, transparent 70%)",
                          transform: "scale(2)",
                        }}
                      />
                      <div
                        className="relative w-14 h-14 rounded-full flex items-center justify-center"
                        style={{
                          background: "rgba(52,211,153,0.12)",
                          border: "1px solid rgba(52,211,153,0.3)",
                          boxShadow: "0 0 28px rgba(52,211,153,0.1)",
                        }}
                      >
                        <CheckCircle className="w-6 h-6" style={{ color: "#34d399" }} />
                      </div>
                    </div>
                    <p className="text-[14px] font-bold text-white mb-1.5" style={{ letterSpacing: "-0.01em" }}>
                      Transaction submitted
                    </p>
                    <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                      Your reallocation is being processed on-chain.
                    </p>
                    {lastApprovalResult?.txHash ? (
                      <a
                        href={`https://x.taostats.io/extrinsic/${lastApprovalResult.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-[11px] font-medium transition-colors"
                        style={{ color: "#475569" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#94a3b8")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#475569")}
                      >
                        <ExternalLink className="w-3 h-3" />
                        View on Bittensor Explorer
                      </a>
                    ) : null}
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
