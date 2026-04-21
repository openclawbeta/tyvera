/**
 * /api/tax-report
 *
 * Wallet-scoped tax event feed sourced from the persisted chain_events table.
 * Requires wallet-verified auth. Tier-gated (data_export) for parity with
 * /api/export. Emits pre-aggregated summary alongside the event list so the
 * client doesn't need to re-aggregate.
 *
 * GET ?year=2026
 */

import { NextRequest } from "next/server";
import {
  DATA_SOURCES,
  apiResponse,
  apiErrorResponse,
} from "@/lib/data-source-policy";
import { requireWalletAuth } from "@/lib/api/wallet-auth";
import { resolveWalletTier } from "@/lib/api/require-entitlement";
import { tierHasFeature } from "@/lib/types/tiers";
import { generateTaxReport, getTaxSummary } from "@/lib/api/tax-report";

export async function GET(request: NextRequest) {
  const auth = await requireWalletAuth(request);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  const tier = await resolveWalletTier(address);
  if (!tierHasFeature(tier, "data_export")) {
    return apiErrorResponse(
      "Tax export requires Analyst tier or above. Upgrade to unlock.",
      403,
    );
  }

  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : new Date().getUTCFullYear();
  if (!Number.isFinite(year) || year < 2020 || year > 2100) {
    return apiErrorResponse("Invalid year parameter", 400);
  }

  try {
    const events = await generateTaxReport(address, year);
    const summary = getTaxSummary(events);

    return apiResponse(
      { events, summary, year },
      {
        source: DATA_SOURCES.CHAIN_LIVE,
        fetchedAt: new Date().toISOString(),
        note:
          events.length === 0
            ? "No indexed events for this wallet in the selected year yet. The chain scanner builds history over time."
            : `${events.length} taxable events for ${year}`,
      },
    );
  } catch (err) {
    console.error("[tax-report] generation failed:", err);
    return apiErrorResponse("Failed to generate tax report", 500);
  }
}
