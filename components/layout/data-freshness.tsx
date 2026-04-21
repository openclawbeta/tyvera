"use client";

import { useEffect, useState } from "react";

/**
 * Lightweight data-freshness badge for the app header.
 * Fetches /api/health periodically and shows the age of subnets.json.
 *
 * - Green dot: data < 1 hour old
 * - Amber dot + label: data 1–6 hours old
 * - Red dot + label: data > 6 hours old or health check failed
 *
 * Renders nothing until the first health check succeeds (no layout shift).
 */

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

type FreshnessLevel = "fresh" | "warn" | "critical" | "unknown";

export function DataFreshnessIndicator() {
  const [level, setLevel] = useState<FreshnessLevel | null>(null);
  const [ageLabel, setAgeLabel] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) {
          if (!cancelled) {
            setLevel("unknown");
            setAgeLabel("Health check failed");
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        const dataInfo = data?.data;
        if (!dataInfo) {
          setLevel("unknown");
          setAgeLabel("No data status");
          return;
        }

        setLevel(dataInfo.level ?? "unknown");

        const ageMs = dataInfo.subnetsJsonAgeMs ?? 0;
        if (ageMs < 60_000) {
          setAgeLabel("< 1m ago");
        } else if (ageMs < 3_600_000) {
          setAgeLabel(`${Math.round(ageMs / 60_000)}m ago`);
        } else {
          setAgeLabel(`${(ageMs / 3_600_000).toFixed(1)}h ago`);
        }
      } catch {
        if (!cancelled) {
          setLevel("unknown");
          setAgeLabel("Unreachable");
        }
      }
    }

    check();
    const timer = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Don't render until first check completes
  if (level === null) return null;

  const dotColor =
    level === "fresh"
      ? "bg-emerald-400"
      : level === "warn"
        ? "bg-amber-400"
        : "bg-red-400";

  const dotGlow =
    level === "fresh"
      ? "0 0 4px rgba(52,211,153,0.6)"
      : level === "warn"
        ? "0 0 4px rgba(251,191,36,0.5)"
        : "0 0 4px rgba(248,113,113,0.5)";

  const textColor =
    level === "fresh"
      ? "text-slate-500"
      : level === "warn"
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div
      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5"
      style={{
        borderColor:
          level === "fresh"
            ? "rgba(255,255,255,0.08)"
            : level === "warn"
              ? "rgba(251,191,36,0.18)"
              : "rgba(248,113,113,0.18)",
        background:
          level === "fresh"
            ? "rgba(255,255,255,0.03)"
            : level === "warn"
              ? "rgba(251,191,36,0.06)"
              : "rgba(248,113,113,0.06)",
      }}
      title={`Subnet data last updated ${ageLabel}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`}
        style={{ boxShadow: dotGlow }}
      />
      <span className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${textColor}`}>
        {level === "fresh" ? "Data live" : `Data ${ageLabel}`}
      </span>
    </div>
  );
}
