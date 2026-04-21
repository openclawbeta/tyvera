/**
 * lib/api/wallet-auth.ts
 *
 * Wallet ownership verification for protected API endpoints.
 *
 * Strategy: The client signs a timestamped message with their wallet.
 * The server verifies the signature matches the claimed address.
 * Messages must be within a 5-minute window to prevent replay attacks.
 *
 * Headers required:
 *   X-Wallet-Address:   the SS58 address claiming ownership
 *   X-Wallet-Signature: hex-encoded sr25519 signature
 *   X-Wallet-Message:   the signed message (format: "tyvera-auth:{timestamp}")
 */

import { NextRequest, NextResponse } from "next/server";
import { decodeAddress, signatureVerify } from "@polkadot/util-crypto";

import { AUTH_WINDOW_MS } from "@/lib/config";

export interface WalletAuthResult {
  verified: boolean;
  address?: string;
  errorResponse?: NextResponse;
}

/** Reason a verifyAuthPayload call rejected, for typed error mapping + tests. */
export type AuthFailureReason =
  | "missing"
  | "missing_address"
  | "missing_signature_or_message"
  | "bad_message_format"
  | "expired"
  | "bad_address"
  | "bad_signature"
  | "request_mismatch";

export interface AuthPayload {
  address: string | null | undefined;
  signature: string | null | undefined;
  message: string | null | undefined;
  /** Optional — when provided we enforce v2 method+path binding. */
  method?: string | null;
  pathname?: string | null;
}

export interface AuthPayloadResult {
  ok: boolean;
  reason?: AuthFailureReason;
  address?: string;
  /** True when legacy v1 message format was used (deprecated). */
  legacy?: boolean;
}

/**
 * Pure verification: given the three header values and "now", return whether
 * the payload represents a valid wallet signature. No Next.js / HTTP coupling.
 *
 * This is the one function that tests should exercise directly.
 */
/**
 * Message formats accepted by the server:
 *   v1 (legacy): `tyvera-auth:{timestamp}`
 *   v2 (bound):  `tyvera-auth-v2:{timestamp}:{METHOD}:{pathname}`
 *
 * v2 cryptographically binds the signature to the HTTP method and URL
 * path, preventing cross-endpoint replay. Clients sign v2; v1 is still
 * accepted for a deprecation window so in-flight requests don't break.
 */
const V1_PATTERN = /^tyvera-auth:(\d+)$/;
const V2_PATTERN = /^tyvera-auth-v2:(\d+):([A-Z]+):(\/[^\s]*)$/;

export function verifyAuthPayload(
  payload: AuthPayload,
  now: number = Date.now(),
  windowMs: number = AUTH_WINDOW_MS,
): AuthPayloadResult {
  const { address, signature, message, method, pathname } = payload;

  if (!address && !signature && !message) {
    return { ok: false, reason: "missing" };
  }
  if (!address) {
    return { ok: false, reason: "missing_address" };
  }
  if (!signature || !message) {
    return { ok: false, reason: "missing_signature_or_message" };
  }

  // Try v2 first (preferred). Fall through to v1 as legacy.
  let timestamp: number;
  let isLegacy = false;
  const v2 = message.match(V2_PATTERN);
  if (v2) {
    timestamp = parseInt(v2[1], 10);
    const sigMethod = v2[2];
    const sigPath = v2[3];

    // Enforce binding only when caller provides request context.
    if (method != null && sigMethod !== method.toUpperCase()) {
      return { ok: false, reason: "request_mismatch" };
    }
    if (pathname != null && sigPath !== pathname) {
      return { ok: false, reason: "request_mismatch" };
    }
  } else {
    const v1 = message.match(V1_PATTERN);
    if (!v1) {
      return { ok: false, reason: "bad_message_format" };
    }
    timestamp = parseInt(v1[1], 10);
    isLegacy = true;
  }

  if (Math.abs(now - timestamp) > windowMs) {
    return { ok: false, reason: "expired" };
  }

  try {
    decodeAddress(address);
  } catch {
    return { ok: false, reason: "bad_address" };
  }

  let isValid = false;
  try {
    isValid = signatureVerify(message, signature, address).isValid;
  } catch {
    // signatureVerify throws on malformed hex signature — treat as bad_signature.
    return { ok: false, reason: "bad_signature" };
  }
  if (!isValid) {
    return { ok: false, reason: "bad_signature" };
  }

  return { ok: true, address, legacy: isLegacy };
}

