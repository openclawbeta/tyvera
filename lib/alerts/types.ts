/**
 * lib/alerts/types.ts
 *
 * Alert type definitions for the personalized alert system.
 * Alerts are wallet-gated: only users with connected wallets receive them.
 */

// ── Alert categories ────────────────────────────────────────────────────────

export type AlertCategory = "staking" | "risk" | "whale" | "price";

export type AlertType =
  // Staking alerts
  | "yield_drop"
  | "yield_spike"
  | "emission_change"
  | "validator_take_change"
  // Risk alerts
  | "dereg_risk"
  | "liquidity_drop"
  | "risk_level_change"
  // Whale/flow alerts
  | "whale_inflow"
  | "whale_outflow"
  | "coldkey_activity"
  // Price alerts
  | "tao_price_above"
  | "tao_price_below"
  | "alpha_price_change";

export type AlertSeverity = "info" | "warning" | "critical";

// ── Alert metadata per type ─────────────────────────────────────────────────

export interface AlertTypeMeta {
  type: AlertType;
  category: AlertCategory;
  label: string;
  description: string;
  unit: string;         // %, τ, USD
  defaultThreshold: number;
  minThreshold: number;
  maxThreshold: number;
  step: number;
}

export const ALERT_TYPE_META: Record<AlertType, AlertTypeMeta> = {
  // ── Staking ───────────────────────────────────────────────────────
  yield_drop: {
    type: "yield_drop",
    category: "staking",
    label: "Yield drop",
    description: "Alert when yield drops by more than this percentage on a staked subnet",
    unit: "%",
    defaultThreshold: 5,
    minThreshold: 1,
    maxThreshold: 50,
    step: 1,
  },
  yield_spike: {
    type: "yield_spike",
    category: "staking",
    label: "Yield spike",
    description: "Alert when yield increases by more than this percentage",
    unit: "%",
    defaultThreshold: 10,
    minThreshold: 1,
    maxThreshold: 100,
    step: 1,
  },
  emission_change: {
    type: "emission_change",
    category: "staking",
    label: "Emission change",
    description: "Alert when subnet emissions change by more than this percentage",
    unit: "%",
    defaultThreshold: 10,
    minThreshold: 1,
    maxThreshold: 50,
    step: 1,
  },
  validator_take_change: {
    type: "validator_take_change",
    category: "staking",
    label: "Validator take change",
    description: "Alert when a validator changes their take percentage",
    unit: "%",
    defaultThreshold: 1,
    minThreshold: 0.5,
    maxThreshold: 20,
    step: 0.5,
  },

  // ── Risk ──────────────────────────────────────────────────────────
  dereg_risk: {
    type: "dereg_risk",
    category: "risk",
    label: "Deregistration risk",
    description: "Alert when a staked subnet's score falls near deregistration threshold",
    unit: "%",
    defaultThreshold: 20,
    minThreshold: 5,
    maxThreshold: 50,
    step: 5,
  },
  liquidity_drop: {
    type: "liquidity_drop",
    category: "risk",
    label: "Liquidity drop",
    description: "Alert when subnet liquidity drops by more than this percentage",
    unit: "%",
    defaultThreshold: 15,
    minThreshold: 5,
    maxThreshold: 50,
    step: 5,
  },
  risk_level_change: {
    type: "risk_level_change",
    category: "risk",
    label: "Risk level change",
    description: "Alert when a subnet's risk level changes (e.g. LOW → MEDIUM)",
    unit: "",
    defaultThreshold: 1,
    minThreshold: 1,
    maxThreshold: 1,
    step: 1,
  },

  // ── Whale/Flow ────────────────────────────────────────────────────
  whale_inflow: {
    type: "whale_inflow",
    category: "whale",
    label: "Whale inflow",
    description: "Alert when a large TAO deposit enters a staked subnet",
    unit: "τ",
    defaultThreshold: 1000,
    minThreshold: 100,
    maxThreshold: 100000,
    step: 100,
  },
  whale_outflow: {
    type: "whale_outflow",
    category: "whale",
    label: "Whale outflow",
    description: "Alert when a large TAO withdrawal exits a staked subnet",
    unit: "τ",
    defaultThreshold: 1000,
    minThreshold: 100,
    maxThreshold: 100000,
    step: 100,
  },
  coldkey_activity: {
    type: "coldkey_activity",
    category: "whale",
    label: "Coldkey activity",
    description: "Alert on unusual coldkey movements in staked subnets",
    unit: "",
    defaultThreshold: 1,
    minThreshold: 1,
    maxThreshold: 1,
    step: 1,
  },

  // ── Price ─────────────────────────────────────────────────────────
  tao_price_above: {
    type: "tao_price_above",
    category: "price",
    label: "TAO price above",
    description: "Alert when TAO price rises above this USD value",
    unit: "USD",
    defaultThreshold: 500,
    minThreshold: 1,
    maxThreshold: 10000,
    step: 10,
  },
  tao_price_below: {
    type: "tao_price_below",
    category: "price",
    label: "TAO price below",
    description: "Alert when TAO price falls below this USD value",
    unit: "USD",
    defaultThreshold: 200,
    minThreshold: 1,
    maxThreshold: 10000,
    step: 10,
  },
  alpha_price_change: {
    type: "alpha_price_change",
    category: "price",
    label: "Alpha price change",
    description: "Alert when a subnet's alpha token price changes by more than this percentage",
    unit: "%",
    defaultThreshold: 10,
    minThreshold: 1,
    maxThreshold: 100,
    step: 1,
  },
};

// ── DB row types ────────────────────────────────────────────────────────────

export interface AlertRule {
  id: number;
  wallet_address: string;
  alert_type: AlertType;
  subnet_filter: string | null;
  threshold: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: number;
  wallet_address: string;
  rule_id: number | null;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function alertCategory(type: AlertType): AlertCategory {
  return ALERT_TYPE_META[type].category;
}

export function severityColor(severity: AlertSeverity): string {
  switch (severity) {
    case "critical": return "#ef4444";
    case "warning":  return "#f59e0b";
    case "info":     return "#22d3ee";
  }
}

export function categoryIcon(category: AlertCategory): string {
  switch (category) {
    case "staking": return "📊";
    case "risk":    return "⚠️";
    case "whale":   return "🐋";
    case "price":   return "💰";
  }
}
