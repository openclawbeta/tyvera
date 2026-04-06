"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Lock, CheckCircle, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { useWallet, type WalletExtension } from "@/lib/wallet-context";
import { truncateAddress } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────── */
/* Wallet extension configs                                             */
/* ─────────────────────────────────────────────────────────────────── */

const EXTENSIONS: Array<{
  id: WalletExtension;
  name: string;
  tagline: string;
  icon: React.ReactNode;
  recommended?: boolean;
}> = [
  {
    id: "polkadotjs",
    name: "Polkadot.js",
    tagline: "Official browser extension · Most compatible",
    recommended: true,
    icon: (
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
        style={{
          background: "linear-gradient(135deg, #e6007a 0%, #c0006a 100%)",
          boxShadow: "0 2px 10px rgba(230,0,122,0.35)",
          fontSize: "18px",
        }}
      >
        P
      </div>
    ),
  },
  {
    id: "subwallet",
    name: "SubWallet",
    tagline: "All-in-one Polkadot wallet",
    icon: (
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white"
        style={{
          background: "linear-gradient(135deg, #004bff 0%, #0033cc 100%)",
          boxShadow: "0 2px 10px rgba(0,75,255,0.3)",
          fontSize: "14px",
        }}
      >
        SW
      </div>
    ),
  },
  {
    id: "talisman",
    name: "Talisman",
    tagline: "Multi-chain · Polkadot native",
    icon: (
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white"
        style={{
          background: "linear-gradient(135deg, #d4a843 0%, #a07828 100%)",
          boxShadow: "0 2px 10px rgba(212,168,67,0.25)",
          fontSize: "12px",
        }}
      >
        TAL
      </div>
    ),
  },
];

/* ─────────────────────────────────────────────────────────────────── */
/* Inner screens                                                        */
/* ─────────────────────────────────────────────────────────────────── */

function TrustPill({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3 h-3 flex-shrink-0" style={{ color: "#34d399" }} />
      <span className="text-[11px] text-slate-500">{text}</span>
    </div>
  );
}

function ScreenSelect() {
  const { connect } = useWallet();

  return (
    <motion.div
      key="select"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
    >
      {/* Wallet list */}
      <div className="space-y-2.5">
        {EXTENSIONS.map((ext) => (
          <button
            key={ext.id}
            onClick={() => connect(ext.id)}
            className="w-full flex items-center gap-4 rounded-xl text-left transition-all duration-200 group"
            style={{
              padding: "14px 16px",
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.065)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(34,211,238,0.05)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(34,211,238,0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.065)";
            }}
          >
            {ext.icon}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="text-[13px] font-semibold text-white group-hover:text-cyan-100 transition-colors"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {ext.name}
                </span>
                {ext.recommended && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-[2px] rounded-md uppercase tracking-wider"
                    style={{
                      background: "rgba(34,211,238,0.12)",
                      border: "1px solid rgba(34,211,238,0.22)",
                      color: "#67e8f9",
                    }}
                  >
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">{ext.tagline}</p>
            </div>
            <ExternalLink
              className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0"
              style={{ color: "#22d3ee" }}
            />
          </button>
        ))}
      </div>

      {/* Trust copy */}
      <div
        className="mt-5 p-4 rounded-xl space-y-2"
        style={{
          background: "rgba(255,255,255,0.018)",
          border: "1px solid rgba(255,255,255,0.055)",
        }}
      >
        <TrustPill icon={Shield}      text="Your wallet remains under your control at all times." />
        <TrustPill icon={Lock}        text="We never store or request your seed phrase." />
        <TrustPill icon={CheckCircle} text="You approve every on-chain action individually." />
      </div>

      <p className="text-[10px] text-slate-700 text-center mt-4 leading-relaxed">
        Don&apos;t have a wallet?{" "}
        <a
          href="https://polkadot.js.org/extension/"
          target="_blank"
          rel="noreferrer"
          className="text-cyan-600 hover:text-cyan-400 transition-colors underline underline-offset-2"
        >
          Install Polkadot.js
        </a>
      </p>
    </motion.div>
  );
}

