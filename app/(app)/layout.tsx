import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { GlobalTicker } from "@/components/layout/global-ticker";
import { DataFreshnessIndicator } from "@/components/layout/data-freshness";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_24%),radial-gradient(circle_at_80%_12%,rgba(59,130,246,0.08),transparent_22%),linear-gradient(180deg,#05070b_0%,#070913_48%,#05070b_100%)] text-white">
      <GlobalTicker />

      <div className="flex min-h-screen overflow-x-clip pt-8">
        <aside className="sticky top-8 hidden min-h-[calc(100vh-2rem)] shrink-0 self-start border-r border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] backdrop-blur-2xl lg:flex lg:w-[248px] xl:w-[276px]">
          <AppSidebar />
        </aside>

        <div className="min-w-0 flex-1 overflow-x-hidden">
          <div className="sticky top-8 z-20 border-b border-white/8 bg-[linear-gradient(180deg,rgba(10,12,18,0.88),rgba(8,10,16,0.72))] backdrop-blur-2xl shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
            <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Tyvera Terminal</div>
                <div className="mt-1 text-sm tracking-tight text-slate-300">Bittensor intelligence workspace</div>
              </div>

              <div className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:flex">
                <DataFreshnessIndicator />
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">Live routes</span>
                <span className="rounded-full border border-cyan-400/12 bg-cyan-400/[0.05] px-3 py-1.5 text-cyan-300">Source aware</span>
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">Beta</span>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[1600px] px-3 py-6 sm:px-5 lg:px-6 lg:py-8 xl:px-8">
            <div className="min-h-[calc(100vh-9rem)] overflow-x-hidden rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.034),rgba(255,255,255,0.013))] shadow-[0_30px_100px_rgba(0,0,0,0.42),0_0_0_1px_rgba(255,255,255,0.025)_inset,0_0_34px_rgba(79,124,255,0.04)]">
              <div className="min-w-0 p-4 sm:p-5 lg:p-7 xl:p-8">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
