"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  Radar,
  ShieldCheck,
  Settings,
  Users,
  Wallet,
  LineChart,
  FlaskConical,
  MessageSquare,
  Coins,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Subnets", href: "/subnets", icon: BarChart3 },
  { label: "Holders", href: "/holders", icon: Wallet },
  { label: "Validator Sets", href: "/validators", icon: Users },
  { label: "Recommendations", href: "/recommendations", icon: Radar },
  { label: "Portfolio", href: "/portfolio", icon: Coins },
  { label: "Metrics", href: "/metrics", icon: LineChart },
  { label: "Backtest", href: "/backtest", icon: FlaskConical },
  { label: "Chat", href: "/chat", icon: MessageSquare },
  { label: "Risk", href: "/risk-disclosure", icon: AlertTriangle },
  { label: "Settings", href: "/settings", icon: Settings },
];

const INK = "#0F0F12";
const SUB = "#6B6860";
const HAIR = "#ECEBE7";
const SOFT = "#F7F5F1";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex w-full flex-col gap-6 px-5 py-6">
      {/* Brand card */}
      <div
        className="rounded-[24px] px-4 py-4"
        style={{
          border: `1px solid ${HAIR}`,
          background: "#FFFFFF",
          boxShadow: "0 1px 2px rgba(15,15,18,0.04)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-base font-bold"
            style={{
              background:
                "linear-gradient(135deg, #C9B8FF 0%, #FFD7BA 50%, #A7F0D2 100%)",
              color: INK,
            }}
          >
            τ
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight" style={{ color: INK }}>
              Tyvera
            </div>
            <div
              className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.24em]"
              style={{ color: SUB }}
            >
              Capital Allocation Terminal
            </div>
          </div>
        </div>
      </div>

      {/* Nav card */}
      <div
        className="rounded-[24px] p-3"
        style={{
          border: `1px solid ${HAIR}`,
          background: "#FFFFFF",
          boxShadow: "0 1px 2px rgba(15,15,18,0.04)",
        }}
      >
        <div
          className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: SUB }}
        >
          Workspace
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm transition-all"
                style={{
                  background: active ? INK : "transparent",
                  border: active ? `1px solid ${INK}` : "1px solid transparent",
                  color: active ? "#FAF9F7" : SUB,
                }}
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color: active ? "#FAF9F7" : SUB }} />
                <span className="font-medium tracking-tight">{item.label}</span>
                {active && <Sparkles className="ml-auto h-3.5 w-3.5" style={{ color: "#C9B8FF" }} />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Trust card */}
      <div
        className="rounded-[24px] p-4"
        style={{
          border: `1px solid ${HAIR}`,
          background: "#EFE8FF",
          boxShadow: "0 1px 2px rgba(15,15,18,0.04)",
        }}
      >
        <div
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: "#5B4BC9" }}
        >
          <ShieldCheck className="h-4 w-4" />
          Source-aware by design
        </div>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: SUB }}>
          Tyvera is moving toward an internal-data-first Bittensor intelligence stack with clearer fallback labeling and stronger trust boundaries.
        </p>
      </div>
    </div>
  );
}
