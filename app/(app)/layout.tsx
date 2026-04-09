import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { GlobalTicker } from "@/components/layout/global-ticker";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070b] text-white">
      <GlobalTicker />
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex lg:w-[272px] xl:w-[288px] border-r border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] backdrop-blur-2xl pt-8 mt-8 sticky top-8 self-start min-h-[calc(100vh-2rem)]">
          <AppSidebar />
        </aside>

        <div className="flex-1 min-w-0 mt-8">
          <div className="border-b border-white/6 bg-black/30 backdrop-blur-xl sticky top-8 z-20">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Tyvera Terminal</div>
                <div className="text-sm text-slate-300 mt-0.5">Bittensor intelligence workspace</div>
              </div>
              <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-500 uppercase tracking-[0.18em]">
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">Live routes</span>
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">Source aware</span>
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">Beta</span>
              </div>
            </div>
          </div>

          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            <div className="rounded-[28px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] shadow-[0_30px_100px_rgba(0,0,0,0.35)] min-h-[calc(100vh-9rem)] overflow-hidden">
              <div className="p-4 sm:p-6 lg:p-8">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
