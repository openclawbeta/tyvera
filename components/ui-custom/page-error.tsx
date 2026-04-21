"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface PageErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Page name for context, e.g. "Subnets" */
  pageName?: string;
}

export function PageError({ error, reset, pageName }: PageErrorProps) {
  useEffect(() => {
    console.error(`[${pageName ?? "page"} error]`, error);
  }, [error, pageName]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <AlertTriangle className="w-6 h-6 text-red-400" />
      </div>

      <h2 className="text-lg font-semibold text-white mb-2">
        {pageName ? `${pageName} failed to load` : "Something went wrong"}
      </h2>

      <p className="text-sm max-w-md mb-2" style={{ color: "#94a3b8" }}>
        An unexpected error occurred. This has been noted and we&apos;re working on it.
      </p>

      {error.digest && (
        <p className="text-[11px] font-mono mb-6" style={{ color: "#475569" }}>
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
          style={{
            background: "rgba(34,211,238,0.12)",
            border: "1px solid rgba(34,211,238,0.22)",
            color: "#22d3ee",
          }}
          aria-label="Try again"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#94a3b8",
          }}
          aria-label="Go to dashboard"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}
