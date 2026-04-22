"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, ChevronDown, Loader2, CheckCircle, AlertCircle,
  LogOut, Shield, Settings, Copy, ExternalLink,
} from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { truncateAddress } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────── */
/* Dropdown menu when connected/verified                                */
/* ─────────────────────────────────────────────────────────────────── */

function WalletDropdown({
  address,
  isVerified,
  onVerify,
  onDisconnect,
  onClose,
}: {
  address: string;
  isVerified: boolean;
  onVerify: () => void;
  onDisconnect: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
    setTimeout(onClose, 1700);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -4 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="wallet-panel absolute right-0 top-[calc(100%+8px)] w-72 z-50 rounded-2xl overflow-hidden"
      style={{
        boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 16px 48px rgba(0,0,0,0.35), 0 0 32px rgba(34,211,238,0.04)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Status badge */}
        <div className="flex items-center justify-between mb-3">
          {isVerified ? (
            <span
              className="flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(34,211,238,0.1)",
                border: "1px solid rgba(34,211,238,0.22)",
                color: "#22d3ee",
              }}
            >
              <CheckCircle className="w-2.5 h-2.5" />
              Verified
            </span>
          ) : (
            <span
              className="flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.22)",
                color: "#fbbf24",
              }}
            >
              <AlertCircle className="w-2.5 h-2.5" />
              Not verified
            </span>
          )}
          <span className="text-[9.5px] text-slate-700">Polkadot.js</span>
        </div>

        {/* Address */}
        <div
          className="flex items-center justify-between px-3 py-2 rounded-lg"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <code className="text-[11px] font-mono text-slate-400">{truncateAddress(address)}</code>
          <div className="flex items-center gap-2">
            <button
              onClick={copy}
              className="transition-colors"
              style={{ color: copied ? "#22d3ee" : "#475569" }}
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              className="transition-colors"
              style={{ color: "#475569" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#94a3b8")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#475569")}
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-2">
        {!isVerified && (
          <button
            onClick={() => { onVerify(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left"
            style={{ color: "#fbbf24" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.07)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <Shield className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-[12px] font-semibold">Verify wallet ownership</span>
          </button>
        )}

        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left"
          style={{ color: "#64748b" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
            (e.currentTarget as HTMLElement).style.color = "#94a3b8";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#64748b";
          }}
        >
          <Settings className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-[12px] font-medium">Wallet settings</span>
        </button>

        <div className="h-px mx-2 my-1" style={{ background: "rgba(255,255,255,0.05)" }} />

        <button
          onClick={() => { onDisconnect(); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left"
          style={{ color: "#64748b" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(244,63,94,0.06)";
            (e.currentTarget as HTMLElement).style.color = "#f87171";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#64748b";
          }}
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-[12px] font-medium">Disconnect wallet</span>
        </button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Main chip                                                            */
/* ─────────────────────────────────────────────────────────────────── */

export function WalletStatusChip() {
  const { walletState, address, openModal, disconnect, verify } = useWallet();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const isVerified = walletState === "verified" || walletState === "pending_approval";
  const isConnected = walletState === "connected" || isVerified;

  /* ── Disconnected ── */
  if (walletState === "disconnected") {
    return (
      <button
        onClick={openModal}
        className="flex items-center gap-2 font-semibold transition-all duration-200"
        style={{
          padding: "5px 12px",
          borderRadius: "10px",
          fontSize: "12px",
          letterSpacing: "-0.01em",
          background: "linear-gradient(135deg, rgba(34,211,238,0.12) 0%, rgba(14,165,233,0.08) 100%)",
          border: "1px solid rgba(34,211,238,0.22)",
          color: "#67e8f9",
          boxShadow: "0 0 12px rgba(34,211,238,0.06)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "linear-gradient(135deg, rgba(34,211,238,0.18) 0%, rgba(14,165,233,0.12) 100%)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(34,211,238,0.35)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(34,211,238,0.1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "linear-gradient(135deg, rgba(34,211,238,0.12) 0%, rgba(14,165,233,0.08) 100%)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(34,211,238,0.22)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px rgba(34,211,238,0.06)";
        }}
      >
        <Wallet className="w-3.5 h-3.5" />
        Connect Wallet
      </button>
    );
  }

  /* ── Connecting ── */
  if (walletState === "connecting") {
    return (
      <div
        className="flex items-center gap-2"
        style={{
          padding: "5px 12px",
          borderRadius: "10px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          color: "#64748b",
          fontSize: "12px",
        }}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#22d3ee" }} />
        <span className="text-[11px]">Connecting…</span>
      </div>
    );
  }

  /* ── Pending approval ── */
  if (walletState === "pending_approval") {
    return (
      <div
        className="flex items-center gap-2"
        style={{
          padding: "5px 12px",
          borderRadius: "10px",
          background: "rgba(251,191,36,0.07)",
          border: "1px solid rgba(251,191,36,0.2)",
          fontSize: "12px",
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
        <span className="text-[11px] font-semibold" style={{ color: "#fbbf24" }}>
          Approval pending
        </span>
      </div>
    );
  }

  /* ── Connected or Verified ── */
  if (isConnected && address) {
    return (
      <div ref={containerRef} className="relative">
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex items-center gap-1.5 transition-all duration-200"
          style={{
            padding: "5px 10px",
            borderRadius: "10px",
            border: isVerified
              ? "1px solid rgba(34,211,238,0.22)"
              : "1px solid rgba(251,191,36,0.2)",
            background: isVerified
              ? "rgba(34,211,238,0.06)"
              : "rgba(251,191,36,0.06)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = isVerified
              ? "rgba(34,211,238,0.1)"
              : "rgba(251,191,36,0.1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = isVerified
              ? "rgba(34,211,238,0.06)"
              : "rgba(251,191,36,0.06)";
          }}
        >
          {/* Status dot */}
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: isVerified ? "#22d3ee" : "#fbbf24",
              boxShadow: isVerified
                ? "0 0 5px rgba(34,211,238,0.6)"
                : "0 0 5px rgba(251,191,36,0.6)",
            }}
          />
          <Wallet
            className="w-3 h-3 flex-shrink-0"
            style={{ color: isVerified ? "#22d3ee" : "#fbbf24" }}
          />
          <span
            className="text-[11px] font-mono font-medium"
            style={{ color: isVerified ? "#a5f3fc" : "#fde68a" }}
          >
            {truncateAddress(address)}
          </span>
          <ChevronDown
            className="w-3 h-3 transition-transform duration-200"
            style={{
              color: isVerified ? "#164e63" : "#713f12",
              transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <WalletDropdown
              address={address}
              isVerified={isVerified}
              onVerify={verify}
              onDisconnect={disconnect}
              onClose={() => setDropdownOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
}
