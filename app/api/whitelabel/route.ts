/**
 * /api/whitelabel
 *
 * Whitelabel branding configuration. Institutional tier only.
 *
 * GET  — get current branding config
 * PUT  { logoUrl?, accentColor?, appName?, customDomain? } — update branding
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWalletAuth } from "@/lib/api/wallet-auth";
import { resolveWalletTier } from "@/lib/api/require-entitlement";
import { tierHasFeature } from "@/lib/types/tiers";
import { getWhitelabelConfig, upsertWhitelabelConfig } from "@/lib/db/whitelabel";

function requireWhitelabelTier(tier: string) {
  if (!tierHasFeature(tier, "whitelabel")) {
    return NextResponse.json(
      {
        error: "Whitelabel requires Institutional tier",
        currentTier: tier,
        requiredTier: "institutional",
        upgrade_url: "/pricing",
      },
      { status: 403 },
    );
  }
  return null;
}

export async function GET(req: NextRequest) {
  const auth = await requireWalletAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  const tier = await resolveWalletTier(address);
  const denied = requireWhitelabelTier(tier);
  if (denied) return denied;

  const config = await getWhitelabelConfig(address);
  return NextResponse.json({
    config: config ?? {
      logo_url: null,
      accent_color: null,
      app_name: null,
      custom_domain: null,
    },
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireWalletAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  const tier = await resolveWalletTier(address);
  const denied = requireWhitelabelTier(tier);
  if (denied) return denied;

  let body: {
    logoUrl?: string | null;
    accentColor?: string | null;
    appName?: string | null;
    customDomain?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate accent color if provided
  if (body.accentColor && !/^#[0-9a-fA-F]{6}$/.test(body.accentColor)) {
    return NextResponse.json(
      { error: "accentColor must be a hex color (e.g. #00d4aa)" },
      { status: 400 },
    );
  }

  // Validate logo URL if provided
  if (body.logoUrl) {
    try {
      const parsed = new URL(body.logoUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json({ error: "logoUrl must use http or https" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid logoUrl format" }, { status: 400 });
    }
  }

  const config = await upsertWhitelabelConfig(address, body);
  return NextResponse.json({ config });
}
