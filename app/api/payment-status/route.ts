/**
 * /api/payment-status
 *
 * GET ?memo=TYV-...
 *
 * Returns the current status of a payment intent.
 * Used by the pricing page to poll for payment confirmation.
 * No wallet auth required — memo acts as a lookup key and
 * reveals only the status (not amounts or addresses).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const memo = request.nextUrl.searchParams.get("memo");

  if (!memo || !memo.startsWith("TYV-")) {
    return NextResponse.json({ error: "Valid memo required" }, { status: 400 });
  }

  try {
    const db = await getDb();

    const rows = await db.query(
      `SELECT status, confirmed_at, expires_at FROM payment_intents WHERE memo = ? LIMIT 1`,
      [memo],
    );

    if (!rows.length || !rows[0].rows.length) {
      return NextResponse.json({ status: "not_found" }, { status: 404 });
    }

    const [status, confirmedAt, expiresAt] = rows[0].rows[0] as [string, string | null, string];

    // Map DB status to frontend-friendly status
    let frontendStatus: string;
    if (status === "confirmed") {
      frontendStatus = "confirmed";
    } else if (status === "awaiting_payment") {
      // Check if expired
      if (new Date(expiresAt).getTime() < Date.now()) {
        frontendStatus = "expired";
      } else {
        frontendStatus = "awaiting_payment";
      }
    } else {
      frontendStatus = status;
    }

    return NextResponse.json(
      {
        status: frontendStatus,
        confirmedAt: confirmedAt ?? undefined,
      },
      {
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  } catch (err) {
    console.error("[payment-status] Error:", err);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
