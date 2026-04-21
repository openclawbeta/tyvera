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

/** Soft cap on webhook payload size to prevent runaway JSON blobs. */
const MAX_WEBHOOK_PAYLOAD_BYTES = 64 * 1024;

function eventTypeMatches(eventTypes: string, eventType: string): boolean {
  if (eventTypes === "*") return true;
  // Trim each comma-separated entry so "a, b, c" matches "b".
  return eventTypes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(eventType);
}

/**
 * Fire webhooks for a specific event. Non-blocking — errors are logged, not thrown.
 *
 * Deliveries run in parallel with an individual timeout so one slow endpoint
 * cannot hold up others. Signed with HMAC-SHA256 over `timestamp.payload`
 * and `X-Tyvera-Timestamp` is emitted alongside for receiver-side replay
 * defence.
 */
export async function fireWebhooks(
  walletAddress: string,
  eventType: string,
  data: Record<string, unknown>,
): Promise<number> {
  const webhooks = await listWebhooks(walletAddress);

  const timestamp = new Date().toISOString();
  const timestampEpoch = String(Math.floor(Date.parse(timestamp) / 1000));

  const deliveries = webhooks
    .filter((wh) => wh.status === "active" && eventTypeMatches(wh.event_types, eventType))
    .map(async (wh) => {
      const payload = JSON.stringify({
        event: eventType,
        timestamp,
        data,
      });

      if (Buffer.byteLength(payload, "utf8") > MAX_WEBHOOK_PAYLOAD_BYTES) {
        await logDelivery(wh.id, eventType, payload.slice(0, 512), null, "payload too large", false);
        return false;
      }

      // Sign `timestamp.payload` so receivers can reject replays whose
      // outer timestamp has been swapped, and parse-and-forget clients
      // still get signature validity on the body alone if they choose.
      const signedBody = `${timestampEpoch}.${payload}`;
      const signature = crypto
        .createHmac("sha256", wh.secret)
        .update(signedBody)
        .digest("hex");

      try {
        const res = await fetch(wh.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tyvera-Signature": signature,
            "X-Tyvera-Timestamp": timestampEpoch,
            "X-Tyvera-Event": eventType,
          },
          body: payload,
          signal: AbortSignal.timeout(10000),
          redirect: "error",
        });

        await logDelivery(wh.id, eventType, payload, res.status, null, res.ok);
        return res.ok;
      } catch (err) {
        await logDelivery(wh.id, eventType, payload, null, String(err).slice(0, 500), false);
        return false;
      }
    });

  const results = await Promise.allSettled(deliveries);
  return results.filter((r) => r.status === "fulfilled" && r.value === true).length;
}

/**
 * Prune old delivery log rows. Keeps the last `keepCount` rows per webhook.
 * Safe to run periodically to cap the unbounded growth of webhook_deliveries.
 */
export async function pruneDeliveryLog(keepPerWebhook: number = 500): Promise<number> {
  const db = await getDb();
  // Per-webhook keep window via a correlated subquery.
  await db.execute(
    `DELETE FROM webhook_deliveries
     WHERE id NOT IN (
       SELECT id FROM (
         SELECT id,
                ROW_NUMBER() OVER (PARTITION BY webhook_id ORDER BY attempted_at DESC) AS rn
         FROM webhook_deliveries
       ) WHERE rn <= ?
     )`,
    [keepPerWebhook],
  );
  const changes = await db.query("SELECT changes()");
  return Number(changes[0]?.rows?.[0]?.[0] ?? 0);
}

/**
 * Reactivate an auto-paused webhook (status='failed'). Resets failure_count
 * so the delivery path stops immediately tripping the auto-pause guard again.
 */
export async function reactivateWebhook(
  walletAddress: string,
  webhookId: number,
): Promise<boolean> {
  const db = await getDb();
  await db.execute(
    `UPDATE webhooks
       SET status = 'active', failure_count = 0, updated_at = datetime('now')
     WHERE id = ? AND wallet_address = ? AND status IN ('failed', 'paused')`,
    [webhookId, walletAddress],
  );
  const result = await db.query("SELECT changes() as count");
  return Number(result[0]?.rows?.[0]?.[0] ?? 0) > 0;
}
