/**
 * app/api/health/route.ts
 *
 * Public health endpoint — no auth required.
 * Returns structured status for cron jobs, data freshness, and DB connectivity.
 *
 * Consumers: external uptime monitors, Slack/PagerDuty webhooks, debugging.
 *
 * GET /api/health
 */

import { NextResponse } from "next/server";
import { getLatestCronRuns } from "@/lib/db/cron-log";
import { getEventBufferSize, getLastScannedBlock } from "@/lib/chain/transfer-scanner";
import { getPersistedEventCount } from "@/lib/db/chain-events";

export const dynamic = "force-dynamic";

/** Max acceptable age (in ms) before a cron job is considered overdue. */
const CRON_OVERDUE_THRESHOLDS: Record<string, number> = {
  "sync-chain": 15 * 60 * 1000,      // 15 min (runs every 5 min, 3× buffer)
  "verify-payments": 5 * 60 * 1000,   // 5 min (runs every 1 min, 5× buffer)
  "reset-counters": 26 * 60 * 60 * 1000, // 26h (runs daily, generous buffer)
};

const DATA_STALE_WARN_MS = 60 * 60 * 1000;   // 1 hour → amber
const DATA_STALE_CRIT_MS = 6 * 60 * 60 * 1000; // 6 hours → red

interface CronStatus {
  jobName: string;
  lastRun: string | null;
  ageMs: number | null;
  status: "ok" | "error" | "never_run";
  overdue: boolean;
  durationMs: number | null;
  lastError: string | null;
}

export async function GET() {
  const now = Date.now();
  const issues: string[] = [];

  // ── Cron job status ─────────────────────────────────────────────
  let cronStatuses: CronStatus[] = [];
  try {
    const runs = await getLatestCronRuns();
    const runsByJob = new Map(runs.map((r) => [r.job_name, r]));

    for (const [jobName, threshold] of Object.entries(CRON_OVERDUE_THRESHOLDS)) {
      const run = runsByJob.get(jobName);
      if (!run) {
        cronStatuses.push({
          jobName,
          lastRun: null,
          ageMs: null,
          status: "never_run",
          overdue: true,
          durationMs: null,
          lastError: null,
        });
        issues.push(`${jobName}: never run`);
        continue;
      }

      const ageMs = now - new Date(run.started_at).getTime();
      const overdue = ageMs > threshold;
      const status = run.status as "ok" | "error";

      cronStatuses.push({
        jobName,
        lastRun: run.started_at,
        ageMs,
        status,
        overdue,
        durationMs: run.duration_ms,
        lastError: run.error_message,
      });

      if (overdue) issues.push(`${jobName}: overdue (${Math.round(ageMs / 60_000)}min ago)`);
      if (status === "error") issues.push(`${jobName}: last run failed`);
    }
  } catch (err) {
    issues.push("cron_status: DB read failed");
    cronStatuses = [];
  }

  // ── Data freshness ──────────────────────────────────────────────
  let dataFreshness: {
    subnetsJsonAge: string;
    subnetsJsonAgeMs: number;
    level: "fresh" | "warn" | "critical";
  } | null = null;

  try {
    const fs = await import("fs");
    const path = await import("path");
    const snapshotPath = path.join(process.cwd(), "public", "data", "subnets.json");
    const stat = fs.statSync(snapshotPath);
    const ageMs = now - stat.mtimeMs;

    let level: "fresh" | "warn" | "critical" = "fresh";
    if (ageMs > DATA_STALE_CRIT_MS) {
      level = "critical";
      issues.push(`subnets.json: ${Math.round(ageMs / 3_600_000)}h stale`);
    } else if (ageMs > DATA_STALE_WARN_MS) {
      level = "warn";
      issues.push(`subnets.json: ${Math.round(ageMs / 60_000)}min stale`);
    }

    dataFreshness = {
      subnetsJsonAge: new Date(stat.mtimeMs).toISOString(),
      subnetsJsonAgeMs: Math.round(ageMs),
      level,
    };
  } catch {
    issues.push("subnets.json: file not found");
  }

  // ── Transfer scanner status ─────────────────────────────────────
  const bufferSize = getEventBufferSize();
  const lastScannedBlock = getLastScannedBlock();
  let persistedEvents = 0;
  try {
    persistedEvents = await getPersistedEventCount();
  } catch { /* best-effort */ }

  // ── DB connectivity ─────────────────────────────────────────────
  let dbOk = false;
  try {
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    await db.query("SELECT 1");
    dbOk = true;
  } catch {
    issues.push("db: connection failed");
  }

  // ── Overall health ──────────────────────────────────────────────
  const healthy = issues.length === 0;

  // ── Optional webhook alert ──────────────────────────────────────
  if (!healthy && process.env.ALERT_WEBHOOK_URL) {
    try {
      await fetch(process.env.ALERT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `⚠️ Tyvera health check failed:\n${issues.join("\n")}`,
          issues,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.warn("[health] Webhook alert failed:", err);
    }
  }

  return NextResponse.json(
    {
      healthy,
      timestamp: new Date().toISOString(),
      issues: issues.length > 0 ? issues : undefined,
      cron: cronStatuses,
      data: dataFreshness,
      scanner: {
        bufferSize,
        lastScannedBlock,
        persistedEvents,
      },
      db: { connected: dbOk },
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
