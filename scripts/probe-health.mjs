/**
 * scripts/probe-health.mjs
 *
 * Hits the deployed /api/health endpoint, prints a compact status report,
 * and exits non-zero if anything is unhealthy. Safe to run from CI or a
 * local shell.
 *
 *   BASE_URL=https://tyvera.app node scripts/probe-health.mjs
 *   # or:
 *   node scripts/probe-health.mjs https://tyvera.app
 *
 * No auth needed — /api/health is intentionally public.
 */

const baseUrl =
  process.argv[2] ||
  process.env.BASE_URL ||
  process.env.VERCEL_URL ||
  "http://localhost:3000";

// VERCEL_URL comes without scheme.
const normalized = /^https?:\/\//.test(baseUrl) ? baseUrl : `https://${baseUrl}`;
const url = normalized.replace(/\/+$/, "") + "/api/health";

function fmtAge(ms) {
  if (ms == null) return "n/a";
  const s = Math.round(ms / 1000);
  if (s < 90) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m}m`;
  const h = Math.round(m / 60);
  return `${h}h`;
}

console.log(`\n── Health probe → ${url} ──\n`);

let res;
try {
  res = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
} catch (err) {
  console.log(`✗ fetch failed: ${err.message ?? err}`);
  process.exit(2);
}

const body = await res.json().catch(() => null);
if (!body) {
  console.log(`✗ ${res.status} — response was not JSON`);
  process.exit(2);
}

console.log(`Status:    HTTP ${res.status} (${body.healthy ? "HEALTHY" : "UNHEALTHY"})`);
console.log(`Timestamp: ${body.timestamp}`);
console.log(`DB:        ${body.db?.connected ? "connected" : "DOWN"}`);

if (body.data) {
  const age = body.data.subnetsJsonAgeMs == null ? "unknown age" : `${fmtAge(body.data.subnetsJsonAgeMs)} old`;
  console.log(`subnets.json: ${body.data.level} (${age})`);
}

if (body.scanner) {
  console.log(
    `Scanner:   buffer=${body.scanner.bufferSize} lastBlock=${body.scanner.lastScannedBlock} ` +
    `persisted=${body.scanner.persistedEvents}`,
  );
}

console.log("\nCron jobs:");
for (const job of body.cron ?? []) {
  const mark = job.status === "ok" && !job.overdue ? "✓" : "✗";
  const age = fmtAge(job.ageMs);
  const dur = job.durationMs != null ? ` (${job.durationMs}ms)` : "";
  const overdue = job.overdue ? " OVERDUE" : "";
  const err = job.hasError ? " ERRORED" : "";
  console.log(`  ${mark} ${job.jobName.padEnd(20)} ${job.status.padEnd(10)} ${age}${dur}${overdue}${err}`);
}

if (!body.healthy && body.issues) {
  console.log("\nIssues:");
  for (const issue of body.issues) console.log(`  • ${issue}`);
}

console.log();
process.exit(body.healthy ? 0 : 1);
