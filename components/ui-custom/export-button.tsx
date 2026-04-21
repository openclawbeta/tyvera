"use client";

import { useState } from "react";
import { Download, Loader2, Lock } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { useEntitlement } from "@/lib/hooks/use-entitlement";

interface ExportButtonProps {
  /** The data type to export: subnets, validators, holders, portfolio */
  exportType: "subnets" | "validators" | "holders" | "portfolio";
  /** Optional label override */
  label?: string;
}

export function ExportButton({ exportType, label }: ExportButtonProps) {
  const { address, walletState, getAuthHeaders } = useWallet();
  const entitlement = useEntitlement(address ?? null);
  const [loading, setLoading] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  const canExport = entitlement.hasFeature("data_export");

  async function doExport(format: "csv" | "json") {
    setShowFormatMenu(false);
    if (!address || walletState !== "verified") return;

    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders({ method: "GET", pathname: "/api/export" });
      const res = await fetch(
        `/api/export?type=${exportType}&format=${format}`,
        { headers: authHeaders },
      );
      if (!res.ok) {
        console.error("[export] Failed:", res.status);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tyvera-${exportType}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[export] Error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!canExport) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/6 bg-white/[0.02] px-3 py-1.5 text-xs text-slate-500 opacity-60 cursor-not-allowed"
        title="Data export requires Analyst tier or above"
        aria-label="Data export locked — requires Analyst tier"
      >
        <Lock className="h-3 w-3" />
        Export
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowFormatMenu((prev) => !prev)}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
        aria-label={`Export ${label ?? exportType} data`}
        aria-haspopup="true"
        aria-expanded={showFormatMenu}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
        {label ?? "Export"}
      </button>

      {showFormatMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowFormatMenu(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full z-50 mt-1 rounded-lg border border-white/10 bg-[#0f1118] py-1 shadow-xl">
            <button
              onClick={() => doExport("csv")}
              className="flex w-full items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:bg-white/[0.06] hover:text-white"
              aria-label="Export as CSV"
            >
              <Download className="h-3 w-3" />
              CSV
            </button>
            <button
              onClick={() => doExport("json")}
              className="flex w-full items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:bg-white/[0.06] hover:text-white"
              aria-label="Export as JSON"
            >
              <Download className="h-3 w-3" />
              JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}
