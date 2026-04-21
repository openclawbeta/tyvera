/**
 * middleware.ts
 *
 * Edge middleware for early request filtering before API routes execute.
 *
 * 1. IP-based rate limiting on /api/* routes (prevents abuse before
 *    hitting the application-level per-wallet rate limiter).
 * 2. Tiered limits — sensitive endpoints (auth, admin, payments, keys,
 *    chat) get a much lower ceiling than public browsing routes.
 * 3. Passes through all non-API routes unchanged.
 *
 * Uses an in-memory sliding window counter per IP. This resets on
 * cold starts but provides effective burst protection at the edge.
 *
 * NOTE: Vercel Edge Functions run in isolated V8 isolates. The in-memory
 * map is per-isolate, so this is a best-effort rate limiter. For strict
 * enforcement, the application-level rate limiter (daily_usage table)
 * remains the source of truth.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* ── Configuration ────────────────────────────────────────────────── */

/** Default max API requests per IP within the window (browsing/data). */
const DEFAULT_LIMIT = 120;

/**
 * Lower limit for auth-sensitive and expensive endpoints. Each path here
 * gets its own independent counter so one hot path doesn't burn another's
 * budget.
 */
const SENSITIVE_LIMIT = 10;

/** Sliding window duration in ms (1 minute) */
const WINDOW_MS = 60_000;

/** Routes that skip rate limiting entirely. */
const BYPASS_PREFIXES = [
  "/api/health",    // monitoring
  "/api/cron/",     // Vercel cron (auth-gated separately)
];

/**
 * Prefixes that get the lower `SENSITIVE_LIMIT` bucket.
 *
 * Rationale:
 *   /api/admin       — admin actions; leaked secret ⇒ use lower bucket
 *   /api/subscribe   — payment registration
 *   /api/verify-payments — payment verification
 *   /api/keys        — API key mgmt (creation is cheap to abuse)
 *   /api/chat        — LLM-backed, expensive per call
 *   /api/team        — wallet-gated group management
 *   /api/webhooks    — endpoint registration
 *   /api/whitelabel  — tenant config
 *   /api/export      — potentially large data dumps
 */
const SENSITIVE_PREFIXES = [
  "/api/admin",
  "/api/subscribe",
  "/api/verify-payments",
  "/api/keys",
  "/api/chat",
  "/api/team",
  "/api/webhooks",
  "/api/whitelabel",
  "/api/export",
];

/* ── In-memory sliding window ─────────────────────────────────────── */

interface WindowEntry {
  count: number;
  resetAt: number;
}

/** key = `${bucket}:${ip}` — separate counters per logical bucket. */
const ipWindows = new Map<string, WindowEntry>();

/** Periodic cleanup to prevent unbounded map growth */
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60_000; // 5 min

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of ipWindows) {
    if (entry.resetAt < now) ipWindows.delete(key);
  }
}

function checkRateLimit(
  key: string,
  limit: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  cleanup(now);

  const entry = ipWindows.get(key);

  if (!entry || entry.resetAt < now) {
    ipWindows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: limit - 1, resetAt: now + WINDOW_MS };
  }

  entry.count++;

  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/** Pick the matching sensitive prefix (for bucket keying), or null. */
function sensitivePrefix(pathname: string): string | null {
  for (const prefix of SENSITIVE_PREFIXES) {
    if (pathname.startsWith(prefix)) return prefix;
  }
  return null;
}

/* ── Middleware ────────────────────────────────────────────────────── */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate limit API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip monitoring/cron routes
  for (const prefix of BYPASS_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return NextResponse.next();
    }
  }

  // Get client IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  // Pick bucket + limit.
  const prefix = sensitivePrefix(pathname);
  const limit = prefix ? SENSITIVE_LIMIT : DEFAULT_LIMIT;
  const bucket = prefix ?? "default";
  const key = `${bucket}:${ip}`;

  const { allowed, remaining, resetAt } = checkRateLimit(key, limit);

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: "Too many requests",
        retryAfter,
        message: "Rate limit exceeded. Please wait before making more requests.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      },
    );
  }

  // Add rate limit headers to successful responses
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
