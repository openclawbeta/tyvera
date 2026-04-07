"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Trash2,
  Plus,
  AlertTriangle,
  TrendingDown,
  Waves,
  Star,
  Zap,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { StatCard } from "@/components/ui-custom/stat-card";
import { getSubnets, fetchSubnetsFromApi } from "@/lib/api/subnets";
import {
  getAlertRules,
  saveAlertRule,
  deleteAlertRule,
  toggleAlertRule,
  getAlertHistory,
  acknowledgeAlert,
  evaluateAlerts,
  getAlertPresets,
} from "@/lib/api/alerts";
import type { AlertRule, AlertEvent, AlertPreset } from "@/lib/types/alerts";
import type { SubnetDetailModel } from "@/lib/types/subnets";

const PRESET_ICONS: Record<string, React.ReactNode> = {
  TrendingDown: <TrendingDown className="w-5 h-5" />,
  Waves: <Waves className="w-5 h-5" />,
  AlertTriangle: <AlertTriangle className="w-5 h-5" />,
  Star: <Star className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
};

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertEvent[]>([]);
  const [subnets, setSubnets] = useState<SubnetDetailModel[]>([]);
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "unacknowledged">("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const initialSubnets = getSubnets();
    setSubnets(initialSubnets);
    const initialRules = getAlertRules();
    setRules(initialRules);
    const initialHistory = getAlertHistory();
    setHistory(initialHistory);

    // Evaluate alerts immediately on mount
    const newEvents = evaluateAlerts(initialRules, initialSubnets);
    if (newEvents.length > 0) {
      setToastMessage(`${newEvents.length} new alert${newEvents.length !== 1 ? "s" : ""} triggered`);
      setTimeout(() => setToastMessage(null), 4000);
      setHistory(getAlertHistory());
    }

    // Fetch fresh subnet data
    fetchSubnetsFromApi()
      .then((fresh) => {
        setSubnets(fresh);
        const moreEvents = evaluateAlerts(initialRules, fresh);
        if (moreEvents.length > 0) {
          setHistory(getAlertHistory());
        }
      })
      .catch(() => {
        /* Alerts page can still function with initial snapshot data */
      });
  }, []);

  // Polling: re-evaluate every 5 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fresh = await fetchSubnetsFromApi();
        setSubnets(fresh);
        const currentRules = getAlertRules();
        const newEvents = evaluateAlerts(currentRules, fresh);
        if (newEvents.length > 0) {
          setHistory(getAlertHistory());
          setToastMessage(`${newEvents.length} new alert${newEvents.length !== 1 ? "s" : ""} triggered`);
          setTimeout(() => setToastMessage(null), 4000);
        }
      } catch {
        // silently fail
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Compute summary stats
  const activeRules = rules.filter((r) => r.enabled).length;
  const triggeredToday = history.filter((e) => {
    const trigger = new Date(e.triggeredAt);
    const now = new Date();
    return (
      trigger.toDateString() === now.toDateString() &&
      !e.acknowledged
    );
  }).length;
  const unacknowledged = history.filter((e) => !e.acknowledged).length;

  const filteredHistory =
    historyFilter === "unacknowledged"
      ? history.filter((e) => !e.acknowledged)
      : history;

  return (
    <div className="min-h-screen w-full" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a1f35 100%)" }}>
      {/* Toast notification */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-24 left-1/2 z-50 -translate-x-1/2"
        >
          <GlassCard glow="emerald" padding="md" className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-slate-300">{toastMessage}</span>
          </GlassCard>
        </motion.div>
      )}

      {/* Page content */}
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <PageHeader
          title="Smart Alerts"
          subtitle="Custom notifications for subnet changes"
        />

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0, ease: [0.22, 1, 0.36, 1] }}
          >
            <StatCard
              label="Active Rules"
              value={String(activeRules)}
              accent="cyan"
              index={0}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            <StatCard
              label="Triggered Today"
              value={String(triggeredToday)}
              accent="amber"
              index={1}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
          >
            <StatCard
              label="Unacknowledged"
              value={String(unacknowledged)}
              accent="rose"
              index={2}
            />
          </motion.div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* LEFT: Your Rules */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                Your Rules
              </h2>

              <div className="space-y-3">
                {rules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    subnets={subnets}
                    onToggle={() => {
                      toggleAlertRule(rule.id);
                      setRules(getAlertRules());
                    }}
                    onDelete={() => {
                      deleteAlertRule(rule.id);
                      setRules(getAlertRules());
                    }}
                  />
                ))}

                {/* Create Rule Form */}
                {showNewRuleForm ? (
                  <CreateRuleForm
                    subnets={subnets}
                    onSave={(newRule) => {
                      saveAlertRule(newRule);
                      setRules(getAlertRules());
                      setShowNewRuleForm(false);
                    }}
                    onCancel={() => setShowNewRuleForm(false)}
                  />
                ) : (
                  <button
                    onClick={() => setShowNewRuleForm(true)}
                    className="w-full mt-4 px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200"
                    style={{
                      background: "rgba(34, 211, 238, 0.08)",
                      border: "1px solid rgba(34, 211, 238, 0.2)",
                      color: "#22d3ee",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(34, 211, 238, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(34, 211, 238, 0.08)";
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-semibold">Create Rule</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>

          {/* RIGHT: Alert History */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Alert History
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setHistoryFilter("all")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      historyFilter === "all"
                        ? "bg-cyan-400/20 text-cyan-300"
                        : "text-slate-500 hover:text-slate-400"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setHistoryFilter("unacknowledged")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      historyFilter === "unacknowledged"
                        ? "bg-rose-400/20 text-rose-300"
                        : "text-slate-500 hover:text-slate-400"
                    }`}
                  >
                    Unacknowledged
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto">
                {filteredHistory.length === 0 ? (
                  <GlassCard padding="md" className="text-center py-8">
                    <p className="text-sm text-slate-500">No alerts yet</p>
                  </GlassCard>
                ) : (
                  filteredHistory
                    .sort(
                      (a, b) =>
                        new Date(b.triggeredAt).getTime() -
                        new Date(a.triggeredAt).getTime()
                    )
                    .map((event) => (
                      <AlertEventCard
                        key={event.id}
                        event={event}
                        onAcknowledge={() => {
                          acknowledgeAlert(event.id);
                          setHistory(getAlertHistory());
                        }}
                      />
                    ))
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Quick Setup: Presets */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12"
        >
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            Quick Setup
          </h2>

          <div className="flex gap-4 overflow-x-auto pb-4">
            {getAlertPresets().map((preset) => (
              <PresetCard
                key={preset.name}
                preset={preset}
                onEnable={() => {
                  preset.rules.forEach((ruleData) => {
                    const newRule: AlertRule = {
                      id: `rule-${Date.now()}-${Math.random()}`,
                      ...ruleData,
                      createdAt: new Date().toISOString(),
                      lastTriggered: null,
                      triggerCount: 0,
                    };
                    saveAlertRule(newRule);
                  });
                  setRules(getAlertRules());
                  setToastMessage(`"${preset.name}" preset enabled`);
                  setTimeout(() => setToastMessage(null), 3000);
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Rule Card Component ──────────────────────────────────────────────

interface RuleCardProps {
  rule: AlertRule;
  subnets: SubnetDetailModel[];
  onToggle: () => void;
  onDelete: () => void;
}

function RuleCard({ rule, subnets, onToggle, onDelete }: RuleCardProps) {
  const conditionText = formatCondition(rule, subnets);
  const lastTriggeredText = rule.lastTriggered
    ? formatTime(rule.lastTriggered)
    : "Never";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
    >
      <GlassCard
        padding="md"
        className={`${!rule.enabled ? "opacity-60" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">
              {rule.name}
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-snug">
              {conditionText}
            </p>
            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
              <span>Last: {lastTriggeredText}</span>
              {rule.triggerCount > 0 && (
                <span
                  className="px-2 py-0.5 rounded-md font-semibold"
                  style={{
                    background: "rgba(34, 211, 238, 0.12)",
                    color: "#22d3ee",
                  }}
                >
                  {rule.triggerCount} times
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Toggle switch */}
            <button
              onClick={onToggle}
              className="relative w-10 h-6 rounded-full transition-all duration-200"
              style={{
                background: rule.enabled
                  ? "rgba(34, 211, 238, 0.3)"
                  : "rgba(255, 255, 255, 0.08)",
              }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200"
                style={{
                  transform: rule.enabled ? "translateX(20px)" : "translateX(2px)",
                }}
              />
            </button>
            {/* Delete button */}
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Delete rule "${rule.name}"?`
                  )
                ) {
                  onDelete();
                }
              }}
              className="p-2 rounded-lg text-slate-600 transition-colors hover:text-rose-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ── Create Rule Form ─────────────────────────────────────────────────

interface CreateRuleFormProps {
  subnets: SubnetDetailModel[];
  onSave: (rule: AlertRule) => void;
  onCancel: () => void;
}

function CreateRuleForm({ subnets, onSave, onCancel }: CreateRuleFormProps) {
  const [name, setName] = useState("");
  const [subnet, setSubnet] = useState<string>("any");
  const [metric, setMetric] = useState<string>("yield");
  const [operator, setOperator] = useState<string>("below");
  const [value, setValue] = useState<string>("15");

  const handleSave = () => {
    const subnetNum = subnet === "any" ? "any" : parseInt(subnet);
    const rule: AlertRule = {
      id: `rule-${Date.now()}-${Math.random()}`,
      name: name.trim() || `${metric} ${operator} ${value}`,
      subnetFilter: subnetNum,
      condition: {
        metric: metric as any,
        operator: operator as any,
        value: parseFloat(value) || 0,
      },
      enabled: true,
      createdAt: new Date().toISOString(),
      lastTriggered: null,
      triggerCount: 0,
    };
    onSave(rule);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <GlassCard padding="md" glow="cyan">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Subnet
            </label>
            <select
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="any">Any Subnet</option>
              {subnets.map((s) => (
                <option key={s.netuid} value={String(s.netuid)}>
                  {s.name} ({s.netuid})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Metric
              </label>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="yield">Yield</option>
                <option value="score">Score</option>
                <option value="liquidity">Liquidity</option>
                <option value="emissions">Emissions</option>
                <option value="stakers">Stakers</option>
                <option value="risk">Risk</option>
                <option value="inflow">Inflow</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Operator
              </label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
                <option value="changes_by">Changes By</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Value
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
              placeholder="0"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
              placeholder="Auto-generated if empty"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-all"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-700/20 border border-slate-600/40 text-slate-400 hover:bg-slate-700/30 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ── Alert Event Card ─────────────────────────────────────────────────

interface AlertEventCardProps {
  event: AlertEvent;
  onAcknowledge: () => void;
}

function AlertEventCard({ event, onAcknowledge }: AlertEventCardProps) {
  const getChangeColor = () => {
    if (event.currentValue < event.previousValue) return "rose";
    if (event.currentValue > event.previousValue) return "emerald";
    return "amber";
  };

  const changeColor = getChangeColor();
  const colorMap: Record<string, string> = {
    rose: "text-rose-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
  };

  return (
    <GlassCard
      padding="md"
      className={`${event.acknowledged ? "opacity-50" : ""} transition-opacity`}
    >
      <div className="flex items-start gap-3">
        <Bell className={`w-4 h-4 flex-shrink-0 mt-0.5 ${colorMap[changeColor]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">
            {event.ruleName}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            <span className="font-semibold">{event.subnet.name}</span> ({event.subnet.netuid})
          </p>
          <p className="text-xs text-slate-500 mt-1.5 leading-snug">
            {event.metric} changed from{" "}
            <span className="font-semibold text-white">
              {event.previousValue.toFixed(2)}
            </span>{" "}
            to{" "}
            <span className={`font-semibold ${colorMap[changeColor]}`}>
              {event.currentValue.toFixed(2)}
            </span>{" "}
            (threshold: {event.threshold.toFixed(2)})
          </p>
          <p className="text-xs text-slate-600 mt-2">
            {formatTime(event.triggeredAt)}
          </p>
        </div>
        {!event.acknowledged && (
          <button
            onClick={onAcknowledge}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: "rgba(52, 211, 153, 0.12)",
              border: "1px solid rgba(52, 211, 153, 0.2)",
              color: "#34d399",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(52, 211, 153, 0.18)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(52, 211, 153, 0.12)";
            }}
          >
            Acknowledge
          </button>
        )}
        {event.acknowledged && (
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
        )}
      </div>
    </GlassCard>
  );
}

// ── Preset Card ──────────────────────────────────────────────────────

interface PresetCardProps {
  preset: AlertPreset;
  onEnable: () => void;
}

function PresetCard({ preset, onEnable }: PresetCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-shrink-0 w-56"
    >
      <GlassCard padding="md" hover glow="violet">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "rgba(139, 92, 246, 0.15)",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  color: "#a78bfa",
                }}
              >
                {PRESET_ICONS[preset.icon] || <Star className="w-4 h-4" />}
              </div>
              <h3 className="text-sm font-semibold text-white">
                {preset.name}
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-snug">
            {preset.description}
          </p>
          <button
            onClick={onEnable}
            className="w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: "rgba(139, 92, 246, 0.2)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              color: "#a78bfa",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(139, 92, 246, 0.28)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(139, 92, 246, 0.2)";
            }}
          >
            Enable
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ── Utility functions ────────────────────────────────────────────────

function formatCondition(rule: AlertRule, subnets: SubnetDetailModel[]): string {
  const { metric, operator, value } = rule.condition;
  const subnetLabel =
    rule.subnetFilter === "any"
      ? "any subnet"
      : subnets.find((s) => s.netuid === rule.subnetFilter)?.name ||
        `subnet ${rule.subnetFilter}`;
  const operatorLabel =
    operator === "above"
      ? "is above"
      : operator === "below"
        ? "is below"
        : "changes by";
  return `When ${subnetLabel} ${metric} ${operatorLabel} ${value}`;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
