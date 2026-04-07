"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Plus,
  Settings2,
  TrendingDown,
  TrendingUp,
  Trash2,
  Zap,
} from "lucide-react";
import { cn, subnetGradient } from "@/lib/utils";
import type { SubnetDetailModel } from "@/lib/types/subnets";

/* ─────────────────────────────────────────────────────────────────── */
/* Types                                                                 */
/* ─────────────────────────────────────────────────────────────────── */

type AlertType = "yield_drop" | "yield_rise" | "emission_change" | "risk_change" | "staker_shift" | "custom";
type AlertSeverity = "info" | "warning" | "critical";
type AlertStatus = "active" | "triggered" | "dismissed";

interface AlertRule {
  id: string;
  type: AlertType;
  label: string;
  description: string;
  netuid: number | null;     // null = portfolio-wide
  threshold: number;
  enabled: boolean;
  createdAt: string;
}

interface AlertEvent {
  id: string;
  ruleId: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  netuid: number | null;
  subnetName: string | null;
  triggeredAt: string;
  value: number;
  threshold: number;
}

interface AlertsPanelProps {
  subnets: SubnetDetailModel[];
}

/* ─────────────────────────────────────────────────────────────────── */
/* Mock data                                                             */
/* ─────────────────────────────────────────────────────────────────── */

const MOCK_RULES: AlertRule[] = [
  {
    id: "rule-1",
    type: "yield_drop",
    label: "Yield drop > 5%",
    description: "Alert when any staked subnet yield drops more than 5% in 24h",
    netuid: null,
    threshold: 5,
    enabled: true,
    createdAt: "2026-04-01T10:00:00Z",
  },
  {
    id: "rule-2",
    type: "emission_change",
    label: "Emission spike on SN49",
    description: "Alert when Protein Folding emissions change by 20%+",
    netuid: 49,
    threshold: 20,
    enabled: true,
    createdAt: "2026-04-02T14:30:00Z",
  },
  {
    id: "rule-3",
    type: "risk_change",
    label: "Risk level change",
    description: "Alert when any portfolio subnet changes risk level",
    netuid: null,
    threshold: 1,
    enabled: false,
    createdAt: "2026-04-03T08:00:00Z",
  },
];

