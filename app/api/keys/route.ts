import { NextRequest, NextResponse } from "next/server";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/db/api-keys";
import { getEntitlement } from "@/lib/db/subscriptions";
import { normalizeTier, getApiRateLimit } from "@/lib/types/tiers";
import { requireWalletAuth } from "@/lib/api/wallet-auth";

/* ─────────────────────────────────────────────────────────────────── */
/* API Key management                                                  */
/*                                                                     */
/* GET    /api/keys                 — list keys for the caller         */
/* POST   /api/keys { label }       — generate a new key               */
/* DELETE /api/keys { id }          — revoke a key                     */
/*                                                                     */
/* The caller's wallet address is taken from the verified signed       */
/* X-Wallet-* headers. Any `address` field in the body or query is     */
/* ignored — it cannot be used to act on another wallet's keys.        */
/* ─────────────────────────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const auth = await requireWalletAuth(request);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  const keys = await listApiKeys(address);
  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireWalletAuth(request);
    if (auth.errorResponse) return auth.errorResponse;
    const address = auth.address!;

    let body: { label?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine — label falls back below.
    }
    const { label } = body;

    // Check entitlement — must be strategist+ for API access
    const entitlement = await getEntitlement(address);
    const tier = entitlement ? normalizeTier(entitlement.tier) : "explorer";
    const rateLimit = getApiRateLimit(tier);

    if (rateLimit === 0) {
      return NextResponse.json(
        {
          error: "API access requires Strategist tier or above",
          upgrade_url: "/pricing",
        },
        { status: 403 },
      );
    }

    const result = await createApiKey({
      walletAddress: address,
      tier,
      label: label || "default",
    });

    return NextResponse.json({
      key: result.key, // Only returned once!
      prefix: result.prefix,
      id: result.id,
      tier,
      rate_limit: rateLimit === -1 ? "unlimited" : rateLimit,
      warning: "Save this key now — it cannot be retrieved again.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create API key";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireWalletAuth(request);
    if (auth.errorResponse) return auth.errorResponse;
    const address = auth.address!;

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing key id" }, { status: 400 });
    }

    const revoked = await revokeApiKey(id, address);
    if (!revoked) {
      return NextResponse.json({ error: "Key not found or already revoked" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 });
  }
}
