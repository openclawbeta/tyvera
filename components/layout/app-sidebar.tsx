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
    <div className="w-full px-5 py-6 flex flex-col gap-6">
      <div className="px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-400/12 border border-cyan-400/15 flex items-center justify-center text-cyan-300 font-bold">
            τ
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight">Tyvera</div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Market Terminal</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold px-2 pb-2">Workspace</div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                  active
                    ? "bg-white text-black shadow-[0_8px_30px_rgba(255,255,255,0.12)]"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <item.icon className={`w-4 h-4 ${active ? "text-black" : "text-slate-500 group-hover:text-cyan-300"}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(34,211,238,0.02))] p-4">
        <div className="flex items-center gap-2 text-cyan-300 text-sm font-semibold">
          <ShieldCheck className="w-4 h-4" />
          Source-aware by design
        </div>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          Tyvera is evolving into an internal-data-first Bittensor intelligence stack with explicit fallback labeling.
        </p>
      </div>
    </div>
  );
}
