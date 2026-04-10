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

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex w-full flex-col gap-6 px-5 py-6">
      <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(160deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/16 bg-cyan-400/10 text-base font-bold text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
            τ
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight text-white">Tyvera</div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Capital Allocation Terminal</div>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/8 bg-white/[0.025] p-3 shadow-[0_16px_46px_rgba(0,0,0,0.22)]">
        <div className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</div>
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm transition-all"
                style={{
                  background: active ? "rgba(255,255,255,0.05)" : "transparent",
                  border: active ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                  color: active ? "#e2e8f0" : "#94a3b8",
                }}
              >
                {active && <span className="absolute inset-y-2 left-0 w-[2px] rounded-r-full bg-cyan-300" />}
                <Icon className="h-4 w-4 shrink-0" style={{ color: active ? "#67e8f9" : "#64748b" }} />
                <span className="font-medium tracking-tight">{item.label}</span>
                {active && <Sparkles className="ml-auto h-3.5 w-3.5 text-cyan-300/80" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-[24px] border border-cyan-400/12 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(34,211,238,0.025))] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
        <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
          <ShieldCheck className="h-4 w-4" />
          Source-aware by design
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Tyvera is moving toward an internal-data-first Bittensor intelligence stack with clearer fallback labeling and stronger trust boundaries.
        </p>
      </div>
    </div>
  );
}
