"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Network,
  Wallet,
  Lightbulb,
  CreditCard,
  Settings,
  Zap,
  Shield,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/lib/sidebar-context";
import { useWallet } from "@/lib/wallet-context";
import { truncateAddress } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard",       href: "/dashboard",       icon: LayoutDashboard },
  { label: "Subnets",         href: "/subnets",         icon: Network },
  { label: "Portfolio",       href: "/portfolio",       icon: Wallet },
  { label: "Recommendations", href: "/recommendations", icon: Lightbulb, badge: "3" },
  { label: "Billing",         href: "/billing",         icon: CreditCard },
  { label: "Settings",        href: "/settings",        icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();
  const { address, walletState } = useWallet();

  const isConnected = walletState !== "disconnected";

  // Close sidebar whenever the route changes (mobile nav tap)
  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-60 flex flex-col z-40",
          "transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          background: "linear-gradient(180deg, #07080f 0%, #060910 100%)",
          borderRight: "1px solid rgba(255,255,255,0.055)",
        }}
      >
        {/* Logo lockup */}
        <div
          className="px-5 py-[18px] flex-shrink-0 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                boxShadow: "0 0 0 1px rgba(34,211,238,0.3), 0 4px 12px rgba(34,211,238,0.2)",
              }}
            >
              <Zap className="w-[14px] h-[14px] text-black" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <div className="text-[13px] font-bold text-white tracking-[-0.02em]">
                Tyvera
              </div>
              <div className="text-[9.5px] text-slate-600 mt-[2px] font-medium tracking-[0.08em] uppercase">
                Bittensor Intelligence
              </div>
            </div>
          </Link>

          {/* Close button — mobile only */}
          <button
            onClick={close}
            className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "#475569" }}
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
          <div className="px-3 pt-1 pb-2.5">
            <span className="text-[9.5px] font-semibold text-slate-700 uppercase tracking-[0.1em]">
              Navigation
            </span>
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link key={item.href} href={item.href}>
                <div className={cn("nav-item group", isActive && "active")}>
                  <Icon
                    className={cn(
                      "w-[15px] h-[15px] flex-shrink-0 transition-colors duration-200",
                      isActive
                        ? "text-cyan-400"
                        : "text-slate-600 group-hover:text-slate-400",
                    )}
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                  <span className="flex-1 leading-none">{item.label}</span>

                  {item.badge && (
                    <span
                      className="flex-shrink-0 text-[10px] font-bold text-cyan-300 tabular-nums"
                      style={{
                        background: "rgba(34,211,238,0.12)",
                        border: "1px solid rgba(34,211,238,0.2)",
                        borderRadius: "6px",
                        padding: "1px 6px",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="px-3 py-3 flex-shrink-0 space-y-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.045)" }}
        >
          {/* Premium status — only shown when wallet is connected */}
          {isConnected && (
            <div
              className="px-3 py-3 rounded-xl space-y-2"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" style={{ boxShadow: "0 0 4px rgba(251,191,36,0.6)" }} />
                  <span className="text-[10px] font-bold text-amber-300 tracking-[0.04em] uppercase">
                    Premium
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 tabular-nums">30 days left</span>
              </div>
              <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: "33%",
                    background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                    boxShadow: "0 0 6px rgba(251,191,36,0.4)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Trust note */}
          <div className="flex items-center gap-2 px-1 py-0.5">
            <Shield className="w-3 h-3 text-slate-700 flex-shrink-0" />
            <span className="text-[10px] text-slate-700">
              You approve every move.
            </span>
          </div>

          {/* Wallet identity row — only render when a real address is present */}
          {address ? (
            <div
              className="flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all duration-200"
              style={{ background: "transparent", border: "1px solid transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.borderColor = "transparent";
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{
                  background: "rgba(34,211,238,0.1)",
                  border: "1px solid rgba(34,211,238,0.2)",
                }}
              >
                <Wallet className="w-3.5 h-3.5" style={{ color: "#22d3ee" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  {truncateAddress(address)}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2">
              <Wallet className="w-3 h-3 flex-shrink-0" style={{ color: "#334155" }} />
              <span className="text-[10px] text-slate-700">No wallet connected</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
