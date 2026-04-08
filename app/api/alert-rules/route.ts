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
    const body = await req.json();
    const { address: bodyAddress, type, threshold, enabled, subnetFilter } = body;

    // Verify wallet ownership
    const auth = await requireWalletAuth(req);
    if (auth.errorResponse) return auth.errorResponse;

    const address = getAuthenticatedAddress(req, auth, bodyAddress);

    if (!address || !type) {
      return NextResponse.json({ error: "address and type required" }, { status: 400 });
    }

    if (auth.verified && auth.address !== address) {
      return NextResponse.json({ error: "Address mismatch" }, { status: 403 });
    }

    if (!(type in ALERT_TYPE_META)) {
      return NextResponse.json({ error: `Invalid alert type: ${type}` }, { status: 400 });
    }

    const meta = ALERT_TYPE_META[type as AlertType];
    const safeThreshold = Math.max(meta.minThreshold, Math.min(meta.maxThreshold, Number(threshold ?? meta.defaultThreshold)));

    const rule = await upsertAlertRule(
      address,
      type as AlertType,
      safeThreshold,
      enabled !== false,
      subnetFilter ?? null,
    );

    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    console.error("[alert-rules] POST error:", err);
    return NextResponse.json({ error: "Failed to save rule" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { address: bodyAddress, ruleId } = body;

    const auth = await requireWalletAuth(req);
    if (auth.errorResponse) return auth.errorResponse;

    const address = getAuthenticatedAddress(req, auth, bodyAddress);

    if (!address || !ruleId) {
      return NextResponse.json({ error: "address and ruleId required" }, { status: 400 });
    }

    if (auth.verified && auth.address !== address) {
      return NextResponse.json({ error: "Address mismatch" }, { status: 403 });
    }

    await deleteAlertRule(address, Number(ruleId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[alert-rules] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { address: bodyAddress, action } = body;

    const auth = await requireWalletAuth(req);
    if (auth.errorResponse) return auth.errorResponse;

    const address = getAuthenticatedAddress(req, auth, bodyAddress);

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
