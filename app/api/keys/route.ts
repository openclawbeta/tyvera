import { NextRequest, NextResponse } from "next/server";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/db/api-keys";
import { getEntitlement } from "@/lib/db/subscriptions";
import { normalizeTier, getApiRateLimit } from "@/lib/types/tiers";

/* ─────────────────────────────────────────────────────────────────── */
/* API Key management                                                  */
/*                                                                     */
/* GET  /api/keys?address=5Grw...  — list keys for a wallet            */
/* POST /api/keys { address, label } — generate a new key              */
/* DELETE /api/keys { address, id } — revoke a key                     */
/* ─────────────────────────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  const keys = await listApiKeys(address);
  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, label } = body;

    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

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
    const body = await request.json();
    const { address, id } = body;

    if (!address || !id) {
      return NextResponse.json({ error: "Missing address or key id" }, { status: 400 });
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
