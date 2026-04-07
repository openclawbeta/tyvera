import { AppSidebar } from "@/components/layout/app-sidebar";
import { GlobalTicker } from "@/components/layout/global-ticker";
import { Topbar } from "@/components/layout/topbar";
import { WalletProvider } from "@/lib/wallet-context";
import { SidebarProvider } from "@/lib/sidebar-context";
import { EntitlementProvider } from "@/components/entitlement/entitlement-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <EntitlementProvider>
      <SidebarProvider>
        <div className="flex min-h-screen" style={{ background: "var(--surface-1, #070a12)" }}>
          <AppSidebar />

          {/* On mobile: full width (no left margin). On desktop: offset by sidebar width. */}
          <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
            {/* Global ticker at the very top (32px) */}
            <GlobalTicker />

            {/* Topbar renders WalletConnectModal + WalletApprovalDialog internally */}
            <Topbar />

            {/* 32px ticker + 52px topbar + page content = 84px offset */}
            <main
              className="flex-1 overflow-auto px-4 sm:px-6 lg:px-7"
              style={{ marginTop: "84px", paddingTop: "20px", paddingBottom: "48px" }}
            >
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
      </EntitlementProvider>
    </WalletProvider>
  );
}
