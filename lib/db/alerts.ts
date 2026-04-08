/**
 * lib/db/alerts.ts
 *
 * Database operations for the personalized alert system.
 * All operations are wallet-gated.
 */

import { getDb, saveDb } from "./index";
import type { Alert, AlertRule, AlertType, AlertSeverity } from "@/lib/alerts/types";
import { ALERT_TYPE_META } from "@/lib/alerts/types";

// ── Alert Rules (user-configured thresholds) ────────────────────────────────

/**
 * Get all alert rules for a wallet.
 */
export async function getAlertRules(walletAddress: string): Promise<AlertRule[]> {
  const db = await getDb();
  const results = db.exec(
    "SELECT * FROM alert_rules WHERE wallet_address = ? ORDER BY alert_type",
    [walletAddress],
  );
  if (!results.length || !results[0].values.length) return [];

  const cols = results[0].columns;
  return results[0].values.map((row) => {
    const obj = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
    return {
      ...obj,
      enabled: Boolean(obj.enabled),
    } as AlertRule;
  });
}

/**
 * Create or update an alert rule. If a rule with the same wallet+type+subnet_filter
 * already exists, update it.
 */
export async function upsertAlertRule(
  walletAddress: string,
  alertType: AlertType,
  threshold: number,
  enabled: boolean = true,
  subnetFilter: string | null = null,
): Promise<AlertRule> {
  const db = await getDb();

  // Check for existing rule
  const existing = db.exec(
    `SELECT id FROM alert_rules
     WHERE wallet_address = ? AND alert_type = ? AND (subnet_filter IS ? OR subnet_filter = ?)`,
    [walletAddress, alertType, subnetFilter, subnetFilter ?? ""],
  );

  if (existing.length && existing[0].values.length) {
    const id = existing[0].values[0][0] as number;
    db.run(
      `UPDATE alert_rules SET threshold = ?, enabled = ?, updated_at = datetime('now') WHERE id = ?`,
      [threshold, enabled ? 1 : 0, id],
    );
    saveDb();
    return {
      id,
      wallet_address: walletAddress,
      alert_type: alertType,
      subnet_filter: subnetFilter,
      threshold,
      enabled,
      created_at: "",
      updated_at: new Date().toISOString(),
    };
  }

  // Insert new rule
  db.run(
    `INSERT INTO alert_rules (wallet_address, alert_type, subnet_filter, threshold, enabled)
     VALUES (?, ?, ?, ?, ?)`,
    [walletAddress, alertType, subnetFilter, threshold, enabled ? 1 : 0],
  );
  saveDb();

  const inserted = db.exec("SELECT last_insert_rowid() as id");
  const id = inserted[0].values[0][0] as number;

  return {
    id,
    wallet_address: walletAddress,
    alert_type: alertType,
    subnet_filter: subnetFilter,
    threshold,
    enabled,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Delete an alert rule.
 */
export async function deleteAlertRule(walletAddress: string, ruleId: number): Promise<boolean> {
  const db = await getDb();
  db.run("DELETE FROM alert_rules WHERE id = ? AND wallet_address = ?", [ruleId, walletAddress]);
  saveDb();
  return true;
}

/**
 * Initialize default alert rules for a new wallet.
 * Called when a user first connects their wallet and opts in to alerts.
 */
export async function initDefaultRules(walletAddress: string): Promise<void> {
  const existing = await getAlertRules(walletAddress);
  if (existing.length > 0) return; // Already initialized

  const defaults: Array<{ type: AlertType; threshold: number }> = Object.values(ALERT_TYPE_META).map((meta) => ({
    type: meta.type,
    threshold: meta.defaultThreshold,
  }));

  for (const { type, threshold } of defaults) {
    await upsertAlertRule(walletAddress, type, threshold, true);
  }
}

// ── Alerts (fired instances) ────────────────────────────────────────────────

/**
 * Create a new alert for a wallet.
 */
export async function createAlert(
  walletAddress: string,
  alertType: AlertType,
  severity: AlertSeverity,
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
  ruleId?: number,
): Promise<number> {
  const db = await getDb();
  db.run(
    `INSERT INTO alerts (wallet_address, rule_id, alert_type, severity, title, message, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      walletAddress,
      ruleId ?? null,
      alertType,
      severity,
      title,
      message,
      metadata ? JSON.stringify(metadata) : null,
    ],
  );
  saveDb();

  const inserted = db.exec("SELECT last_insert_rowid() as id");
  return inserted[0].values[0][0] as number;
}

/**
 * Get alerts for a wallet, newest first.
 */
export async function getAlerts(
  walletAddress: string,
  opts: { limit?: number; unreadOnly?: boolean } = {},
): Promise<Alert[]> {
  const db = await getDb();
  const { limit = 50, unreadOnly = false } = opts;

  const whereClause = unreadOnly
    ? "WHERE wallet_address = ? AND read = 0"
    : "WHERE wallet_address = ?";

  const results = db.exec(
    `SELECT * FROM alerts ${whereClause} ORDER BY created_at DESC LIMIT ?`,
    [walletAddress, limit],
  );
  if (!results.length || !results[0].values.length) return [];

  const cols = results[0].columns;
  return results[0].values.map((row) => {
    const obj = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
    return {
      ...obj,
      read: Boolean(obj.read),
      metadata: obj.metadata ? JSON.parse(obj.metadata as string) : null,
    } as Alert;
  });
}

/**
 * Get unread alert count for a wallet.
 */
export async function getUnreadCount(walletAddress: string): Promise<number> {
  const db = await getDb();
  const result = db.exec(
    "SELECT COUNT(*) as count FROM alerts WHERE wallet_address = ? AND read = 0",
    [walletAddress],
  );
  if (!result.length || !result[0].values.length) return 0;
  return result[0].values[0][0] as number;
}

/**
 * Mark alerts as read.
 */
export async function markAlertsRead(
  walletAddress: string,
  alertIds?: number[],
): Promise<void> {
  const db = await getDb();
  if (alertIds && alertIds.length > 0) {
    const placeholders = alertIds.map(() => "?").join(",");
    db.run(
      `UPDATE alerts SET read = 1 WHERE wallet_address = ? AND id IN (${placeholders})`,
      [walletAddress, ...alertIds],
    );
  } else {
    // Mark all as read
    db.run("UPDATE alerts SET read = 1 WHERE wallet_address = ? AND read = 0", [walletAddress]);
  }
  saveDb();
}

/**
 * Delete old alerts (cleanup). Keeps the last N per wallet.
 */
export async function pruneAlerts(walletAddress: string, keepCount: number = 200): Promise<void> {
  const db = await getDb();
  db.run(
    `DELETE FROM alerts WHERE wallet_address = ? AND id NOT IN (
       SELECT id FROM alerts WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ?
     )`,
    [walletAddress, walletAddress, keepCount],
  );
  saveDb();
}