function ScreenConnecting({ extension }: { extension: WalletExtension }) {
  const ext = EXTENSIONS.find((e) => e.id === extension);
  return (
    <motion.div
      key="connecting"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center text-center py-4"
    >
      {/* Pulsing icon */}
      <div className="relative mb-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ animation: "pulse 2s ease-in-out infinite" }}
        >
          {ext?.icon && (
            <div className="scale-[1.6]">{ext.icon}</div>
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "#070a12", border: "1px solid rgba(34,211,238,0.3)" }}
        >
          <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#22d3ee" }} />
        </div>
      </div>

      <p className="text-[15px] font-semibold text-white mb-1.5" style={{ letterSpacing: "-0.01em" }}>
        Connecting to {ext?.name}
      </p>
      <p className="text-[12px] text-slate-500 leading-relaxed">
        Completing wallet connection.
      </p>

      <div
        className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-xl"
        style={{
          background: "rgba(34,211,238,0.05)",
          border: "1px solid rgba(34,211,238,0.15)",
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
        <span className="text-[11px] text-cyan-400">Connecting…</span>
      </div>

      <p className="text-[10px] text-slate-700 mt-4">
        This page will not request your seed phrase.
      </p>
    </motion.div>
  );
}

function ScreenConnected({ address }: { address: string }) {
  const { verify, disconnect } = useWallet();

  return (
    <motion.div
      key="connected"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Success indicator */}
      <div className="flex flex-col items-center mb-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
          style={{
            background: "rgba(52,211,153,0.12)",
            border: "1px solid rgba(52,211,153,0.25)",
            boxShadow: "0 0 24px rgba(52,211,153,0.08)",
          }}
        >
          <CheckCircle className="w-6 h-6" style={{ color: "#34d399" }} />
        </div>
        <p className="text-[15px] font-semibold text-white mb-1" style={{ letterSpacing: "-0.01em" }}>
          Wallet connected
        </p>
        <code
          className="text-[11px] font-mono px-3 py-1 rounded-lg"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#94a3b8",
          }}
        >
          {truncateAddress(address)}
        </code>
      </div>

      {/* Verify step */}
      <div
        className="p-4 rounded-xl mb-4"
        style={{
          background: "rgba(251,191,36,0.05)",
          border: "1px solid rgba(251,191,36,0.16)",
        }}
      >
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-[1px]" />
          <div>
            <p className="text-[12px] font-semibold text-amber-200 mb-1">Verification required</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Sign a one-time message to verify ownership. This costs no TAO and is not a transaction.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={verify}
        className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-[13px] py-3 transition-all duration-200"
        style={{
          background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
          color: "#04060d",
          boxShadow: "0 0 0 1px rgba(34,211,238,0.4), 0 4px 16px rgba(34,211,238,0.22), inset 0 1px 0 rgba(255,255,255,0.22)",
          letterSpacing: "-0.01em",
        }}
      >
        <Shield className="w-4 h-4" />
        Verify Wallet Ownership
      </button>

      <button
        onClick={disconnect}
        className="w-full mt-2 py-2 text-[11px] font-medium transition-colors duration-150"
        style={{ color: "#475569" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#f87171")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#475569")}
      >
        Disconnect and try another wallet
      </button>
    </motion.div>
  );
}

function ScreenVerifying() {
  return (
    <motion.div
      key="verifying"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col items-center text-center py-4"
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
      <p className="text-[15px] font-semibold text-white mb-1.5" style={{ letterSpacing: "-0.01em" }}>
        Verifying ownership
      </p>
      <p className="text-[12px] text-slate-500 leading-relaxed">
        Confirming wallet ownership.
      </p>
    </motion.div>
  );
}

function ScreenVerified({ address }: { address: string }) {
  const { closeModal } = useWallet();

  return (
    <motion.div
      key="verified"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center text-center py-2"
    >
      {/* Glow ring */}
      <div className="relative mb-6">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(34,211,238,0.18) 0%, transparent 70%)",
            transform: "scale(1.8)",
          }}
        />
        <div
          className="relative w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(34,211,238,0.1)",
            border: "1px solid rgba(34,211,238,0.3)",
            boxShadow: "0 0 32px rgba(34,211,238,0.15)",
          }}
        >
          <CheckCircle className="w-7 h-7" style={{ color: "#22d3ee" }} />
        </div>
      </div>

      <p className="text-[16px] font-bold text-white mb-1.5" style={{ letterSpacing: "-0.02em" }}>
        Wallet verified
      </p>
      <code
        className="text-[11px] font-mono px-3 py-1 rounded-lg mb-4"
        style={{
          background: "rgba(34,211,238,0.07)",
          border: "1px solid rgba(34,211,238,0.18)",
          color: "#67e8f9",
        }}
      >
        {truncateAddress(address)}
      </code>
      <p className="text-[12px] text-slate-500 leading-relaxed mb-6 max-w-[240px]">
        You&apos;re all set. You&apos;ll approve each transaction individually before anything executes on-chain.
      </p>

      <button
        onClick={closeModal}
        className="flex items-center gap-2 rounded-xl font-semibold text-[13px] px-6 py-2.5 transition-all duration-200"
        style={{
          background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
          color: "#04060d",
          boxShadow: "0 0 0 1px rgba(34,211,238,0.4), 0 4px 16px rgba(34,211,238,0.2)",
        }}
      >
        <CheckCircle className="w-4 h-4" />
        Get Started
      </button>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Modal shell                                                          */
