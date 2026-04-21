/**
 * lib/alerts/evaluator.ts
 *
 * Periodic alert evaluator. Compares the current chain snapshot (subnets,
 * root metrics, TAO price) against every wallet's enabled alert rules,
 * fires matches into the `alerts` table, and dispatches outbound
 * notifications via email + Telegram.
 *
 * Keeps a small module-scoped memory of the previous evaluation pass so
 * delta-based rules (yield_drop, liquidity_drop, emission_change, etc.)
 * have something to compare against.
 *
 * Deduplication: any alert of the same (type, subnet) that fired within
 * ALERT_COOLDOWN_MINUTES is suppressed at the DB layer (see
 * countRecentAlerts).
 */

import {
  getAlertRules,
  createAlert,
  listWalletsWithEnabledRules,
  countRecentAlerts,
} from "@/lib/db/alerts";
import type {
  AlertRule,
  AlertType,
  AlertSeverity,
} from "@/lib/alerts/types";
import { getNotificationPrefs } from "@/lib/db/notification-prefs";
import { deliverNotification } from "@/lib/notifications/channels";
import { getSubnetCache, isSubnetCacheFresh } from "@/lib/chain/cache";
import { getRootMetricsCache, isRootMetricsCacheFresh } from "@/lib/chain/root-metrics";
import { getLatestTaoPrice } from "@/lib/chain/price-engine";
import type { ChainSnapshot } from "@/lib/chain/types";

/* ── Tunables ───────────────────────────────────────────────────────── */

const ALERT_COOLDOWN_MINUTES = 60;
const SEVERITY_RANK: Record<AlertSeverity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
};

/* ── Previous-state memory ──────────────────────────────────────────── */

interface PriorSubnetState {
  netuid: number;
  yieldPct: number;
  liquidity: number;
  emissionPerDay: number;
  riskTier: "LOW" | "MEDIUM" | "HIGH";
}

interface PriorState {
  fetchedAt: string;
  subnets: Map<number, PriorSubnetState>;
  taoPriceUsd: number | null;
}

let priorState: PriorState | null = null;

function deriveRiskTier(liquidity: number, stakers: number): "LOW" | "MEDIUM" | "HIGH" {
  // Simple heuristic — matches the deriveRisk family used elsewhere for ranking.
  if (liquidity > 50_000 && stakers > 200) return "LOW";
  if (liquidity > 10_000 && stakers > 50) return "MEDIUM";
  return "HIGH";
}

function deriveYield(emissionPerDay: number, taoIn: number): number {
  if (taoIn <= 0) return 0;
  return (emissionPerDay * 365) / taoIn * 100;
}

function buildStateFromSnapshot(snapshot: ChainSnapshot): PriorState {
  const map = new Map<number, PriorSubnetState>();
  for (const s of snapshot.subnets) {
    if (s.netuid === 0) continue;
    const yieldPct = deriveYield(s.emissionPerDay, s.taoIn);
    map.set(s.netuid, {
      netuid: s.netuid,
      yieldPct,
      liquidity: s.taoIn,
      emissionPerDay: s.emissionPerDay,
      riskTier: deriveRiskTier(s.taoIn, s.stakers),
    });
  }
  const taoPoint = getLatestTaoPrice();
  return {
    fetchedAt: snapshot.fetchedAt,
    subnets: map,
    taoPriceUsd: taoPoint?.taoUsd ?? null,
  };
}

/* ── Rule helpers ───────────────────────────────────────────────────── */

/**
 * Parse subnet_filter column: null/""/0 = all subnets, else comma-separated netuids.
 */
function rulesAppliesToNetuid(rule: AlertRule, netuid: number): boolean {
  if (!rule.subnet_filter) return true;
  const filter = String(rule.subnet_filter).trim();
  if (filter === "" || filter === "*") return true;
  const ids = filter.split(",").map((v) => Number(v.trim())).filter(Number.isFinite);
  if (ids.length === 0) return true;
  return ids.includes(netuid);
}

