/**
 * /api/webhooks
 *
 * Webhook registration management. Institutional tier only.
 *
 * GET    — list webhooks for caller
 * POST   { url, label?, eventTypes? } — register a new webhook
 * DELETE { id } — remove a webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWalletAuth } from "@/lib/api/wallet-auth";
import { resolveWalletTier } from "@/lib/api/require-entitlement";
import { tierHasFeature } from "@/lib/types/tiers";
import { listWebhooks, createWebhook, deleteWebhook, reactivateWebhook } from "@/lib/db/webhooks";
import { parseAddWebhookBody, safeParse } from "@/lib/api/validation";

const MAX_WEBHOOKS = 10;

function requireWebhookTier(tier: string) {
  if (!tierHasFeature(tier, "webhooks")) {
    return NextResponse.json(
      {
        error: "Webhooks require Institutional tier",
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
  const denied = requireWebhookTier(tier);
  if (denied) return denied;

  const webhooks = await listWebhooks(address);
  // Strip secrets from list response
  const safe = webhooks.map(({ secret, ...rest }) => rest);
  return NextResponse.json({ webhooks: safe });
}

export async function POST(req: NextRequest) {
  const auth = await requireWalletAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  const tier = await resolveWalletTier(address);
  const denied = requireWebhookTier(tier);
  if (denied) return denied;

  const raw = await req.json().catch(() => null);
  const parsed = parseAddWebhookBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { url, label } = parsed.value;
  const eventTypesRaw = (raw as { eventTypes?: unknown })?.eventTypes;
  const eventTypes =
    typeof eventTypesRaw === "string" && eventTypesRaw.length <= 200 ? eventTypesRaw : "*";

  // Check limit
  const existing = await listWebhooks(address);
  if (existing.length >= MAX_WEBHOOKS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_WEBHOOKS} webhooks per account` },
      { status: 400 },
    );
  }

  const { webhook, signingSecret } = await createWebhook(
    address,
    url,
    label ?? "default",
    eventTypes,
  );

  return NextResponse.json(
    {
      id: webhook.id,
      url: webhook.url,
      label: webhook.label,
      eventTypes: webhook.event_types,
      signingSecret,
      warning: "Save this signing secret now — it cannot be retrieved again.",
    },
    { status: 201 },
  );
}

export async function PATCH(req: NextRequest) {
  const auth = await requireWalletAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  const tier = await resolveWalletTier(address);
  const denied = requireWebhookTier(tier);
  if (denied) return denied;

  const raw = await req.json().catch(() => null);
  const parsed = safeParse(() => {
    if (typeof raw !== "object" || raw === null) throw new Error("request body must be an object");
    const id = (raw as Record<string, unknown>).id;
    const action = (raw as Record<string, unknown>).action;
    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
      throw new Error("'id' must be a positive integer");
    }
    if (action !== "reactivate") {
      throw new Error("'action' must be 'reactivate'");
    }
    return { id };
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const ok = await reactivateWebhook(address, parsed.value.id);
  if (!ok) {
    return NextResponse.json(
      { error: "Webhook not found or not eligible for reactivation" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, status: "active" });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireWalletAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  const tier = await resolveWalletTier(address);
  const denied = requireWebhookTier(tier);
  if (denied) return denied;

  const raw = await req.json().catch(() => null);
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

  await deleteWebhook(address, parsed.value.id);
  return NextResponse.json({ ok: true });
}
