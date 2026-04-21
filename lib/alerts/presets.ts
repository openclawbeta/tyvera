/**
 * lib/alerts/presets.ts
 *
 * Pre-built alert rule templates for one-click activation.
 * Strategist+ tier feature (alert_presets).
 *
 * Each preset creates multiple alert rules configured with
 * sensible defaults for common monitoring scenarios.
 */

import type { AlertType } from "./types";

export interface AlertPresetRule {
  alertType: AlertType;
  threshold: number;
  subnetFilter: string | null;
}

export interface AlertPreset {
  id: string;
  name: string;
  description: string;
  category: "defensive" | "opportunity" | "whale" | "comprehensive";
  rules: AlertPresetRule[];
}

export const ALERT_PRESETS: AlertPreset[] = [
  {
    id: "whale-watcher",
    name: "Whale Watcher",
    description: "Track large wallet movements and coldkey activity across all subnets",
    category: "whale",
    rules: [
      { alertType: "whale_inflow", threshold: 500, subnetFilter: null },
      { alertType: "whale_outflow", threshold: 500, subnetFilter: null },
      { alertType: "coldkey_activity", threshold: 1000, subnetFilter: null },
    ],
  },
  {
    id: "yield-guardian",
    name: "Yield Guardian",
    description: "Get alerted on significant yield changes and emission shifts",
    category: "defensive",
    rules: [
      { alertType: "yield_drop", threshold: 5, subnetFilter: null },
      { alertType: "yield_spike", threshold: 15, subnetFilter: null },
      { alertType: "emission_change", threshold: 10, subnetFilter: null },
    ],
  },
  {
    id: "risk-sentinel",
    name: "Risk Sentinel",
    description: "Monitor deregistration risk, liquidity drops, and risk level changes",
    category: "defensive",
    rules: [
      { alertType: "dereg_risk", threshold: 70, subnetFilter: null },
      { alertType: "liquidity_drop", threshold: 15, subnetFilter: null },
      { alertType: "risk_level_change", threshold: 2, subnetFilter: null },
    ],
  },
  {
    id: "price-tracker",
    name: "TAO Price Tracker",
    description: "Set price alerts for TAO and alpha token movements",
    category: "opportunity",
    rules: [
      { alertType: "tao_price_above", threshold: 500, subnetFilter: null },
      { alertType: "tao_price_below", threshold: 300, subnetFilter: null },
      { alertType: "alpha_price_change", threshold: 10, subnetFilter: null },
    ],
  },
  {
    id: "validator-monitor",
    name: "Validator Monitor",
    description: "Track validator take changes and deregistration risks",
    category: "defensive",
    rules: [
      { alertType: "validator_take_change", threshold: 2, subnetFilter: null },
      { alertType: "dereg_risk", threshold: 50, subnetFilter: null },
    ],
  },
  {
    id: "full-coverage",
    name: "Full Coverage",
    description: "Comprehensive monitoring across all alert categories with balanced thresholds",
    category: "comprehensive",
    rules: [
      { alertType: "yield_drop", threshold: 5, subnetFilter: null },
      { alertType: "yield_spike", threshold: 10, subnetFilter: null },
      { alertType: "emission_change", threshold: 10, subnetFilter: null },
      { alertType: "dereg_risk", threshold: 60, subnetFilter: null },
      { alertType: "liquidity_drop", threshold: 15, subnetFilter: null },
      { alertType: "whale_inflow", threshold: 500, subnetFilter: null },
      { alertType: "whale_outflow", threshold: 500, subnetFilter: null },
      { alertType: "tao_price_above", threshold: 500, subnetFilter: null },
      { alertType: "tao_price_below", threshold: 300, subnetFilter: null },
      { alertType: "alpha_price_change", threshold: 10, subnetFilter: null },
    ],
  },
];
