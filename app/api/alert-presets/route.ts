/**
 * /api/alert-presets
 *
 * Alert preset templates. Strategist+ tier (alert_presets).
 *
 * GET  — list all available presets
 * POST { presetId, address } — apply a preset (creates alert rules)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWalletAuth, getAuthenticatedAddress } from "@/lib/api/wallet-auth";
import { resolveWalletTier } from "@/lib/api/require-entitlement";
import { tierHasFeature } from "@/lib/types/tiers";
import { ALERT_PRESETS } from "@/lib/alerts/presets";
import { upsertAlertRule } from "@/lib/db/alerts";
import type { AlertType } from "@/lib/alerts/types";

export async function GET(req: NextRequest) {
  // Presets list is public — anyone can see what's available.
  // Applying them requires Strategist+.
  return NextResponse.json({
    presets: ALERT_PRESETS.map(({ id, name, description, category, rules }) => ({
      id,
      name,
      description,
      category,
      ruleCount: rules.length,
      alertTypes: rules.map((r) => r.alertType),
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireWalletAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  let body: { presetId?: string; address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const address = getAuthenticatedAddress(req, auth, body.address);
  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  if (auth.verified && auth.address !== address) {
    return NextResponse.json({ error: "Address mismatch" }, { status: 403 });
  }

  // Tier check
  const tier = await resolveWalletTier(address);
  if (!tierHasFeature(tier, "alert_presets")) {
    return NextResponse.json(
      {
        error: "Alert presets require Strategist tier or above",
        currentTier: tier,
        requiredTier: "strategist",
        upgrade_url: "/pricing",
      },
      { status: 403 },
    );
  }

  const { presetId } = body;
  if (!presetId) {
    return NextResponse.json({ error: "presetId is required" }, { status: 400 });
  }

  const preset = ALERT_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    return NextResponse.json(
      { error: `Unknown preset: ${presetId}`, available: ALERT_PRESETS.map((p) => p.id) },
      { status: 400 },
    );
  }

  // Apply all rules from the preset
  const created = [];
  for (const rule of preset.rules) {
    try {
      const result = await upsertAlertRule(
        address,
        rule.alertType as AlertType,
        rule.threshold,
        true,
        rule.subnetFilter,
      );
      created.push(result);
    } catch (err) {
      console.error(`[alert-presets] Failed to create rule ${rule.alertType}:`, err);
    }
  }

  return NextResponse.json({
    preset: preset.name,
    rulesCreated: created.length,
    rulesRequested: preset.rules.length,
    rules: created,
  });
}
