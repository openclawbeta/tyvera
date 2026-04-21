/**
 * GET/PUT /api/notification-prefs
 *
 * Manage notification channel preferences (email, Telegram).
 * Authenticated — wallet must be verified.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWalletAuth } from "@/lib/api/wallet-auth";
import { getNotificationPrefs, upsertNotificationPrefs } from "@/lib/db/notification-prefs";

export async function GET(request: NextRequest) {
  const auth = await requireWalletAuth(request);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  const prefs = await getNotificationPrefs(address);

  return NextResponse.json(
    prefs ?? {
      wallet_address: address,
      email: null,
      telegram_chat_id: null,
      email_enabled: false,
      telegram_enabled: false,
      min_severity: "warning",
    },
  );
}

export async function PUT(request: NextRequest) {
  const auth = await requireWalletAuth(request);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  const body = await request.json();

  // Validate email format if provided
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Validate min_severity
  if (body.min_severity && !["info", "warning", "critical"].includes(body.min_severity)) {
    return NextResponse.json({ error: "Invalid severity — must be info, warning, or critical" }, { status: 400 });
  }

  await upsertNotificationPrefs(address, {
    email: body.email,
    telegram_chat_id: body.telegram_chat_id,
    email_enabled: body.email_enabled,
    telegram_enabled: body.telegram_enabled,
    min_severity: body.min_severity,
  });

  const updated = await getNotificationPrefs(address);
  return NextResponse.json(updated);
}
