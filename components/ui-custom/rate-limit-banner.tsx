"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, X, Clock } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

interface UsageCounter {
  used: number;
  limit: number;
  remaining: number | null;
}

interface UsageData {
  tier: string;
  resetsAt: string;
  counters: {
    api: UsageCounter;
    chat: UsageCounter;
  };
}

function timeUntilReset(resetsAt: string): string {
  const ms = new Date(resetsAt).getTime() - Date.now();
  if (ms <= 0) return "now";
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function RateLimitBanner() {
  const { address, walletState, getAuthHeaders } = useWallet();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const fetchUsage = useCallback(async () => {
    if (!address || walletState !== "verified") return;
    try {
      const authHeaders = await getAuthHeaders({ method: "GET", pathname: "/api/usage" });
      const res = await fetchWithTimeout("/api/usage", {
        timeoutMs: 6000,
        headers: authHeaders,
      });
      if (res.ok) {
        setUsage(await res.json());
      }
    } catch {
      // silent — banner is non-critical
    }
  }, [address, walletState, getAuthHeaders]);

  useEffect(() => {
    fetchUsage();
    // Refresh every 5 minutes
    const interval = setInterval(fetchUsage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  if (dismissed || !usage) return null;

  // Determine which counters are approaching limits
  const warnings: { label: string; used: number; limit: number; remaining: number }[] = [];

  const { api, chat } = usage.counters;

  if (api.limit > 0 && api.remaining !== null) {
    const pct = api.used / api.limit;
    if (pct >= 0.8) {
      warnings.push({ label: "API requests", used: api.used, limit: api.limit, remaining: api.remaining });
    }
  }

  if (chat.limit > 0 && chat.remaining !== null) {
    const pct = chat.used / chat.limit;
    if (pct >= 0.8) {
      warnings.push({ label: "AI queries", used: chat.used, limit: chat.limit, remaining: chat.remaining });
    }
  }

  if (warnings.length === 0) return null;

  const hasExhausted = warnings.some((w) => w.remaining === 0);
  const borderColor = hasExhausted ? "rgba(239,68,68,0.3)" : "rgba(251,191,36,0.3)";
  const bgColor = hasExhausted ? "rgba(239,68,68,0.06)" : "rgba(251,191,36,0.06)";
  const iconColor = hasExhausted ? "#f87171" : "#fbbf24";
  const textColor = hasExhausted ? "#fca5a5" : "#fde68a";

  return (
    <div
      className="mx-6 mt-4 rounded-xl px-4 py-3 flex items-center gap-3"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
      role="alert"
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: iconColor }} />

      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold" style={{ color: textColor }}>
          {hasExhausted ? "Rate limit reached" : "Approaching rate limit"}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: "#94a3b8" }}>
          {warnings.map((w, i) => (
            <span key={w.label}>
              {i > 0 && " · "}
              {w.label}: {w.used}/{w.limit} used
              {w.remaining === 0 ? " (exhausted)" : ` (${w.remaining} left)`}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px]" style={{ color: "#64748b" }}>
        <Clock className="w-3 h-3" />
        Resets in {timeUntilReset(usage.resetsAt)}
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-lg transition-colors hover:bg-white/[0.06] flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        aria-label="Dismiss rate limit warning"
      >
        <X className="w-3.5 h-3.5" style={{ color: "#64748b" }} />
      </button>
    </div>
  );
}
