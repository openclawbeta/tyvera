import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { WalletProvider } from "@/lib/wallet-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <div className="flex min-h-screen" style={{ background: "var(--surface-1, #070a12)" }}>
        <AppSidebar />

        <div className="flex-1 ml-60 flex flex-col min-h-screen">
          {/* Topbar renders WalletConnectModal + WalletApprovalDialog internally */}
          <Topbar />

          {/* 52px topbar + 24px top padding */}
          <main className="flex-1 overflow-auto" style={{ marginTop: "52px", padding: "28px 28px 48px" }}>
            {children}
          </main>
        </div>
      </div>
    </WalletProvider>
  );
}
