import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { GlobalTicker } from "@/components/layout/global-ticker";
import { DataFreshnessIndicator } from "@/components/layout/data-freshness";
import { MobileNavToggle } from "@/components/layout/mobile-nav";
import { RateLimitBanner } from "@/components/ui-custom/rate-limit-banner";
import { PageTracker } from "@/components/layout/page-tracker";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { WalletConnectModal } from "@/components/wallet/wallet-connect-modal";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="aurora-shell min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 20% -10%, rgba(201,184,255,0.22), transparent 42%), radial-gradient(circle at 80% -5%, rgba(255,215,186,0.18), transparent 40%), var(--aurora-cream)",
        color: "var(--aurora-ink)",
      }}
    >
      <PageTracker />
      <GlobalTicker />

      <div className="flex min-h-screen overflow-x-clip pt-8">
        <aside
          className="sticky top-8 hidden min-h-[calc(100vh-2rem)] shrink-0 self-start lg:flex lg:w-[248px] xl:w-[276px]"
          style={{
            borderRight: "1px solid var(--aurora-hair)",
            background: "var(--surface-1)",
            backdropFilter: "blur(12px)",
          }}
        >
          <AppSidebar />
        </aside>

        <div className="min-w-0 flex-1 overflow-x-hidden">
          <div
            className="sticky top-8 z-20 tyvera-topbar"
            style={{
              borderBottom: "1px solid var(--aurora-hair)",
              backdropFilter: "blur(14px)",
            }}
          >
            <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <MobileNavToggle />
                <div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-[0.22em]"
                    style={{ color: "var(--aurora-sub)" }}
                  >
                    Tyvera Terminal
                  </div>
                  <div
                    className="mt-1 text-sm tracking-tight"
                    style={{ color: "var(--aurora-ink)" }}
                  >
                    Bittensor intelligence workspace
                  </div>
                </div>
              </div>

              <div
                className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] md:flex"
                style={{ color: "var(--aurora-sub)" }}
              >
                <DataFreshnessIndicator />
                <span
                  className="rounded-full px-3 py-1.5"
                  style={{
                    border: "1px solid var(--aurora-hair)",
                    background: "var(--surface-2)",
                  }}
                >
                  Live routes
                </span>
                <span
                  className="rounded-full px-3 py-1.5"
                  style={{
                    border: "1px solid rgba(201,184,255,0.35)",
                    background: "rgba(201,184,255,0.18)",
                    color: "var(--aurora-lavender)",
                  }}
                >
                  Source aware
                </span>
                <span
                  className="rounded-full px-3 py-1.5"
                  style={{
                    border: "1px solid var(--aurora-hair)",
                    background: "var(--surface-2)",
                  }}
                >
                  Beta
                </span>
                <ThemeToggle size="sm" />
              </div>
            </div>
          </div>

          <RateLimitBanner />

          <div className="mx-auto w-full max-w-[1600px] px-3 py-6 sm:px-5 lg:px-6 lg:py-8 xl:px-8">
            <div
              className="min-h-[calc(100vh-9rem)] overflow-x-hidden rounded-[30px] tyvera-content-card"
              style={{
                border: "1px solid var(--aurora-hair)",
                background: "var(--surface-1)",
              }}
            >
              <div className="min-w-0 p-4 sm:p-5 lg:p-7 xl:p-8">{children}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Global wallet connect modal — any (app) page can call openModal() */}
      <WalletConnectModal />
    </div>
  );
}
