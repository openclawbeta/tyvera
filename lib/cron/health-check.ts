/**
 * lib/cron/health-check.ts
 *
 * Checks cron_runs for stale or failed jobs and fires alerts
 * via the ALERT_WEBHOOK_URL (Slack/Discord/PagerDuty).
 *
 * Expected staleness thresholds:
 *   verify-payments — runs every 1 min, stale after 5 min
 *   sync-chain      — runs every 5 min, stale after 15 min
 *   reset-counters  — runs daily, stale after 25 hours
 */

import { getLatestCronRuns, type CronRunRecord } from "@/lib/db/cron-log";

interface CronHealthIssue {
  job: string;
  type: "stale" | "error";
  detail: string;
  lastRun?: string;
}

const STALENESS_THRESHOLDS: Record<string, number> = {
  "verify-payments": 5 * 60 * 1000,       // 5 min
  "sync-chain": 15 * 60 * 1000,           // 15 min
  "reset-counters": 25 * 60 * 60 * 1000,  // 25 hours
};

const EXPECTED_JOBS = ["verify-payments", "sync-chain", "reset-counters"];

/**
 * Evaluate cron health from the latest run records.
 * Returns a list of issues (empty = healthy).
 */
export function evaluateCronHealth(
  runs: CronRunRecord[],
  now: number = Date.now(),
): CronHealthIssue[] {
  const issues: CronHealthIssue[] = [];
  const runMap = new Map(runs.map((r) => [r.job_name, r]));

  for (const job of EXPECTED_JOBS) {
    const run = runMap.get(job);

    if (!run) {
      issues.push({ job, type: "stale", detail: "No runs recorded" });
      continue;
    }

    // Check for recent errors
    if (run.status === "error") {
      issues.push({
        job,
        type: "error",
        detail: run.error_message ?? "Unknown error",
        lastRun: run.started_at,
      });
    }

    // Check staleness
    const threshold = STALENESS_THRESHOLDS[job] ?? 30 * 60 * 1000;
    const runAge = now - new Date(run.started_at).getTime();
    if (runAge > threshold) {
      const minsAgo = Math.round(runAge / 60_000);
      issues.push({
        job,
        type: "stale",
        detail: `Last ran ${minsAgo}m ago (threshold: ${Math.round(threshold / 60_000)}m)`,
        lastRun: run.started_at,
      });
    }
  }

  return issues;
}

/**
 * Fire a webhook alert for cron health issues.
 * Posts to ALERT_WEBHOOK_URL (Slack-compatible JSON payload).
 */
async function fireWebhookAlert(issues: CronHealthIssue[]): Promise<boolean> {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const issueLines = issues.map(
    (i) => `• *${i.job}* [${i.type}]: ${i.detail}`,
  );

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 *Tyvera Cron Health Alert*\n\n${issueLines.join("\n")}\n\nCheck /api/health for details.`,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[cron-health] Webhook delivery failed:", err);
    return false;
  }
}

/**
 * Run a full cron health check: query latest runs, evaluate, alert if issues found.
 * Returns the list of issues (empty = all healthy).
 */
export async function runCronHealthCheck(): Promise<{
  healthy: boolean;
  issues: CronHealthIssue[];
  alerted: boolean;
}> {
  const runs = await getLatestCronRuns();
  const issues = evaluateCronHealth(runs);
  let alerted = false;

  if (issues.length > 0) {
    console.warn("[cron-health] Issues detected:", issues);
    alerted = await fireWebhookAlert(issues);
  }

  return { healthy: issues.length === 0, issues, alerted };
}
