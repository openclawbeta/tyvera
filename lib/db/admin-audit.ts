/* ─────────────────────────────────────────────────────────────────── */
/* Admin audit log — records each successful admin action              */
/*                                                                     */
/* Every successful admin request (authenticated + executed) should    */
/* call logAdminAction(). Failures (401/403) are not logged here to    */
/* avoid amplifying credential-stuffing noise — the middleware tier    */
/* rate limits those.                                                  */
/* ─────────────────────────────────────────────────────────────────── */

import type { NextRequest } from "next/server";
import { getDb } from "./index";

export interface AdminAuditRecord {
  id: number;
  occurred_at: string;
  actor_ip: string | null;
  action: string;
  target: string | null;
  method: string;
  path: string;
  status: number;
  metadata_json: string | null;
}

export interface LogAdminActionParams {
  action: string;
  target?: string | null;
  method: string;
  path: string;
  status: number;
  actorIp?: string | null;
  metadata?: Record<string, unknown>;
}

function clientIpFrom(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip") ?? null;
}

/**
 * Log a successful admin action.
 * Best-effort — never throws, writes to console if DB fails.
 */
export async function logAdminAction(params: LogAdminActionParams): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      `INSERT INTO admin_audit_log
        (actor_ip, action, target, method, path, status, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        params.actorIp ?? null,
        params.action,
        params.target ?? null,
        params.method,
        params.path,
        params.status,
        params.metadata ? JSON.stringify(params.metadata) : null,
      ],
    );
  } catch (err) {
    console.warn("[admin-audit] Failed to log admin action:", err);
  }
}

/**
 * Convenience: log an admin action from a NextRequest — extracts IP,
 * method, and path automatically.
 */
export async function logAdminActionFromRequest(
  request: NextRequest,
  params: Omit<LogAdminActionParams, "actorIp" | "method" | "path"> & {
    actorIp?: string | null;
  },
): Promise<void> {
  return logAdminAction({
    ...params,
    actorIp: params.actorIp ?? clientIpFrom(request),
    method: request.method,
    path: request.nextUrl.pathname,
  });
}

/**
 * Read the most recent admin audit entries. Useful for an internal
 * dashboard — not exposed publicly.
 */
export async function getRecentAdminAudit(limit = 100): Promise<AdminAuditRecord[]> {
  try {
    const db = await getDb();
    const rows = await db.query(
      `SELECT id, occurred_at, actor_ip, action, target, method, path, status, metadata_json
       FROM admin_audit_log
       ORDER BY id DESC
       LIMIT ?`,
      [limit],
    );

    if (!rows.length || !rows[0].rows.length) return [];

    return rows[0].rows.map((row: any[]) => ({
      id: Number(row[0]),
      occurred_at: String(row[1]),
      actor_ip: row[2] ? String(row[2]) : null,
      action: String(row[3]),
      target: row[4] ? String(row[4]) : null,
      method: String(row[5]),
      path: String(row[6]),
      status: Number(row[7]),
      metadata_json: row[8] ? String(row[8]) : null,
    }));
  } catch (err) {
    console.warn("[admin-audit] Failed to read admin audit log:", err);
    return [];
  }
}

/**
 * Keep the audit table reasonably sized. Retains the most recent 10k entries.
 */
export async function pruneAdminAudit(): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      `DELETE FROM admin_audit_log WHERE id NOT IN (
        SELECT id FROM admin_audit_log ORDER BY id DESC LIMIT 10000
      )`,
    );
  } catch (err) {
    console.warn("[admin-audit] Failed to prune admin audit log:", err);
  }
}
