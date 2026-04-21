/**
 * lib/env-check.ts
 *
 * Startup environment validation. Checks for critical, recommended,
 * and optional env vars and logs clear warnings so missing config
 * is caught at deploy time, not at runtime in a random API route.
 *
 * Called from instrumentation.ts on server startup.
 */

interface EnvVar {
  name: string;
  level: "critical" | "recommended" | "optional";
  description: string;
}

const ENV_VARS: EnvVar[] = [
  // Critical — app will malfunction without these in production
  {
    name: "TURSO_DATABASE_URL",
    level: "critical",
    description: "Turso/libsql database URL — without this, data is in-memory only and resets on every restart",
  },
  {
    name: "TURSO_AUTH_TOKEN",
    level: "critical",
    description: "Turso auth token — required to connect to the production database",
  },
  {
    name: "CRON_SECRET",
    level: "critical",
    description: "Secret for authenticating Vercel cron jobs — without this, all cron endpoints reject requests",
  },
  {
    name: "DEPOSIT_ADDRESS",
    level: "critical",
    description: "TAO deposit wallet address — payment verification cannot match incoming transfers without this",
  },

  // Recommended — important features degrade without these
  {
    name: "ADMIN_SECRET",
    level: "recommended",
    description: "Admin endpoint auth — admin routes will reject all requests",
  },
  {
    name: "TAOSTATS_API_KEY",
    level: "recommended",
    description: "Taostats API key — subnet data refresh scripts will fail",
  },
  {
    name: "OPENAI_API_KEY",
    level: "recommended",
    description: "OpenAI key — AI chat endpoint will return configuration errors",
  },

  // Optional — nice to have
  {
    name: "ALERT_WEBHOOK_URL",
    level: "optional",
    description: "Slack/Discord webhook for health alerts — omit to disable",
  },
  {
    name: "RESEND_API_KEY",
    level: "optional",
    description: "Resend API key for email notifications — omit to disable email alerts",
  },
  {
    name: "TELEGRAM_BOT_TOKEN",
    level: "optional",
    description: "Telegram bot token for Telegram notifications — omit to disable",
  },
  {
    name: "CMC_API_KEY",
    level: "optional",
    description: "CoinMarketCap API key — fallback price source when CoinGecko is unavailable",
  },
];

export function validateEnv(): { ok: boolean; missing: { name: string; level: string; description: string }[] } {
  const missing: { name: string; level: string; description: string }[] = [];

  for (const v of ENV_VARS) {
    if (!process.env[v.name]) {
      missing.push({ name: v.name, level: v.level, description: v.description });
    }
  }

  if (missing.length === 0) {
    console.log("[env-check] ✓ All environment variables configured");
    return { ok: true, missing: [] };
  }

  const critical = missing.filter((m) => m.level === "critical");
  const recommended = missing.filter((m) => m.level === "recommended");
  const optional = missing.filter((m) => m.level === "optional");

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║           TYVERA — Environment Check                    ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  if (critical.length > 0) {
    console.error("🔴 CRITICAL (app will malfunction without these):");
    for (const m of critical) {
      console.error(`   ✗ ${m.name} — ${m.description}`);
    }
    console.log("");
  }

  if (recommended.length > 0) {
    console.warn("🟡 RECOMMENDED (important features will be disabled):");
    for (const m of recommended) {
      console.warn(`   ✗ ${m.name} — ${m.description}`);
    }
    console.log("");
  }

  if (optional.length > 0) {
    console.log("🔵 OPTIONAL (nice-to-have features):");
    for (const m of optional) {
      console.log(`   ○ ${m.name} — ${m.description}`);
    }
    console.log("");
  }

  const setCount = ENV_VARS.length - missing.length;
  console.log(`📊 ${setCount}/${ENV_VARS.length} vars configured | ${critical.length} critical missing\n`);

  return { ok: critical.length === 0, missing };
}
