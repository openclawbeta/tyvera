/**
 * Unit tests for cron health evaluation logic.
 *
 * Tests the pure evaluateCronHealth function which checks for
 * stale or errored cron runs without any DB or network coupling.
 */

import { describe, it, expect } from "vitest";
import { evaluateCronHealth } from "@/lib/cron/health-check";
import type { CronRunRecord } from "@/lib/db/cron-log";

const NOW = 1700000000000;

function makeRun(
  job_name: string,
  minutesAgo: number,
  status: "ok" | "error" = "ok",
  error_message: string | null = null,
): CronRunRecord {
  return {
    id: 1,
    job_name,
    started_at: new Date(NOW - minutesAgo * 60_000).toISOString(),
    duration_ms: 500,
    status,
    result_json: null,
    error_message,
  };
}

describe("evaluateCronHealth", () => {
  it("reports healthy when all jobs ran recently and succeeded", () => {
    const runs = [
      makeRun("verify-payments", 1),
      makeRun("sync-chain", 3),
      makeRun("reset-counters", 60),
    ];
    const issues = evaluateCronHealth(runs, NOW);
    expect(issues).toHaveLength(0);
  });

  it("detects missing jobs (no runs recorded)", () => {
    const issues = evaluateCronHealth([], NOW);
    expect(issues.length).toBe(3); // all 3 expected jobs missing
    expect(issues.every((i) => i.type === "stale")).toBe(true);
    expect(issues.every((i) => i.detail === "No runs recorded")).toBe(true);
  });

  it("detects stale verify-payments (threshold: 5 min)", () => {
    const runs = [
      makeRun("verify-payments", 10), // 10 min ago — over 5 min threshold
      makeRun("sync-chain", 3),
      makeRun("reset-counters", 60),
    ];
    const issues = evaluateCronHealth(runs, NOW);
    const vpIssues = issues.filter((i) => i.job === "verify-payments" && i.type === "stale");
    expect(vpIssues).toHaveLength(1);
    expect(vpIssues[0].detail).toContain("10m ago");
  });

  it("detects stale sync-chain (threshold: 15 min)", () => {
    const runs = [
      makeRun("verify-payments", 1),
      makeRun("sync-chain", 20), // 20 min ago — over 15 min threshold
      makeRun("reset-counters", 60),
    ];
    const issues = evaluateCronHealth(runs, NOW);
    const scIssues = issues.filter((i) => i.job === "sync-chain" && i.type === "stale");
    expect(scIssues).toHaveLength(1);
  });

  it("detects stale reset-counters (threshold: 25 hours)", () => {
    const runs = [
      makeRun("verify-payments", 1),
      makeRun("sync-chain", 3),
      makeRun("reset-counters", 26 * 60), // 26 hours ago
    ];
    const issues = evaluateCronHealth(runs, NOW);
    const rcIssues = issues.filter((i) => i.job === "reset-counters" && i.type === "stale");
    expect(rcIssues).toHaveLength(1);
  });

  it("detects errored jobs", () => {
    const runs = [
      makeRun("verify-payments", 1, "error", "DB connection timeout"),
      makeRun("sync-chain", 3),
      makeRun("reset-counters", 60),
    ];
    const issues = evaluateCronHealth(runs, NOW);
    const errorIssues = issues.filter((i) => i.type === "error");
    expect(errorIssues).toHaveLength(1);
    expect(errorIssues[0].detail).toBe("DB connection timeout");
  });

  it("reports both error and stale for the same job", () => {
    const runs = [
      makeRun("verify-payments", 10, "error", "Crash"), // errored AND stale
      makeRun("sync-chain", 3),
      makeRun("reset-counters", 60),
    ];
    const issues = evaluateCronHealth(runs, NOW);
    const vpIssues = issues.filter((i) => i.job === "verify-payments");
    expect(vpIssues).toHaveLength(2); // one error, one stale
    expect(vpIssues.map((i) => i.type).sort()).toEqual(["error", "stale"]);
  });

  it("does not flag sync-chain at exactly threshold boundary", () => {
    const runs = [
      makeRun("verify-payments", 1),
      makeRun("sync-chain", 15), // exactly 15 min — threshold is 15 min, not stale
      makeRun("reset-counters", 60),
    ];
    const issues = evaluateCronHealth(runs, NOW);
    // At exactly the boundary, age === threshold, not > threshold
    const scIssues = issues.filter((i) => i.job === "sync-chain" && i.type === "stale");
    expect(scIssues).toHaveLength(0);
  });
});
