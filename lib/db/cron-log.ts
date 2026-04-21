/* ─────────────────────────────────────────────────────────────────── */
/* Cron run logger — records each cron execution for observability      */
/*                                                                     */
/* Used by cron endpoints to log success/failure, and by /api/health   */
/* to detect stale or broken cron jobs.                                */
/* ─────────────────────────────────────────────────────────────────── */

import { getDb } from "./index";

export interface CronRunRecord {
  id: number;
  job_name: string;
  started_at: string;
  duration_ms: number | null;
  status: "ok" | "error";
  result_json: string | null;
  error_message: string | null;
}

/**
 * Log a cron run to the database.
 * Best-effort — failures are logged to console but never thrown.
 */
export async function logCronRun(params: {
  jobName: string;
  startedAt: string;
  durationMs: number;
  status: "ok" | "error";
  result?: Record<string, unknown>;
  errorMessage?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      `INSERT INTO cron_runs (job_name, started_at, duration_ms, status, result_json, error_message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        params.jobName,
        params.startedAt,
        params.durationMs,
        params.status,
        params.result ? JSON.stringify(params.result) : null,
        params.errorMessage ?? null,
      ],
    );
  } catch (err) {
    console.warn("[cron-log] Failed to log cron run:", err);
  }
}

/**
 * Get the most recent run for each cron job.
 */
export async function getLatestCronRuns(): Promise<CronRunRecord[]> {
  try {
    const db = await getDb();
    const rows = await db.query(
      `SELECT cr.*
       FROM cron_runs cr
       INNER JOIN (
         SELECT job_name, MAX(id) as max_id
         FROM cron_runs
         GROUP BY job_name
       ) latest ON cr.id = latest.max_id
       ORDER BY cr.started_at DESC`,
    );

    if (!rows.length || !rows[0].rows.length) return [];

    return rows[0].rows.map((row: any[]) => ({
      id: Number(row[0]),
      job_name: String(row[1]),
      started_at: String(row[2]),
      duration_ms: row[3] != null ? Number(row[3]) : null,
      status: String(row[4]) as "ok" | "error",
      result_json: row[5] ? String(row[5]) : null,
      error_message: row[6] ? String(row[6]) : null,
    }));
  } catch (err) {
    console.warn("[cron-log] Failed to read cron runs:", err);
    return [];
  }
}

/**
 * Prune old cron runs to keep the table small.
 * Keeps the most recent 500 entries.
 */
export async function pruneCronRuns(): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      `DELETE FROM cron_runs WHERE id NOT IN (
        SELECT id FROM cron_runs ORDER BY id DESC LIMIT 500
      )`,
    );
  } catch (err) {
    console.warn("[cron-log] Failed to prune cron runs:", err);
  }
}
