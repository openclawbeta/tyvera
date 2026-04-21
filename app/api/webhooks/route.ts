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
import { listWebhooks, createWebhook, deleteWebhook } from "@/lib/db/webhooks";

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

  let body: { url?: string; label?: string; eventTypes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, label, eventTypes } = body;
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Validate URL format
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "URL must use http or https" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

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
    eventTypes ?? "*",
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

export async function DELETE(req: NextRequest) {
  const auth = await requireWalletAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  const tier = await resolveWalletTier(address);
  const denied = requireWebhookTier(tier);
  if (denied) return denied;

  let body: { id?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await deleteWebhook(address, body.id);
  return NextResponse.json({ ok: true });
}
