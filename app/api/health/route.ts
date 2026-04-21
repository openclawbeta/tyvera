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

// Thresholds for the committed subnets.json snapshot. This file is refreshed
// by the GitHub Actions workflow which is subject to free-tier cron throttling
// (actual cadence 1–5h), so we're generous here. The file is only a cold-start
// fallback — the in-memory chain cache (populated every 5min by sync-chain) is
// the primary serving path, and we downgrade these thresholds further below
// when sync-chain itself is healthy.
const DATA_STALE_WARN_MS = 6 * 60 * 60 * 1000;   // 6 hours → amber
const DATA_STALE_CRIT_MS = 24 * 60 * 60 * 1000;  // 24 hours → red

// If sync-chain ran successfully within this window, the in-memory cache is
// fresh and subnets.json staleness is cosmetic — don't flag it as an issue.
const SYNC_CHAIN_FRESH_MS = 15 * 60 * 1000; // 15 min (sync-chain runs every 5 min)

interface CronStatus {
  jobName: string;
  lastRun: string | null;
  ageMs: number | null;
  status: "ok" | "error" | "never_run";
  overdue: boolean;
  durationMs: number | null;
  /** True if the last run errored. Raw error text is deliberately NOT exposed
   *  on this public endpoint — consult server logs for details. */
  hasError: boolean;
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
          hasError: false,
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
        hasError: status === "error",
      });

      if (overdue) issues.push(`${jobName}: overdue (${Math.round(ageMs / 60_000)}min ago)`);
      if (status === "error") issues.push(`${jobName}: last run failed`);
    }
  } catch (err) {
    issues.push("cron_status: DB read failed");
    cronStatuses = [];
  }

  // ── Data freshness ──────────────────────────────────────────────
  //
  // We read _meta.fetched_at from the JSON payload itself, NOT the filesystem
  // mtime. On Vercel, file mtimes are reset to a deterministic build epoch
  // (typically 2018-10-20), which would make every deploy look ~7 years stale.
  // The GitHub Actions refresher writes a fresh _meta.fetched_at into the file
  // on every commit, so that is the authoritative timestamp.
  //
  // The committed file is only a cold-start fallback. The primary serving
  // path is the in-memory chain cache, populated every 5 min by the
  // sync-chain cron. If sync-chain is healthy, data is fresh regardless of
  // the file's age — we suppress warn/critical in that case.
  const syncChainRun = cronStatuses.find((c) => c.jobName === "sync-chain");
  const syncChainFresh =
    !!syncChainRun &&
    syncChainRun.status === "ok" &&
    syncChainRun.ageMs != null &&
    syncChainRun.ageMs < SYNC_CHAIN_FRESH_MS;

  let dataFreshness: {
    subnetsJsonAge: string | null;
    subnetsJsonAgeMs: number | null;
    level: "fresh" | "warn" | "critical";
    liveSource: "chain-cache" | "subnets-json" | "none";
  } | null = null;

  try {
    const fs = await import("fs");
    const path = await import("path");
    const snapshotPath = path.join(process.cwd(), "public", "data", "subnets.json");
    const raw = fs.readFileSync(snapshotPath, "utf-8");
    const parsed = JSON.parse(raw) as { _meta?: { fetched_at?: string; generated_at?: string } };
    const fetchedAt = parsed?._meta?.fetched_at ?? parsed?._meta?.generated_at ?? null;

    if (!fetchedAt) {
      if (!syncChainFresh) issues.push("subnets.json: no _meta.fetched_at");
      dataFreshness = {
        subnetsJsonAge: null,
        subnetsJsonAgeMs: null,
        level: syncChainFresh ? "fresh" : "critical",
        liveSource: syncChainFresh ? "chain-cache" : "none",
      };
    } else {
      const fetchedMs = Date.parse(fetchedAt);
      if (!Number.isFinite(fetchedMs)) {
        if (!syncChainFresh) issues.push("subnets.json: _meta.fetched_at unparsable");
        dataFreshness = {
          subnetsJsonAge: fetchedAt,
          subnetsJsonAgeMs: null,
          level: syncChainFresh ? "fresh" : "critical",
          liveSource: syncChainFresh ? "chain-cache" : "none",
        };
      } else {
        const ageMs = now - fetchedMs;
        const fileLevel: "fresh" | "warn" | "critical" =
          ageMs > DATA_STALE_CRIT_MS ? "critical" :
          ageMs > DATA_STALE_WARN_MS ? "warn" : "fresh";

        // When sync-chain is fresh we consider the live chain-cache authoritative
        // and suppress file-based warn/critical. Only promote issues when BOTH
        // signals are degraded.
        const level: "fresh" | "warn" | "critical" =
          syncChainFresh ? "fresh" : fileLevel;

        if (!syncChainFresh) {
          if (fileLevel === "critical") {
            issues.push(`subnets.json: ${Math.round(ageMs / 3_600_000)}h stale`);
          } else if (fileLevel === "warn") {
            issues.push(`subnets.json: ${Math.round(ageMs / 60_000)}min stale`);
          }
        }

        dataFreshness = {
          subnetsJsonAge: new Date(fetchedMs).toISOString(),
          subnetsJsonAgeMs: Math.round(ageMs),
          level,
          liveSource: syncChainFresh
            ? "chain-cache"
            : fileLevel === "critical" ? "none" : "subnets-json",
        };
      }
    }
  } catch {
    if (!syncChainFresh) issues.push("subnets.json: file not found or unreadable");
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
