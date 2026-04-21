import { NextRequest, NextResponse } from "next/server";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/db/api-keys";
import { getEntitlement } from "@/lib/db/subscriptions";
import { normalizeTier, getApiRateLimit } from "@/lib/types/tiers";
import { requireWalletAuth } from "@/lib/api/wallet-auth";
import { safeParse } from "@/lib/api/validation";

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

    const raw = await request.json().catch(() => ({}));
    const parsed = safeParse(() => {
      if (typeof raw !== "object" || raw === null) return { label: undefined as string | undefined };
      const l = (raw as Record<string, unknown>).label;
      if (l === undefined || l === null) return { label: undefined };
      if (typeof l !== "string") throw new Error("'label' must be a string");
      if (l.length > 60) throw new Error("'label' must be at most 60 chars");
      return { label: l };
    });
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { label } = parsed.value;

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

    const raw = await request.json().catch(() => null);
    const parsed = safeParse(() => {
      if (typeof raw !== "object" || raw === null) throw new Error("request body must be an object");
      const id = (raw as Record<string, unknown>).id;
      if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
        throw new Error("'id' must be a positive integer");
      }
      return { id };
    });
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const revoked = await revokeApiKey(parsed.value.id, address);
    if (!revoked) {
      return NextResponse.json({ error: "Key not found or already revoked" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 });
  }
}