function pctDelta(prev: number, curr: number): number {
  if (!Number.isFinite(prev) || prev <= 0) return 0;
  return ((curr - prev) / prev) * 100;
}

/* ── Candidate alert ────────────────────────────────────────────────── */

interface CandidateAlert {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  ruleId: number | null;
  /** Dedup subnet hint — "netuid" or "label" looked up inside metadata */
  subnetHint: string | null;
}

/**
 * Build per-subnet candidates for a given wallet by diffing current vs. prior state.
 */
function evaluateSubnetRules(
  rules: AlertRule[],
  currState: PriorState,
  prevState: PriorState | null,
): CandidateAlert[] {
  const out: CandidateAlert[] = [];

  for (const [netuid, curr] of currState.subnets) {
    const prev = prevState?.subnets.get(netuid);

    for (const rule of rules) {
      if (!rule.enabled) continue;
      if (!rulesAppliesToNetuid(rule, netuid)) continue;

      switch (rule.alert_type) {
        case "yield_drop": {
          if (!prev) break;
          const delta = pctDelta(prev.yieldPct, curr.yieldPct);
          if (delta <= -rule.threshold) {
            out.push({
              type: "yield_drop",
              severity: delta <= -rule.threshold * 2 ? "critical" : "warning",
              title: `Yield dropped on subnet ${netuid}`,
              message: `Yield on netuid ${netuid} fell ${Math.abs(delta).toFixed(1)}% (${prev.yieldPct.toFixed(2)}% → ${curr.yieldPct.toFixed(2)}%), past your ${rule.threshold}% threshold.`,
              metadata: { netuid, prev: prev.yieldPct, curr: curr.yieldPct, deltaPct: delta },
              ruleId: rule.id,
              subnetHint: String(netuid),
            });
          }
          break;
        }
        case "yield_spike": {
          if (!prev) break;
          const delta = pctDelta(prev.yieldPct, curr.yieldPct);
          if (delta >= rule.threshold) {
            out.push({
              type: "yield_spike",
              severity: "info",
              title: `Yield spike on subnet ${netuid}`,
              message: `Yield on netuid ${netuid} rose ${delta.toFixed(1)}% (${prev.yieldPct.toFixed(2)}% → ${curr.yieldPct.toFixed(2)}%).`,
              metadata: { netuid, prev: prev.yieldPct, curr: curr.yieldPct, deltaPct: delta },
              ruleId: rule.id,
              subnetHint: String(netuid),
            });
          }
          break;
        }
        case "emission_change": {
          if (!prev) break;
          const delta = pctDelta(prev.emissionPerDay, curr.emissionPerDay);
          if (Math.abs(delta) >= rule.threshold) {
            out.push({
              type: "emission_change",
              severity: Math.abs(delta) >= rule.threshold * 2 ? "warning" : "info",
              title: `Emission change on subnet ${netuid}`,
              message: `Daily emission on netuid ${netuid} moved ${delta.toFixed(1)}% (${prev.emissionPerDay.toFixed(3)} τ → ${curr.emissionPerDay.toFixed(3)} τ).`,
              metadata: { netuid, prev: prev.emissionPerDay, curr: curr.emissionPerDay, deltaPct: delta },
              ruleId: rule.id,
              subnetHint: String(netuid),
            });
          }
          break;
        }
        case "liquidity_drop": {
          if (!prev) break;
          const delta = pctDelta(prev.liquidity, curr.liquidity);
          if (delta <= -rule.threshold) {
            out.push({
              type: "liquidity_drop",
              severity: delta <= -rule.threshold * 2 ? "critical" : "warning",
              title: `Liquidity dropped on subnet ${netuid}`,
              message: `Liquidity (TAO in) on netuid ${netuid} fell ${Math.abs(delta).toFixed(1)}% (${prev.liquidity.toFixed(0)} τ → ${curr.liquidity.toFixed(0)} τ).`,
              metadata: { netuid, prev: prev.liquidity, curr: curr.liquidity, deltaPct: delta },
              ruleId: rule.id,
              subnetHint: String(netuid),
            });
          }
          break;
        }
        case "risk_level_change": {
          if (!prev) break;
          if (prev.riskTier !== curr.riskTier) {
            const worsened =
              (prev.riskTier === "LOW" && curr.riskTier !== "LOW") ||
              (prev.riskTier === "MEDIUM" && curr.riskTier === "HIGH");
            out.push({
              type: "risk_level_change",
              severity: worsened ? "warning" : "info",
              title: `Risk level changed on subnet ${netuid}`,
              message: `Risk on netuid ${netuid} shifted ${prev.riskTier} → ${curr.riskTier}.`,
              metadata: { netuid, prev: prev.riskTier, curr: curr.riskTier },
              ruleId: rule.id,
              subnetHint: String(netuid),
            });
          }
          break;
        }
        // Remaining rule types require counterparty/extrinsic history that
        // the evaluator doesn't yet have direct access to — they'll be
        // emitted by downstream cron flows (transfer-scanner → whale,
        // metagraph diff → validator_take_change/coldkey_activity).
        default:
          break;
      }
    }
  }

  return out;
}

