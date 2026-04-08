/**
 * lib/api/auth-middleware.ts
 *
 * Shared API authentication helper for public data routes.
 *
 * Policy:
 *   - No Authorization header → allowed (serves the frontend app)
 *   - Authorization: Bearer tyv_... → validate key, enforce rate limits
 *   - Invalid/revoked/rate-limited key → reject with 401 or 429
 *
 * This lets the Next.js frontend call /api/subnets freely while
 * requiring external consumers to authenticate. Rate limits only
 * apply to authenticated (keyed) requests.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, type ApiKeyValidation } from "@/lib/db/api-keys";

export interface AuthResult {
  authenticated: boolean;
  validation?: ApiKeyValidation;
  errorResponse?: NextResponse;
}

/**
 * Check the Authorization header on a request.
 *
 * Returns `{ authenticated: true, validation }` on success,
 * `{ authenticated: false }` when no header is present (anonymous),
 * or `{ authenticated: false, errorResponse }` when a key is
 * provided but invalid/rate-limited.
 */
export async function checkApiAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get("Authorization");

  // No auth header → anonymous access (frontend app)
  if (!authHeader) {
    return { authenticated: false };
  }

  // Must be Bearer token format
  if (!authHeader.startsWith("Bearer ")) {
    return {
      authenticated: false,
      errorResponse: NextResponse.json(
        { error: "Invalid Authorization header. Expected: Bearer tyv_..." },
        { status: 401 },
      ),
    };
  }

  const key = authHeader.slice(7).trim();

  // Must be a Tyvera key
  if (!key.startsWith("tyv_")) {
    return {
      authenticated: false,
      errorResponse: NextResponse.json(
        { error: "Invalid API key format. Keys start with tyv_" },
        { status: 401 },
      ),
    };
  }

  // Validate against DB
  const validation = await validateApiKey(key);

  if (!validation.valid) {
    const status = validation.error?.includes("Rate limit") ? 429 : 401;

    const headers: Record<string, string> = {};
    if (status === 429) {
      // Midnight UTC is next reset
      const now = new Date();
      const midnight = new Date(now);
      midnight.setUTCHours(24, 0, 0, 0);
      const retryAfter = Math.ceil((midnight.getTime() - now.getTime()) / 1000);
      headers["Retry-After"] = String(retryAfter);
      headers["X-RateLimit-Limit"] = String(validation.rate_limit ?? 0);
      headers["X-RateLimit-Remaining"] = "0";
      headers["X-RateLimit-Reset"] = midnight.toISOString();
    }

    return {
      authenticated: false,
      errorResponse: NextResponse.json(
        {
          error: validation.error,
          ...(validation.rate_limit ? { rate_limit: validation.rate_limit } : {}),
          ...(validation.requests_today != null ? { requests_today: validation.requests_today } : {}),
        },
        { status, headers },
      ),
    };
  }

  return { authenticated: true, validation };
}

/**
 * Build rate-limit headers for successful authenticated responses.
 */
export function rateLimitHeaders(validation: ApiKeyValidation): Record<string, string> {
  if (!validation.rate_limit || validation.rate_limit < 0) return {};

  const remaining = Math.max(0, validation.rate_limit - (validation.requests_today ?? 0));

  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);

  return {
    "X-RateLimit-Limit": String(validation.rate_limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": midnight.toISOString(),
  };
}
