"use client";

import { Database, Radio, Archive, AlertTriangle } from "lucide-react";

export type DataSource =
  | "chain-live"
  | "chain-on-demand"
  | "subtensor-snapshot"
  | "subtensor-snapshot-stale"
  | "taostats-live"
  | "static-snapshot"
  | "static-snapshot-fallback"
  | "synthetic"
  | "unknown";

interface SourceMeta {
  label: string;
  detail: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Database;
  pulse: boolean;
}

const SOURCE_META: Record<DataSource, SourceMeta> = {
  "chain-live": {
    label: "Live chain",
    detail: "Direct from Subtensor",
    color: "#34d399",
    bgColor: "rgba(52,211,153,0.08)",
    borderColor: "rgba(52,211,153,0.2)",
    icon: Radio,
    pulse: true,
  },
  "chain-on-demand": {
    label: "Chain (on-demand)",
    detail: "Fetched on request",
    color: "#34d399",
    bgColor: "rgba(52,211,153,0.06)",
    borderColor: "rgba(52,211,153,0.15)",
    icon: Radio,
    pulse: false,
  },
  "subtensor-snapshot": {
    label: "Snapshot",
    detail: "Cached Subtensor data",
    color: "#22d3ee",
    bgColor: "rgba(34,211,238,0.06)",
    borderColor: "rgba(34,211,238,0.18)",
    icon: Database,
    pulse: false,
  },
  "subtensor-snapshot-stale": {
    label: "Snapshot (stale)",
    detail: "Cached data, may be outdated",
    color: "#fbbf24",
    bgColor: "rgba(251,191,36,0.06)",
    borderColor: "rgba(251,191,36,0.18)",
    icon: AlertTriangle,
    pulse: false,
  },
  "taostats-live": {
    label: "TaoStats",
    detail: "Via TaoStats API",
    color: "#a78bfa",
    bgColor: "rgba(167,139,250,0.06)",
    borderColor: "rgba(167,139,250,0.18)",
    icon: Database,
    pulse: true,
  },
  "static-snapshot": {
    label: "Static data",
    detail: "Built-in sample dataset",
    color: "#64748b",
    bgColor: "rgba(100,116,139,0.06)",
    borderColor: "rgba(100,116,139,0.18)",
    icon: Archive,
    pulse: false,
  },
  "static-snapshot-fallback": {
    label: "Fallback",
    detail: "Static fallback — live sources unavailable",
    color: "#f97316",
    bgColor: "rgba(249,115,22,0.06)",
    borderColor: "rgba(249,115,22,0.18)",
    icon: AlertTriangle,
    pulse: false,
  },
  synthetic: {
    label: "Simulated",
    detail: "Generated demo data",
    color: "#64748b",
    bgColor: "rgba(100,116,139,0.06)",
    borderColor: "rgba(100,116,139,0.18)",
    icon: Archive,
    pulse: false,
  },
  unknown: {
    label: "Unknown",
    detail: "Source not reported",
    color: "#64748b",
    bgColor: "rgba(100,116,139,0.04)",
    borderColor: "rgba(100,116,139,0.12)",
    icon: Database,
    pulse: false,
  },
};

function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s old`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m old`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h old`;
  return `${Math.round(seconds / 86400)}d old`;
}

interface DataSourceBadgeProps {
  source: DataSource | string | null;
  /** Snapshot age in seconds, shown when available */
  ageSec?: number | null;
  className?: string;
}

export function DataSourceBadge({ source, ageSec, className = "" }: DataSourceBadgeProps) {
  const key = (source && source in SOURCE_META ? source : "unknown") as DataSource;
  const meta = SOURCE_META[key];
  const Icon = meta.icon;

  const ageLabel = ageSec != null && ageSec > 0 ? formatAge(ageSec) : null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium ${className}`}
      style={{
        background: meta.bgColor,
        border: `1px solid ${meta.borderColor}`,
        color: meta.color,
      }}
      title={ageLabel ? `${meta.detail} · ${ageLabel}` : meta.detail}
    >
      {meta.pulse && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: meta.color, boxShadow: `0 0 4px ${meta.color}` }}
        />
      )}
      <Icon className="w-3 h-3" />
      <span>{meta.label}</span>
      {ageLabel && (
        <span style={{ opacity: 0.7 }}>· {ageLabel}</span>
      )}
    </div>
  );
}
