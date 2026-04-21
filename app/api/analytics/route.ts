/**
 * POST /api/analytics
 *
 * Receives client-side analytics events. Stores in daily_usage
 * table for aggregate tracking. No PII stored.
 *
 * In production, this could forward to a proper analytics service
 * (PostHog, Amplitude, etc.). For now it logs and counts.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/index";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, path, timestamp, properties } = body;

    if (!event || typeof event !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Log for observability
    console.log("[analytics]", event, path ?? "", JSON.stringify(properties ?? {}));

    // Store aggregate event counts in a lightweight analytics_events table
    // For now, use the existing daily_usage pattern
    const db = await getDb();
    const dateBucket = (timestamp ?? new Date().toISOString()).slice(0, 10);

    await db.execute(
      `INSERT INTO daily_usage (wallet_address, counter_type, date_bucket, count)
       VALUES ('__analytics__', ?, ?, 1)
       ON CONFLICT(wallet_address, counter_type, date_bucket)
       DO UPDATE SET count = count + 1`,
      [`event:${event}`, dateBucket],
    );

    // Track page-specific counts
    if (path && event === "page_view") {
      await db.execute(
        `INSERT INTO daily_usage (wallet_address, counter_type, date_bucket, count)
         VALUES ('__analytics__', ?, ?, 1)
         ON CONFLICT(wallet_address, counter_type, date_bucket)
         DO UPDATE SET count = count + 1`,
        [`pageview:${path}`, dateBucket],
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Analytics should never error to the client
    return NextResponse.json({ ok: true });
  }
}
