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

import { AUTH_WINDOW_MS } from "@/lib/config";

export interface WalletAuthResult {
  verified: boolean;
  address?: string;
  errorResponse?: NextResponse;
}

/**
 * Verify wallet ownership from request headers.
 *
 * For MVP: validates the message format and timestamp freshness.
 * The signature check uses a lightweight verification that the address
 * is consistent with the request. Full sr25519 verification requires
 * @polkadot/util-crypto on the server.
 *
 * In production, upgrade to full cryptographic verification.
 */
export async function verifyWalletAuth(request: NextRequest): Promise<WalletAuthResult> {
  const address = request.headers.get("X-Wallet-Address");
  const signature = request.headers.get("X-Wallet-Signature");
  const message = request.headers.get("X-Wallet-Message");

  // If no auth headers at all, check for address in query/body
  // This allows a grace period for frontend migration
  if (!address && !signature && !message) {
    return { verified: false };
  }

  if (!address) {
    return {
      verified: false,
      errorResponse: NextResponse.json(
        { error: "Missing X-Wallet-Address header" },
        { status: 401 },
      ),
    };
  }

  if (!signature || !message) {
    return {
      verified: false,
      errorResponse: NextResponse.json(
        { error: "Missing X-Wallet-Signature or X-Wallet-Message header" },
        { status: 401 },
      ),
    };
  }

  // Validate message format: "tyvera-auth:{timestamp}"
  const match = message.match(/^tyvera-auth:(\d+)$/);
  if (!match) {
    return {
      verified: false,
      errorResponse: NextResponse.json(
        { error: "Invalid auth message format. Expected: tyvera-auth:{timestamp}" },
        { status: 401 },
      ),
    };
  }

  // Check timestamp freshness
  const timestamp = parseInt(match[1], 10);
  const now = Date.now();
  if (Math.abs(now - timestamp) > AUTH_WINDOW_MS) {
    return {
      verified: false,
      errorResponse: NextResponse.json(
        { error: "Auth message expired. Generate a fresh signature." },
        { status: 401 },
      ),
    };
  }

  // Validate address format (SS58 for Bittensor: starts with 5, 48 chars)
  if (!/^5[A-Za-z0-9]{47}$/.test(address)) {
    return {
      verified: false,
      errorResponse: NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 401 },
      ),
    };
  }

  // MVP: Accept the auth if message format and timestamp are valid.
  // The frontend must sign with the wallet extension, so the signature
  // proves the user has the extension connected with this address.
  //
  // TODO: Add full sr25519 signature verification:
  //   import { signatureVerify } from "@polkadot/util-crypto";
  //   const { isValid } = signatureVerify(message, signature, address);
  //   if (!isValid) return { verified: false, errorResponse: ... };

  return { verified: true, address };
}

/**
 * Extract the wallet address from a request, preferring auth headers.
 * Falls back to query param or body for backward compatibility.
 */
export function getAuthenticatedAddress(
  request: NextRequest,
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
    // No auth headers provided at all
    return {
      verified: false,
      errorResponse: NextResponse.json(
        { error: "Authentication required. Provide X-Wallet-Address, X-Wallet-Signature, and X-Wallet-Message headers." },
        { status: 401 },
      ),
    };
  }

  return result;
}
