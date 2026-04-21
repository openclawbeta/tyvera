/**
 * middleware.ts
 *
 * Edge middleware for early request filtering before API routes execute.
 *
 * 1. IP-based rate limiting on /api/* routes (prevents abuse before
 *    hitting the application-level per-wallet rate limiter).
 * 2. Passes through all non-API routes unchanged.
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

/** Max API requests per IP within the window */
const RATE_LIMIT = 120;

/** Sliding window duration in ms (1 minute) */
const WINDOW_MS = 60_000;

/** Routes that skip rate limiting */
const BYPASS_PREFIXES = [
  "/api/health",    // monitoring
  "/api/cron/",     // Vercel cron (auth-gated separately)
];

/* ── In-memory sliding window ─────────────────────────────────────── */

interface WindowEntry {
  count: number;
  resetAt: number;
}

const ipWindows = new Map<string, WindowEntry>();

/** Periodic cleanup to prevent unbounded map growth */
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60_000; // 5 min

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [ip, entry] of ipWindows) {
    if (entry.resetAt < now) ipWindows.delete(ip);
  }
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  cleanup(now);

  const entry = ipWindows.get(ip);

  if (!entry || entry.resetAt < now) {
    // New window
    ipWindows.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetAt: now + WINDOW_MS };
  }

  entry.count++;

  if (entry.count > RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: RATE_LIMIT - entry.count, resetAt: entry.resetAt };
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

  const { allowed, remaining, resetAt } = checkRateLimit(ip);

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
          "X-RateLimit-Limit": String(RATE_LIMIT),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      },
    );
  }

  // Add rate limit headers to successful responses
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