/* ─────────────────────────────────────────────────────────────────── */

export function WalletConnectModal() {
  const { walletState, address, extension, isModalOpen, closeModal } = useWallet();

  const title: Record<string, string> = {
    disconnected: "Connect your wallet",
    connecting:   "Connecting…",
    connected:    "Wallet connected",
    verifying:    "Signing message…",
    verified:     "Ready to go",
  };

  const subtitle: Record<string, string> = {
    disconnected: "Select a Polkadot-compatible wallet to continue.",
    connecting:   "Communicating with your extension…",
    connected:    "One more step to confirm ownership.",
    verifying:    "Confirming your wallet signature…",
    verified:     "Your wallet is linked and verified.",
  };

  return (
    <AnimatePresence>
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(4,6,13,0.85)", backdropFilter: "blur(6px)" }}
            onClick={walletState === "connecting" || walletState === "verifying" ? undefined : closeModal}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-50 left-1/2 top-1/2"
            style={{ transform: "translate(-50%, -50%)", width: "400px" }}
          >
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(145deg, rgba(10,14,26,0.98) 0%, rgba(7,10,18,1) 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(34,211,238,0.05)",
              }}
            >
              {/* Top glow accent */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px]"
                style={{ background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.3), transparent)" }}
              />

              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div>
                  <p
                    className="font-bold text-white"
                    style={{ fontSize: "15px", letterSpacing: "-0.015em" }}
                  >
                    {title[walletState] ?? "Connect"}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {subtitle[walletState] ?? ""}
                  </p>
                </div>

                {walletState !== "connecting" && walletState !== "verifying" && (
                  <button
                    onClick={closeModal}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                    style={{ color: "#475569" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                      (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "#475569";
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="px-6 py-6">
                <AnimatePresence mode="wait">
                  {walletState === "disconnected" && <ScreenSelect key="select" />}
                  {walletState === "connecting"   && <ScreenConnecting key="connecting" extension={extension ?? "polkadotjs"} />}
                  {walletState === "connected"    && <ScreenConnected key="connected" address={address ?? ""} />}
                  {walletState === "verifying"    && <ScreenVerifying key="verifying" />}
                  {(walletState === "verified" || walletState === "pending_approval") && (
                    <ScreenVerified key="verified" address={address ?? ""} />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