function generateMockEvents(subnets: SubnetDetailModel[]): AlertEvent[] {
  const now = Date.now();
  const events: AlertEvent[] = [];

  // Recent yield drop event
  const lowYieldSubnet = subnets.find((s) => s.yieldDelta7d < -1);
  if (lowYieldSubnet) {
    events.push({
      id: "evt-1",
      ruleId: "rule-1",
      type: "yield_drop",
      severity: Math.abs(lowYieldSubnet.yieldDelta7d) > 3 ? "critical" : "warning",
      status: "triggered",
      title: `${lowYieldSubnet.name} yield dropped`,
      message: `SN${lowYieldSubnet.netuid} yield fell ${Math.abs(lowYieldSubnet.yieldDelta7d).toFixed(1)}% over 7 days (now ${lowYieldSubnet.yield}%)`,
      netuid: lowYieldSubnet.netuid,
      subnetName: lowYieldSubnet.name,
      triggeredAt: new Date(now - 3_600_000 * 4).toISOString(),
      value: Math.abs(lowYieldSubnet.yieldDelta7d),
      threshold: 5,
    });
  }

  // Emission change event
  const highEmission = subnets.find((s) => s.emissions > 1);
  if (highEmission) {
    events.push({
      id: "evt-2",
      ruleId: "rule-2",
      type: "emission_change",
      severity: "info",
      status: "active",
      title: `${highEmission.name} emission update`,
      message: `SN${highEmission.netuid} daily emissions at ${highEmission.emissions}τ — monitoring for threshold breach`,
      netuid: highEmission.netuid,
      subnetName: highEmission.name,
      triggeredAt: new Date(now - 3_600_000 * 12).toISOString(),
      value: highEmission.emissions,
      threshold: 20,
    });
  }

  // Staker shift
  const popularSubnet = subnets.sort((a, b) => b.stakers - a.stakers)[0];
  if (popularSubnet) {
    events.push({
      id: "evt-3",
      ruleId: "rule-1",
      type: "staker_shift",
      severity: "info",
      status: "dismissed",
      title: `${popularSubnet.name} staker surge`,
      message: `SN${popularSubnet.netuid} staker count reached ${popularSubnet.stakers.toLocaleString()} — highest in tracked period`,
      netuid: popularSubnet.netuid,
      subnetName: popularSubnet.name,
      triggeredAt: new Date(now - 3_600_000 * 48).toISOString(),
      value: popularSubnet.stakers,
      threshold: 0,
    });
  }

  return events;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Sub-components                                                        */
/* ─────────────────────────────────────────────────────────────────── */

const TYPE_ICONS: Record<AlertType, typeof TrendingDown> = {
  yield_drop: TrendingDown,
  yield_rise: TrendingUp,
  emission_change: Zap,
  risk_change: AlertTriangle,
  staker_shift: TrendingUp,
  custom: Bell,
};

const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; border: string; text: string; dot: string }> = {
  info:     { bg: "bg-cyan-400/5",  border: "border-cyan-400/15", text: "text-cyan-300",    dot: "bg-cyan-400" },
  warning:  { bg: "bg-amber-400/5", border: "border-amber-400/15", text: "text-amber-300",  dot: "bg-amber-400" },
  critical: { bg: "bg-rose-400/5",  border: "border-rose-400/15",  text: "text-rose-400",   dot: "bg-rose-400" },
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "< 1h ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function AlertEventCard({ event, onDismiss }: { event: AlertEvent; onDismiss: (id: string) => void }) {
  const Icon = TYPE_ICONS[event.type] || Bell;
  const style = SEVERITY_STYLES[event.severity];

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-colors",
      event.status === "dismissed" ? "opacity-50 bg-white/[0.01] border-white/[0.04]" : `${style.bg} ${style.border}`,
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", style.bg, style.border, "border")}>
          <Icon className={cn("w-4 h-4", style.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
            <span className="text-xs font-semibold text-white">{event.title}</span>
            <span className="text-[10px] text-slate-600 ml-auto flex-shrink-0">{formatTimeAgo(event.triggeredAt)}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">{event.message}</p>
          {event.netuid && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className={cn(
                "w-4 h-4 rounded flex items-center justify-center text-[7px] font-bold text-white",
                `bg-gradient-to-br ${subnetGradient(event.netuid)}`,
              )}>
                {event.netuid}
              </div>
              <span className="text-[10px] text-slate-500">{event.subnetName}</span>
            </div>
          )}
        </div>
        {event.status !== "dismissed" && (
          <button
            onClick={() => onDismiss(event.id)}
            className="p-1 rounded hover:bg-white/[0.06] text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
            title="Dismiss"
          >
            <BellOff className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function AlertRuleCard({ rule, onToggle, onDelete }: { rule: AlertRule; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
      rule.enabled ? "bg-white/[0.03] border-white/[0.07]" : "bg-white/[0.01] border-white/[0.04] opacity-60",
    )}>
      <button
        onClick={() => onToggle(rule.id)}
        className={cn(
          "w-8 h-4 rounded-full relative transition-colors flex-shrink-0",
          rule.enabled ? "bg-cyan-500/30" : "bg-white/[0.08]",
        )}
      >
        <div className={cn(
          "w-3 h-3 rounded-full absolute top-0.5 transition-all",
          rule.enabled ? "left-4.5 bg-cyan-400" : "left-0.5 bg-slate-600",
        )}
          style={{ left: rule.enabled ? "18px" : "2px" }}
        />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white">{rule.label}</p>
        <p className="text-[10px] text-slate-500 truncate">{rule.description}</p>
      </div>
      {rule.netuid && (
        <div className={cn(
          "w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0",
          `bg-gradient-to-br ${subnetGradient(rule.netuid)}`,
        )}>
          {rule.netuid}
        </div>
      )}
      <button
        onClick={() => onDelete(rule.id)}
        className="p-1 rounded hover:bg-white/[0.06] text-slate-600 hover:text-rose-400 transition-colors flex-shrink-0"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Main component                                                        */
/* ─────────────────────────────────────────────────────────────────── */

export function AlertsPanel({ subnets }: AlertsPanelProps) {
  const [rules, setRules] = useState<AlertRule[]>(MOCK_RULES);
  const [events, setEvents] = useState<AlertEvent[]>(() => generateMockEvents(subnets));
  const [showRules, setShowRules] = useState(false);
  const [tab, setTab] = useState<"events" | "rules">("events");

  const activeEvents = events.filter((e) => e.status !== "dismissed");
  const dismissedEvents = events.filter((e) => e.status === "dismissed");

  const handleDismiss = (id: string) => {
    setEvents((prev) => prev.map((e) => e.id === id ? { ...e, status: "dismissed" as AlertStatus } : e));
  };

  const handleToggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 28px rgba(0,0,0,0.28)",
      }}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-cyan-300" />
            <span className="text-[11px] uppercase tracking-[0.12em] text-cyan-300 font-semibold">
              Alerts & Notifications
            </span>
            {activeEvents.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-cyan-400/15 text-cyan-300 border border-cyan-400/25">
                {activeEvents.length}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">
            Monitor yield drops, emission changes, and risk shifts.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTab("events")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors",
              tab === "events"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                : "bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:text-slate-300",
            )}
          >
            Events
          </button>
          <button
            onClick={() => setTab("rules")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors",
              tab === "rules"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                : "bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:text-slate-300",
            )}
          >
            <span className="flex items-center gap-1">
              <Settings2 className="w-3 h-3" />
              Rules
            </span>
          </button>
        </div>
      </div>

      {/* Events tab */}
      {tab === "events" && (
        <div className="space-y-3">
          {activeEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="w-6 h-6 text-slate-700 mb-3" />
              <p className="text-sm text-slate-500">No active alerts</p>
              <p className="text-xs text-slate-600 mt-1">Set up rules to start monitoring your portfolio.</p>
            </div>
          )}
          {activeEvents.map((event) => (
            <AlertEventCard key={event.id} event={event} onDismiss={handleDismiss} />
          ))}
          {dismissedEvents.length > 0 && (
            <>
              <button
                onClick={() => setShowRules(!showRules)}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-600 hover:text-slate-400 transition-colors mt-2"
              >
                {showRules ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {dismissedEvents.length} dismissed
              </button>
              {showRules && dismissedEvents.map((event) => (
                <AlertEventCard key={event.id} event={event} onDismiss={handleDismiss} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Rules tab */}
      {tab === "rules" && (
        <div className="space-y-3">
          {rules.map((rule) => (
            <AlertRuleCard key={rule.id} rule={rule} onToggle={handleToggleRule} onDelete={handleDeleteRule} />
          ))}
          <button
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/[0.08] text-xs text-slate-500 hover:text-cyan-300 hover:border-cyan-400/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add alert rule
          </button>
          <p className="text-[10px] text-slate-600 text-center">
            Custom alert rules with threshold configuration coming in the next update.
          </p>
        </div>
      )}
    </div>
  );
}
