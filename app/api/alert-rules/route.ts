/**
 * /api/alert-rules
 *
 * CRUD for user alert rules. Wallet-gated.
 *
 * GET  ?address=...           → list all rules for wallet
 * POST { address, type, threshold, enabled?, subnetFilter? } → create/update rule
 * DELETE { address, ruleId }  → delete a rule
 * PUT  { address, action: "init_defaults" } → initialize default rules
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAlertRules,
  upsertAlertRule,
  deleteAlertRule,
  initDefaultRules,
} from "@/lib/db/alerts";
import { ALERT_TYPE_META, type AlertType } from "@/lib/alerts/types";
import { requireWalletAuth, getAuthenticatedAddress } from "@/lib/api/wallet-auth";
import { resolveWalletTier, getAlertRuleQuota } from "@/lib/api/require-entitlement";

export async function GET(req: NextRequest) {
  const queryAddress = req.nextUrl.searchParams.get("address");

  // Verify wallet ownership
  const auth = await requireWalletAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const address = getAuthenticatedAddress(req, auth, queryAddress);
  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  // If auth headers provided, ensure address matches
  if (auth.verified && auth.address !== address) {
    return NextResponse.json({ error: "Address mismatch" }, { status: 403 });
  }

  try {
    const rules = await getAlertRules(address);
    return NextResponse.json(rules);
  } catch (err) {
    console.error("[alert-rules] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { address: bodyAddress, type, threshold, enabled, subnetFilter } = body as Record<string, unknown>;

    // Verify wallet ownership
    const auth = await requireWalletAuth(req);
    if (auth.errorResponse) return auth.errorResponse;

    const address = getAuthenticatedAddress(req, auth, typeof bodyAddress === "string" ? bodyAddress : null);

    if (!address || typeof type !== "string") {
      return NextResponse.json({ error: "address and type required" }, { status: 400 });
    }

    if (auth.verified && auth.address !== address) {
      return NextResponse.json({ error: "Address mismatch" }, { status: 403 });
    }

    if (!(type in ALERT_TYPE_META)) {
      return NextResponse.json({ error: `Invalid alert type: ${type}` }, { status: 400 });
    }

    const thresholdNum = typeof threshold === "number" ? threshold : Number(threshold);
    if (threshold !== undefined && !Number.isFinite(thresholdNum)) {
      return NextResponse.json({ error: "threshold must be a number" }, { status: 400 });
    }
    const enabledBool = enabled === undefined ? true : enabled !== false;
    const subnetFilterStr =
      subnetFilter === undefined || subnetFilter === null
        ? null
        : typeof subnetFilter === "string" && subnetFilter.length <= 200
          ? subnetFilter
          : null;

    // ── Entitlement: enforce alert rule quota ──────────────────────
    const tier = await resolveWalletTier(address);
    const quota = getAlertRuleQuota(tier);

    if (quota === 0) {
      return NextResponse.json(
        {
          error: "Alert rules require Analyst tier or above",
          currentTier: tier,
          requiredTier: "analyst",
        },
        { status: 403 },
      );
    }

    if (quota > 0) {
      // Check existing rule count (unlimited tiers skip this)
      const existing = await getAlertRules(address);
      if (existing.length >= quota) {
        return NextResponse.json(
          {
            error: `Alert rule limit reached (${quota} rules). Upgrade to Strategist for unlimited alerts.`,
            currentCount: existing.length,
            limit: quota,
            currentTier: tier,
          },
          { status: 403 },
        );
      }
    }

    const meta = ALERT_TYPE_META[type as keyof typeof ALERT_TYPE_META];
    const safeThreshold = Math.max(
      meta.minThreshold,
      Math.min(meta.maxThreshold, Number.isFinite(thresholdNum) ? thresholdNum : meta.defaultThreshold),
    );

    const rule = await upsertAlertRule(
      address,
      type as AlertType,
      safeThreshold,
      enabledBool,
      subnetFilterStr,
    );

    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    console.error("[alert-rules] POST error:", err);
    return NextResponse.json({ error: "Failed to save rule" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { address: bodyAddress, ruleId } = body as Record<string, unknown>;

    const auth = await requireWalletAuth(req);
    if (auth.errorResponse) return auth.errorResponse;

    const address = getAuthenticatedAddress(req, auth, typeof bodyAddress === "string" ? bodyAddress : null);
    const ruleIdNum = typeof ruleId === "number" ? ruleId : Number(ruleId);

    if (!address || !Number.isFinite(ruleIdNum) || ruleIdNum <= 0) {
      return NextResponse.json({ error: "address and ruleId required" }, { status: 400 });
    }

    if (auth.verified && auth.address !== address) {
      return NextResponse.json({ error: "Address mismatch" }, { status: 403 });
    }

    await deleteAlertRule(address, ruleIdNum);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[alert-rules] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { address: bodyAddress, action } = body as Record<string, unknown>;

    const auth = await requireWalletAuth(req);
    if (auth.errorResponse) return auth.errorResponse;

    const address = getAuthenticatedAddress(req, auth, typeof bodyAddress === "string" ? bodyAddress : null);

    if (!address) {
      return NextResponse.json({ error: "address required" }, { status: 400 });
    }

    if (auth.verified && auth.address !== address) {
      return NextResponse.json({ error: "Address mismatch" }, { status: 403 });
    }

    if (action === "init_defaults") {
      await initDefaultRules(address);
      const rules = await getAlertRules(address);
      return NextResponse.json({ initialized: true, rules });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[alert-rules] PUT error:", err);
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}
