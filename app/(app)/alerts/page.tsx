"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Settings2,
  CheckCheck,
  Trash2,
  RefreshCw,
  Shield,
  WalletCards,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { StatCard } from "@/components/ui-custom/stat-card";
import { useWallet } from "@/lib/wallet-context";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  ALERT_TYPE_META,
  severityColor,
  categoryIcon,
  alertCategory,
} from "@/lib/alerts/types";
import type {
  Alert,
  AlertRule,
  AlertType,
  AlertCategory as AlertCat,
} from "@/lib/alerts/types";

const CATEGORY_LABELS: Record<AlertCat, string> = {
  staking: "Staking",
  risk: "Risk",
  whale: "Whale / Flow",
  price: "Price",
};

const CATEGORY_ORDER: AlertCat[] = ["staking", "risk", "whale", "price"];

function timeAgo(dateStr: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export default function AlertsPage() {
  const { address: walletAddress, walletState, getAuthHeaders, openModal } = useWallet();
  const [tab, setTab] = useState<"feed" | "settings">("feed");

  // Feed state
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedFilter, setFeedFilter] = useState<"all" | "unread">("all");

  // Rules state
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [editingThresholds, setEditingThresholds] = useState<Record<number, number>>({});

  // ── Fetch alert feed ──────────────────────────────────────────────
  const fetchFeed = useCallback(async () => {
    if (!walletAddress || (walletState !== "verified" && walletState !== "pending_approval")) return;
    setFeedLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const unreadOnly = feedFilter === "unread" ? "&unread=1" : "";
      const res = await fetchWithTimeout(
        `/api/alerts?address=${encodeURIComponent(walletAddress)}&limit=50${unreadOnly}`,
        { timeoutMs: 8000, headers: authHeaders },
      );
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
        setUnreadCount(data.unread ?? 0);
      }
    } catch {
      // silent
    } finally {
      setFeedLoading(false);
    }
  }, [walletAddress, walletState, feedFilter, getAuthHeaders]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // ── Fetch alert rules ─────────────────────────────────────────────
  const fetchRules = useCallback(async () => {
    if (!walletAddress || (walletState !== "verified" && walletState !== "pending_approval")) return;
    setRulesLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetchWithTimeout(
        `/api/alert-rules?address=${encodeURIComponent(walletAddress)}`,
        { timeoutMs: 8000, headers: authHeaders },
      );
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch {
      // silent
    } finally {
      setRulesLoading(false);
    }
  }, [walletAddress, walletState, getAuthHeaders]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // ── Actions ───────────────────────────────────────────────────────
  const markAllRead = async () => {
    if (!walletAddress || (walletState !== "verified" && walletState !== "pending_approval")) return;
    try {
      const authHeaders = await getAuthHeaders();
      await fetchWithTimeout("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ address: walletAddress }),
        timeoutMs: 6000,
      });
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const initDefaults = async () => {
    if (!walletAddress || (walletState !== "verified" && walletState !== "pending_approval")) return;
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetchWithTimeout("/api/alert-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ address: walletAddress, action: "init_defaults" }),
        timeoutMs: 8000,
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules ?? []);
      }
    } catch {
      // silent
    }
  };

  const updateRule = async (ruleId: number, alertType: AlertType, threshold: number, enabled: boolean) => {
    if (!walletAddress || (walletState !== "verified" && walletState !== "pending_approval")) return;
    try {
      const authHeaders = await getAuthHeaders();
      await fetchWithTimeout("/api/alert-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          address: walletAddress,
          type: alertType,
          threshold,
          enabled,
        }),
        timeoutMs: 6000,
      });
      fetchRules();
    } catch {
      // silent
    }
  };

  const deleteRule = async (ruleId: number) => {
    if (!walletAddress || (walletState !== "verified" && walletState !== "pending_approval")) return;
    try {
      const authHeaders = await getAuthHeaders();
      await fetchWithTimeout("/api/alert-rules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ address: walletAddress, ruleId }),
        timeoutMs: 6000,
      });
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch {
      // silent
    }
  };

  // Group rules by category
  const rulesByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    icon: categoryIcon(cat),
    rules: rules.filter((r) => {
      const meta = ALERT_TYPE_META[r.alert_type as AlertType];
      return meta?.category === cat;
    }),
  }));

  // Stats
  const activeRules = rules.filter((r) => r.enabled).length;
  const todayAlerts = alerts.filter((a) => {
    const d = new Date(a.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  // ── Not connected ─────────────────────────────────────────────────
  if (!walletAddress) {
    return (
      <div className="min-h-screen w-full" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a1f35 100%)" }}>
        <div className="p-6 lg:p-8 max-w-5xl mx-auto">
          <PageHeader title="Smart Alerts" subtitle="Personalized notifications for your staked subnets" />
          <div className="mt-12 flex flex-col items-center text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)" }}
            >
              <WalletCards className="w-7 h-7" style={{ color: "#22d3ee" }} />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Connect your wallet</h2>
            <p className="text-sm max-w-md" style={{ color: "#94a3b8" }}>
              Alerts are personalized to your staked subnets. Connect your Bittensor wallet to configure alert thresholds and receive notifications that matter to you.
            </p>
            <button
              onClick={openModal}
              className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
              style={{
                background: "rgba(34,211,238,0.12)",
                border: "1px solid rgba(34,211,238,0.22)",
                color: "#22d3ee",
              }}
            >
              <WalletCards className="w-4 h-4" />
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a1f35 100%)" }}>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <PageHeader title="Smart Alerts" subtitle="Personalized notifications for your staked subnets" />

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <StatCard label="Active Rules" value={String(activeRules)} accent="cyan" index={0} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.07 }}>
            <StatCard label="Today" value={String(todayAlerts)} accent="amber" index={1} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.14 }}>
            <StatCard label="Unread" value={String(unreadCount)} accent="rose" index={2} />
          </motion.div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mt-8 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.04)" }}>
          <button
            onClick={() => setTab("feed")}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: tab === "feed" ? "rgba(34,211,238,0.15)" : "transparent",
              color: tab === "feed" ? "#22d3ee" : "#64748b",
            }}
          >
            <Bell className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            Alert Feed
          </button>
          <button
            onClick={() => setTab("settings")}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: tab === "settings" ? "rgba(34,211,238,0.15)" : "transparent",
              color: tab === "settings" ? "#22d3ee" : "#64748b",
            }}
          >
            <Settings2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            Alert Rules
          </button>
        </div>

        {/* ── Feed Tab ──────────────────────────────────────────────────── */}
        {tab === "feed" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
            {/* Feed controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setFeedFilter("all")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: feedFilter === "all" ? "rgba(34,211,238,0.15)" : "rgba(255,255,255,0.04)",
                    color: feedFilter === "all" ? "#22d3ee" : "#64748b",
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => setFeedFilter("unread")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: feedFilter === "unread" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)",
                    color: feedFilter === "unread" ? "#f87171" : "#64748b",
                  }}
                >
                  Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
                </button>
              </div>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: "rgba(34,211,238,0.1)", color: "#22d3ee" }}
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={fetchFeed}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", color: "#64748b" }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${feedLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Alert list */}
            <div className="space-y-2">
              {feedLoading && alerts.length === 0 ? (
                <GlassCard padding="md" className="text-center py-12">
                  <p className="text-sm" style={{ color: "#64748b" }}>Loading alerts…</p>
                </GlassCard>
              ) : alerts.length === 0 ? (
                <GlassCard padding="md" className="text-center py-12">
                  <Bell className="w-8 h-8 mx-auto mb-3" style={{ color: "#334155" }} />
                  <p className="text-sm mb-1" style={{ color: "#94a3b8" }}>
                    {feedFilter === "unread" ? "No unread alerts" : "No alerts yet"}
                  </p>
                  <p className="text-xs" style={{ color: "#64748b" }}>
                    {rules.length === 0
                      ? "Set up your alert rules in the settings tab to get started"
                      : "Alerts will appear here when your thresholds are triggered"}
                  </p>
                </GlassCard>
              ) : (
                alerts.map((alert, i) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.03 }}
                  >
                    <GlassCard padding="md" className={alert.read ? "opacity-60" : ""}>
                      <div className="flex items-start gap-3">
                        {/* Severity + Category */}
                        <div className="flex items-center gap-2 pt-0.5 flex-shrink-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              background: severityColor(alert.severity),
                              boxShadow: `0 0 6px ${severityColor(alert.severity)}40`,
                            }}
                          />
                          <span className="text-base">
                            {categoryIcon(alertCategory(alert.alert_type as AlertType))}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">
                              {alert.title}
                            </span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                              style={{
                                background: `${severityColor(alert.severity)}20`,
                                color: severityColor(alert.severity),
                              }}
                            >
                              {alert.severity}
                            </span>
                          </div>
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: "#94a3b8" }}>
                            {alert.message}
                          </p>
                          <p className="text-[11px] mt-2" style={{ color: "#475569" }}>
                            {timeAgo(alert.created_at)}
                          </p>
                        </div>

                        {/* Unread dot */}
                        {!alert.read && (
                          <span
                            className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                            style={{ background: "#22d3ee" }}
                          />
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* ── Settings Tab ──────────────────────────────────────────────── */}
        {tab === "settings" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
            {/* Init defaults button */}
            {rules.length === 0 && (
              <GlassCard padding="md" glow="cyan" className="mb-6">
                <div className="flex items-center gap-4">
                  <Shield className="w-8 h-8 flex-shrink-0" style={{ color: "#22d3ee" }} />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">Get started with smart defaults</h3>
                    <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
                      We'll set up 13 alert rules covering staking yields, risk events, whale flows, and price movements — all with sensible thresholds you can customize.
                    </p>
                  </div>
                  <button
                    onClick={initDefaults}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0"
                    style={{
                      background: "rgba(34,211,238,0.15)",
                      border: "1px solid rgba(34,211,238,0.3)",
                      color: "#22d3ee",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(34,211,238,0.22)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(34,211,238,0.15)";
                    }}
                  >
                    Initialize Defaults
                  </button>
                </div>
              </GlassCard>
            )}

            {rulesLoading && rules.length === 0 ? (
              <GlassCard padding="md" className="text-center py-12">
                <p className="text-sm" style={{ color: "#64748b" }}>Loading rules…</p>
              </GlassCard>
            ) : (
              <div className="space-y-8">
                {rulesByCategory.map(({ category, label, icon, rules: catRules }) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="text-base">{icon}</span>
                      {label}
                      <span className="text-[11px] font-normal" style={{ color: "#64748b" }}>
                        ({catRules.length} rule{catRules.length !== 1 ? "s" : ""})
                      </span>
                    </h3>

                    {catRules.length === 0 ? (
                      <GlassCard padding="sm" className="py-4 text-center">
                        <p className="text-xs" style={{ color: "#64748b" }}>
                          No {label.toLowerCase()} rules configured
                        </p>
                      </GlassCard>
                    ) : (
                      <div className="space-y-2">
                        {catRules.map((rule) => {
                          const meta = ALERT_TYPE_META[rule.alert_type as AlertType];
                          if (!meta) return null;
                          const localThreshold = editingThresholds[rule.id] ?? rule.threshold;

                          return (
                            <motion.div
                              key={rule.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              <GlassCard padding="md" className={!rule.enabled ? "opacity-50" : ""}>
                                <div className="flex items-start gap-4">
                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-white">
                                      {meta.label}
                                    </div>
                                    <p className="text-xs mt-1" style={{ color: "#64748b" }}>
                                      {meta.description}
                                    </p>

                                    {/* Threshold slider */}
                                    <div className="flex items-center gap-3 mt-3">
                                      <span className="text-[11px] font-medium" style={{ color: "#94a3b8" }}>
                                        Threshold:
                                      </span>
                                      <input
                                        type="range"
                                        min={meta.minThreshold}
                                        max={meta.maxThreshold}
                                        step={meta.step}
                                        value={localThreshold}
                                        onChange={(e) => {
                                          setEditingThresholds((prev) => ({
                                            ...prev,
                                            [rule.id]: Number(e.target.value),
                                          }));
                                        }}
                                        onMouseUp={() => {
                                          const val = editingThresholds[rule.id];
                                          if (val !== undefined && val !== rule.threshold) {
                                            updateRule(rule.id, rule.alert_type as AlertType, val, rule.enabled);
                                          }
                                        }}
                                        onTouchEnd={() => {
                                          const val = editingThresholds[rule.id];
                                          if (val !== undefined && val !== rule.threshold) {
                                            updateRule(rule.id, rule.alert_type as AlertType, val, rule.enabled);
                                          }
                                        }}
                                        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                                        style={{
                                          background: `linear-gradient(to right, #22d3ee ${((localThreshold - meta.minThreshold) / (meta.maxThreshold - meta.minThreshold)) * 100}%, rgba(255,255,255,0.08) ${((localThreshold - meta.minThreshold) / (meta.maxThreshold - meta.minThreshold)) * 100}%)`,
                                        }}
                                      />
                                      <span
                                        className="text-xs font-bold tabular-nums min-w-[3.5rem] text-right"
                                        style={{ color: "#22d3ee" }}
                                      >
                                        {localThreshold}{meta.unit ? ` ${meta.unit}` : ""}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Controls */}
                                  <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                                    {/* Toggle */}
                                    <button
                                      onClick={() =>
                                        updateRule(rule.id, rule.alert_type as AlertType, rule.threshold, !rule.enabled)
                                      }
                                      className="relative w-10 h-6 rounded-full transition-all duration-200"
                                      style={{
                                        background: rule.enabled
                                          ? "rgba(34,211,238,0.3)"
                                          : "rgba(255,255,255,0.08)",
                                      }}
                                    >
                                      <div
                                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200"
                                        style={{
                                          transform: rule.enabled
                                            ? "translateX(20px)"
                                            : "translateX(2px)",
                                        }}
                                      />
                                    </button>
                                    {/* Delete */}
                                    <button
                                      onClick={() => deleteRule(rule.id)}
                                      className="p-2 rounded-lg transition-colors"
                                      style={{ color: "#475569" }}
                                      onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.color = "#f87171";
                                      }}
                                      onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.color = "#475569";
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </GlassCard>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
