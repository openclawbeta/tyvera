"use client";

import { Search, Bell, Settings } from "lucide-react";
import { LiveTicker } from "@/components/ui-custom/live-ticker";
import { WalletStatusChip } from "@/components/wallet/wallet-status-chip";
import { WalletConnectModal } from "@/components/wallet/wallet-connect-modal";
import { WalletApprovalDialog } from "@/components/wallet/wallet-approval-dialog";
import Link from "next/link";

export function Topbar() {
  return (
    <>
      <header
        className="fixed top-0 right-0 left-60 h-[52px] z-30 flex items-center px-5 gap-4"
        style={{
          background: "rgba(7,10,18,0.88)",
          borderBottom: "1px solid rgba(255,255,255,0.048)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        }}
      >
        {/* Live ticker */}
        <div className="flex-1 overflow-hidden min-w-0">
          <LiveTicker />
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* Search */}
          <button
            className="flex items-center gap-2 transition-all duration-200"
            style={{
              padding: "5px 12px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "#64748b",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.065)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.11)";
              (e.currentTarget as HTMLElement).style.color = "#94a3b8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
              (e.currentTarget as HTMLElement).style.color = "#64748b";
            }}
          >
            <Search className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs hidden lg:block whitespace-nowrap" style={{ letterSpacing: "-0.01em" }}>
              Search subnets…
            </span>
            <kbd
              className="hidden lg:block text-[9px] rounded px-1.5 py-0.5"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "#475569",
                fontFamily: "inherit",
              }}
            >
              ⌘K
            </kbd>
          </button>

          {/* Bell */}
          <button
            className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{ color: "#64748b" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLElement).style.color = "#94a3b8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "#64748b";
            }}
          >
            <Bell className="w-3.5 h-3.5" />
            <span
              className="absolute top-[7px] right-[7px] w-[7px] h-[7px] rounded-full"
              style={{
                background: "#22d3ee",
                boxShadow: "0 0 0 2px rgba(7,10,18,1), 0 0 6px rgba(34,211,238,0.5)",
              }}
            />
          </button>

          {/* Settings link */}
          <Link href="/settings">
            <button
              className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
              style={{ color: "#64748b" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLElement).style.color = "#94a3b8";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "#64748b";
              }}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </Link>

          {/* Divider */}
          <div className="w-px h-4 mx-0.5" style={{ background: "rgba(255,255,255,0.07)" }} />

          {/* Wallet status chip — live state */}
          <WalletStatusChip />

          {/* Divider */}
          <div className="w-px h-4 mx-0.5" style={{ background: "rgba(255,255,255,0.07)" }} />

          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white cursor-pointer transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
              boxShadow: "0 0 0 2px rgba(7,10,18,1)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 0 0 2px rgba(7,10,18,1), 0 0 0 3.5px rgba(124,58,237,0.35)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 0 0 2px rgba(7,10,18,1)";
            }}
          >
            O
          </div>
        </div>
      </header>

      {/* Wallet modals — rendered at topbar level so they portal above everything */}
      <WalletConnectModal />
      <WalletApprovalDialog />
    </>
  );
}
