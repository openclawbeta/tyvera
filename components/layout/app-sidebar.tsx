"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Network,
  Wallet,
  TrendingUp,
  Lightbulb,
  Bell,
  CreditCard,
  FileText,
  Settings,
  Zap,
  Shield,
  X,
  Activity,
  MessageSquare,
  FlaskConical,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/lib/sidebar-context";
import { useWallet } from "@/lib/wallet-context";
import { ALERT_BADGE_REFRESH_MS } from "@/lib/config";

const NAV_ITEMS = [
  { label: "Dashboard",       href: "/dashboard",       icon: LayoutDashboard },
  { label: "Metrics",         href: "/metrics",         icon: BarChart3 },
  { label: "AI Intel",        href: "/chat",            icon: MessageSquare },
  { label: "Subnets",         href: "/subnets",         icon: Network },
  { label: "Validators",      href: "/validators",      icon: Users },
  { label: "Holders",         href: "/holders",         icon: Wallet },
  { label: "Yield",           href: "/yield",           icon: TrendingUp },
  { label: "Portfolio",       href: "/portfolio",       icon: Wallet },
  { label: "Activity",        href: "/activity",        icon: Activity },
  { label: "Recommendations", href: "/recommendations", icon: Lightbulb },
  { label: "Alerts",          href: "/alerts",          icon: Bell },
  { label: "Backtest",        href: "/backtest",        icon: FlaskConical },
  { label: "Pricing",         href: "/pricing",         icon: CreditCard },
  { label: "Tax Report",      href: "/tax",             icon: FileText },
  { label: "Settings",        href: "/settings",        icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();
  const { address, walletState } = useWallet();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread alert count from server API
  useEffect(() => {
    if (!address) {
      setUnreadCount(0);
      return;
    }

    const fetchUnread = async () => {
      try {
        const res = await fetch(`/api/alerts?address=${address}&unread_only=true&limit=1`);
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unread ?? 0);
        }
      } catch {
        // silently fail — badge is non-critical
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, ALERT_BADGE_REFRESH_MS);
    return () => clearInterval(interval);
  }, [address]);

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
            // Show unread alert count for Alerts nav item
            const alertBadge =
              item.label === "Alerts" && unreadCount > 0
                ? String(unreadCount)
                : undefined;
            const isAlertBadge = item.label === "Alerts" && unreadCount > 0;

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

                  {alertBadge && (
                    <span
                      className="flex-shrink-0 text-[10px] font-bold tabular-nums"
                      style={{
                        background: isAlertBadge
                          ? "rgba(244,63,94,0.15)"
                          : "rgba(34,211,238,0.12)",
                        border: isAlertBadge
                          ? "1px solid rgba(244,63,94,0.2)"
                          : "1px solid rgba(34,211,238,0.2)",
                        borderRadius: "6px",
                        padding: "1px 6px",
                        color: isAlertBadge ? "#f87171" : "#67e8f9",
                      }}
                    >
                      {alertBadge}
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
          {/* Connection status */}
          {address ? (
            <div
              className="px-3 py-3 rounded-xl space-y-2"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: walletState === "verified" ? "#22d3ee" : "#4ade80",
                    boxShadow: `0 0 4px ${walletState === "verified" ? "rgba(34,211,238,0.6)" : "rgba(74,222,128,0.6)"}`,
                  }}
                />
                <span className="text-[10px] font-bold tracking-[0.04em] uppercase"
                  style={{ color: walletState === "verified" ? "#67e8f9" : "#86efac" }}>
                  {walletState === "verified" ? "Verified" : "Connected"}
                </span>
              </div>
            </div>
          ) : (
            <Link href="/login">
              <div
                className="px-3 py-3 rounded-xl text-center cursor-pointer transition-all duration-200"
                style={{
                  background: "rgba(34,211,238,0.08)",
                  border: "1px solid rgba(34,211,238,0.15)",
                }}
              >
                <span className="text-[11px] font-semibold text-cyan-400">Connect Wallet</span>
              </div>
            </Link>
          )}

          {/* Trust note */}
          <div className="flex items-center gap-2 px-1 py-0.5">
            <Shield className="w-3 h-3 text-slate-700 flex-shrink-0" />
            <span className="text-[10px] text-slate-700">
              You approve every move.
            </span>
          </div>

          {/* User row — only when connected */}
          {address && (
            <div
              className="flex items-center gap-2.5 px-2 py-2 rounded-xl cursor-pointer transition-all duration-200"
              style={{
                background: "transparent",
                border: "1px solid transparent",
              }}
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
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
                  boxShadow: "0 0 0 2px rgba(124,58,237,0.25)",
                }}
              >
                {address.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                  {address.slice(0, 6)}…{address.slice(-4)}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
