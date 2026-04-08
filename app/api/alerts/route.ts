/**
 * /api/alerts
 *
 * Alert feed for wallet-connected users.
 *
 * GET  ?address=...&unread=1&limit=50  → get alerts
 * GET  ?address=...&count=1            → unread count only
 * POST { address, alertIds? }          → mark alerts as read (all if no ids)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAlerts, getUnreadCount, markAlertsRead } from "@/lib/db/alerts";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  // Count-only mode
  if (req.nextUrl.searchParams.get("count") === "1") {
    try {
      const count = await getUnreadCount(address);
      return NextResponse.json({ unread: count });
    } catch (err) {
      console.error("[alerts] count error:", err);
      return NextResponse.json({ unread: 0 });
    }
  }

  // Full feed
  try {
    const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";
    const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 50));

    const alerts = await getAlerts(address, { limit, unreadOnly });
    const unreadCount = await getUnreadCount(address);

    return NextResponse.json({ alerts, unread: unreadCount });
  } catch (err) {
    console.error("[alerts] GET error:", err);
    return NextResponse.json({ alerts: [], unread: 0 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, alertIds } = body;

    if (!address) {
      return NextResponse.json({ error: "address required" }, { status: 400 });
    }

    await markAlertsRead(address, alertIds);
    const unread = await getUnreadCount(address);

    return NextResponse.json({ ok: true, unread });
  } catch (err) {
    console.error("[alerts] POST error:", err);
    return NextResponse.json({ error: "Failed to mark read" }, { status: 500 });
  }
}
