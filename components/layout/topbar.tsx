"use client";

import { useState } from "react";
import { Bell, Settings, Menu } from "lucide-react";
import { LiveTicker } from "@/components/ui-custom/live-ticker";
import { WalletStatusChip } from "@/components/wallet/wallet-status-chip";
import { WalletConnectModal } from "@/components/wallet/wallet-connect-modal";
import { WalletApprovalDialog } from "@/components/wallet/wallet-approval-dialog";
import { useSidebar } from "@/lib/sidebar-context";
import Link from "next/link";

export function Topbar() {
  const { toggle } = useSidebar();
  const [bellTooltip, setBellTooltip] = useState(false);

  return (
    <>
      <header
        className="fixed top-0 right-0 left-0 lg:left-60 h-[52px] z-30 flex items-center px-4 gap-3"
        style={{
          background: "rgba(7,10,18,0.88)",
          borderBottom: "1px solid rgba(255,255,255,0.048)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        }}
      >
        {/* Hamburger — mobile only */}
        <button
          onClick={toggle}
          className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
          style={{ color: "#64748b" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLElement).style.color = "#94a3b8";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#64748b";
          }}
          aria-label="Toggle menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Live ticker */}
        <div className="flex-1 overflow-hidden min-w-0">
          <LiveTicker />
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* Bell — notifications coming soon */}
          <div className="relative">
            <button
              onClick={() => setBellTooltip((v) => !v)}
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
              aria-label="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
            {bellTooltip && (
              <div
                className="absolute right-0 top-full mt-2 px-3 py-2 rounded-lg text-[11px] text-slate-400 whitespace-nowrap z-50"
                style={{
                  background: "rgba(15,20,35,0.95)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                }}
              >
                Notifications coming soon
              </div>
            )}
          </div>

          {/* Settings link — hidden on mobile (accessible via sidebar) */}
          <Link href="/settings" className="hidden sm:block">
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
          <div className="w-px h-4 mx-0.5 hidden sm:block" style={{ background: "rgba(255,255,255,0.07)" }} />

          {/* Wallet status chip */}
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

      {/* Wallet modals */}
      <WalletConnectModal />
      <WalletApprovalDialog />
    </>
  );
}