/**
 * Price rules evaluated once per wallet (not per-subnet).
 */
function evaluatePriceRules(
  rules: AlertRule[],
  currState: PriorState,
  prevState: PriorState | null,
): CandidateAlert[] {
  const out: CandidateAlert[] = [];
  const taoNow = currState.taoPriceUsd;
  if (taoNow == null || taoNow <= 0) return out;

  for (const rule of rules) {
    if (!rule.enabled) continue;

    switch (rule.alert_type) {
      case "tao_price_above":
        if (taoNow >= rule.threshold) {
          out.push({
            type: "tao_price_above",
            severity: "info",
            title: `TAO crossed above $${rule.threshold.toFixed(2)}`,
            message: `TAO is trading at $${taoNow.toFixed(2)}, past your $${rule.threshold.toFixed(2)} alert level.`,
            metadata: { taoUsd: taoNow, threshold: rule.threshold },
            ruleId: rule.id,
            subnetHint: null,
          });
        }
        break;
      case "tao_price_below":
        if (taoNow <= rule.threshold) {
          out.push({
            type: "tao_price_below",
            severity: "warning",
            title: `TAO dropped below $${rule.threshold.toFixed(2)}`,
            message: `TAO is trading at $${taoNow.toFixed(2)}, below your $${rule.threshold.toFixed(2)} alert level.`,
            metadata: { taoUsd: taoNow, threshold: rule.threshold },
            ruleId: rule.id,
            subnetHint: null,
          });
        }
        break;
      case "alpha_price_change": {
        // Requires per-subnet alpha price diff; if prior state is absent we skip.
        if (!prevState || prevState.taoPriceUsd == null) break;
        const delta = pctDelta(prevState.taoPriceUsd, taoNow);
        if (Math.abs(delta) >= rule.threshold) {
          out.push({
            type: "alpha_price_change",
            severity: Math.abs(delta) >= rule.threshold * 2 ? "warning" : "info",
            title: `TAO moved ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`,
            message: `TAO moved ${delta.toFixed(1)}% since the last evaluation ($${prevState.taoPriceUsd.toFixed(2)} → $${taoNow.toFixed(2)}).`,
            metadata: { prev: prevState.taoPriceUsd, curr: taoNow, deltaPct: delta },
            ruleId: rule.id,
            subnetHint: null,
          });
        }
        break;
      }
      default:
        break;
    }
  }

  return out;
}

/* ── Main entry point ───────────────────────────────────────────────── */

export interface EvaluatorResult {
  evaluatedAt: string;
  walletsEvaluated: number;
  candidatesFound: number;
  alertsFired: number;
  notificationsSent: number;
  skippedDueToCooldown: number;
  hadPriorState: boolean;
  dataSource: "chain-cache" | "cold";
}

