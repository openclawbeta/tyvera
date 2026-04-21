/**
 * lib/db/webhooks.ts
 *
 * Database operations for webhook registration and delivery logging.
 * Institutional tier feature.
 */

import { getDb } from "./index";
import crypto from "crypto";

function rowToObject(columns: string[], values: any[]): Record<string, unknown> {
  return Object.fromEntries(columns.map((c, i) => [c, values[i]]));
}

export interface Webhook {
  id: number;
  wallet_address: string;
  url: string;
  label: string;
  event_types: string;
  secret: string;
  status: string;
  failure_count: number;
  last_triggered: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: number;
  webhook_id: number;
  event_type: string;
  payload: string;
  status_code: number | null;
  response_body: string | null;
  success: boolean;
  attempted_at: string;
}

/* ── CRUD ─────────────────────────────────────────────────────────── */

export async function listWebhooks(walletAddress: string): Promise<Webhook[]> {
  const db = await getDb();
  const results = await db.query(
    "SELECT * FROM webhooks WHERE wallet_address = ? AND status != 'deleted' ORDER BY created_at DESC",
    [walletAddress],
  );
  if (!results.length || !results[0].rows.length) return [];
  const cols = results[0].columns;
  return results[0].rows.map((row) => rowToObject(cols, row) as unknown as Webhook);
}

export async function createWebhook(
  walletAddress: string,
  url: string,
  label: string,
  eventTypes: string = "*",
): Promise<{ webhook: Webhook; signingSecret: string }> {
  const db = await getDb();
  const secret = crypto.randomBytes(32).toString("hex");

  await db.execute(
    `INSERT INTO webhooks (wallet_address, url, label, event_types, secret)
     VALUES (?, ?, ?, ?, ?)`,
    [walletAddress, url, label, eventTypes, secret],
  );

  const results = await db.query(
    "SELECT * FROM webhooks WHERE wallet_address = ? ORDER BY id DESC LIMIT 1",
    [walletAddress],
  );
  const cols = results[0].columns;
  const webhook = rowToObject(cols, results[0].rows[0]) as unknown as Webhook;

  return { webhook, signingSecret: secret };
}

export async function deleteWebhook(walletAddress: string, webhookId: number): Promise<boolean> {
  const db = await getDb();
  await db.execute(
    "UPDATE webhooks SET status = 'deleted', updated_at = datetime('now') WHERE id = ? AND wallet_address = ?",
    [webhookId, walletAddress],
  );
  return true;
}

export async function updateWebhookStatus(
  webhookId: number,
  status: "active" | "paused" | "failed",
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE webhooks SET status = ?, updated_at = datetime('now') WHERE id = ?",
    [status, webhookId],
  );
}

/* ── Delivery ─────────────────────────────────────────────────────── */

export async function logDelivery(
  webhookId: number,
  eventType: string,
  payload: string,
  statusCode: number | null,
  responseBody: string | null,
  success: boolean,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO webhook_deliveries (webhook_id, event_type, payload, status_code, response_body, success)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [webhookId, eventType, payload, statusCode, responseBody, success ? 1 : 0],
  );

  if (!success) {
    await db.execute(
      "UPDATE webhooks SET failure_count = failure_count + 1, updated_at = datetime('now') WHERE id = ?",
      [webhookId],
    );
    // Auto-pause after 10 consecutive failures
    const wh = await db.query("SELECT failure_count FROM webhooks WHERE id = ?", [webhookId]);
    if (wh[0]?.rows?.[0]?.[0] >= 10) {
      await updateWebhookStatus(webhookId, "failed");
    }
  } else {
    await db.execute(
      "UPDATE webhooks SET failure_count = 0, last_triggered = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      [webhookId],
    );
  }
}

/**
 * Fire webhooks for a specific event. Non-blocking — errors are logged, not thrown.
 */
export async function fireWebhooks(
  walletAddress: string,
  eventType: string,
  data: Record<string, unknown>,
): Promise<number> {
  const webhooks = await listWebhooks(walletAddress);
  let fired = 0;

  for (const wh of webhooks) {
    if (wh.status !== "active") continue;
    if (wh.event_types !== "*" && !wh.event_types.split(",").includes(eventType)) continue;

    const payload = JSON.stringify({
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    });

    const signature = crypto
      .createHmac("sha256", wh.secret)
      .update(payload)
      .digest("hex");

    try {
      const res = await fetch(wh.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tyvera-Signature": signature,
          "X-Tyvera-Event": eventType,
        },
        body: payload,
        signal: AbortSignal.timeout(10000),
      });

      await logDelivery(
        wh.id,
        eventType,
        payload,
        res.status,
        null,
        res.ok,
      );
      if (res.ok) fired++;
    } catch (err) {
      await logDelivery(
        wh.id,
        eventType,
        payload,
        null,
        String(err),
        false,
      );
    }
  }

  return fired;
}