function reasonToResponse(reason: AuthFailureReason): NextResponse {
  switch (reason) {
    case "missing_address":
      return NextResponse.json(
        { error: "Missing X-Wallet-Address header" },
        { status: 401 },
      );
    case "missing_signature_or_message":
      return NextResponse.json(
        { error: "Missing X-Wallet-Signature or X-Wallet-Message header" },
        { status: 401 },
      );
    case "bad_message_format":
      return NextResponse.json(
        { error: "Invalid auth message format. Expected: tyvera-auth:{timestamp}" },
        { status: 401 },
      );
    case "expired":
      return NextResponse.json(
        { error: "Auth message expired. Generate a fresh signature." },
        { status: 401 },
      );
    case "bad_address":
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 401 },
      );
    case "bad_signature":
      return NextResponse.json(
        { error: "Invalid wallet signature" },
        { status: 401 },
      );
    case "request_mismatch":
      return NextResponse.json(
        {
          error:
            "Signature does not match this request. Re-sign with the current method and path.",
        },
        { status: 401 },
      );
    case "missing":
      // Caller decides whether no-headers should be an error.
      return NextResponse.json(
        { error: "Authentication required. Provide X-Wallet-Address, X-Wallet-Signature, and X-Wallet-Message headers." },
        { status: 401 },
      );
  }
}

/**
 * Verify wallet ownership from request headers.
 *
 * Performs full cryptographic signature verification against the claimed
 * wallet address and rejects stale or malformed auth attempts. If no auth
 * headers at all are present, returns `{ verified: false }` without an
 * error response — callers that require auth must use `requireWalletAuth`.
 */
export async function verifyWalletAuth(request: NextRequest): Promise<WalletAuthResult> {
  const result = verifyAuthPayload({
    address: request.headers.get("X-Wallet-Address"),
    signature: request.headers.get("X-Wallet-Signature"),
    message: request.headers.get("X-Wallet-Message"),
    method: request.method,
    pathname: request.nextUrl.pathname,
  });

  if (result.ok) {
    if (result.legacy) {
      // Sampled deprecation log — unbinding permits cross-endpoint replay
      // within the 5-min window. Clients should switch to v2 format.
      // Only 1% sampling to avoid log spam.
      if (Math.random() < 0.01) {
        console.warn(
          "[auth] legacy v1 signature accepted — client should upgrade to v2",
        );
      }
    }
    return { verified: true, address: result.address };
  }

  // No auth headers at all — let caller decide. Every other failure is an error.
  if (result.reason === "missing") {
    return { verified: false };
  }

  return { verified: false, errorResponse: reasonToResponse(result.reason!) };
}

/**
 * Extract the wallet address from a request, preferring verified auth.
 * Falls back to a provided address only when auth was not attempted.
 *
 * NOTE: routes that protect per-wallet resources should gate on
 * `requireWalletAuth` and use `auth.address` directly. Do not trust a
 * caller-supplied fallback address for anything sensitive.
 */
export function getAuthenticatedAddress(
  _request: NextRequest,
  authResult: WalletAuthResult,
  fallbackAddress?: string | null,
): string | null {
  if (authResult.verified && authResult.address) {
    return authResult.address;
  }
  return fallbackAddress ?? null;
}

/**
 * Require wallet auth or return error response.
 * Use this for endpoints that MUST be authenticated.
 */
export async function requireWalletAuth(request: NextRequest): Promise<WalletAuthResult> {
  const result = await verifyWalletAuth(request);

  if (!result.verified && !result.errorResponse) {
    // No auth headers provided at all — close the door.
    return {
      verified: false,
      errorResponse: reasonToResponse("missing"),
    };
  }

  return result;
}