export async function runAlertEvaluation(): Promise<EvaluatorResult> {
  const evaluatedAt = new Date().toISOString();
  const result: EvaluatorResult = {
    evaluatedAt,
    walletsEvaluated: 0,
    candidatesFound: 0,
    alertsFired: 0,
    notificationsSent: 0,
    skippedDueToCooldown: 0,
    hadPriorState: priorState != null,
    dataSource: "cold",
  };

  const snapshot = getSubnetCache();
  if (!snapshot || !isSubnetCacheFresh()) {
    // No fresh chain data — nothing meaningful to compare.
    return result;
  }
  result.dataSource = "chain-cache";

  const currState = buildStateFromSnapshot(snapshot);
  // Fill root price if the dedicated root cache is fresh (informational only).
  if (isRootMetricsCacheFresh()) {
    const root = getRootMetricsCache();
    if (root) {
      // Not part of PriorSubnetState map; reserved for future root-yield rules.
      void root;
    }
  }

  const wallets = await listWalletsWithEnabledRules();
  for (const wallet of wallets) {
    result.walletsEvaluated++;
    let rules: AlertRule[];
    try {
      rules = await getAlertRules(wallet);
    } catch (err) {
      console.warn("[alert-evaluator] getAlertRules failed:", err);
      continue;
    }
    if (rules.length === 0) continue;

    const subnetCandidates = evaluateSubnetRules(rules, currState, priorState);
    const priceCandidates = evaluatePriceRules(rules, currState, priorState);
    const candidates = [...subnetCandidates, ...priceCandidates];
    result.candidatesFound += candidates.length;

    if (candidates.length === 0) continue;

    // Pull notification prefs once per wallet — may be null if never configured.
    let prefs;
    try {
      prefs = await getNotificationPrefs(wallet);
    } catch (err) {
      console.warn("[alert-evaluator] getNotificationPrefs failed:", err);
      prefs = null;
    }

    for (const candidate of candidates) {
      // Cooldown: suppress duplicate alerts of the same type/subnet.
      try {
        const recent = await countRecentAlerts(
          wallet,
          candidate.type,
          ALERT_COOLDOWN_MINUTES,
          candidate.subnetHint,
        );
        if (recent > 0) {
          result.skippedDueToCooldown++;
          continue;
        }
      } catch (err) {
        console.warn("[alert-evaluator] countRecentAlerts failed:", err);
      }

      try {
        await createAlert(
          wallet,
          candidate.type,
          candidate.severity,
          candidate.title,
          candidate.message,
          candidate.metadata,
          candidate.ruleId ?? undefined,
        );
        result.alertsFired++;
      } catch (err) {
        console.warn("[alert-evaluator] createAlert failed:", err);
        continue;
      }

      // Dispatch outbound if channels are configured and severity clears threshold.
      const minSeverity = prefs?.min_severity ?? "warning";
      const clears = SEVERITY_RANK[candidate.severity] >= SEVERITY_RANK[minSeverity];
      if (!clears) continue;

      const emailEnabled = prefs?.email_enabled && prefs.email;
      const telegramEnabled = prefs?.telegram_enabled && prefs.telegram_chat_id;
      if (!emailEnabled && !telegramEnabled) continue;

      try {
        const delivery = await deliverNotification(
          {
            email: emailEnabled ? prefs!.email! : null,
            telegramChatId: telegramEnabled ? prefs!.telegram_chat_id! : null,
          },
          {
            walletAddress: wallet,
            title: candidate.title,
            message: candidate.message,
            severity: candidate.severity,
            alertType: candidate.type,
            metadata: candidate.metadata,
          },
        );
        if (delivery.email || delivery.telegram) result.notificationsSent++;
      } catch (err) {
        console.warn("[alert-evaluator] deliverNotification failed:", err);
      }
    }
  }

  // Persist current state as the new baseline for next tick.
  priorState = currState;

  return result;
}

/**
 * Clear the module-scoped prior state. Primarily for tests.
 */
export function resetPriorState(): void {
  priorState = null;
}
