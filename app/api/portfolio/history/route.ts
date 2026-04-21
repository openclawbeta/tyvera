/**
 * /api/portfolio/history
 *
 * Returns the daily portfolio snapshot series for a wallet.
 * Data is written by /api/portfolio each time the user loads the
 * dashboard (deduped on UTC day). Cold wallets or wallets that have
 * never visited yield an empty series.
 *
 * GET ?address=5...&range=7d|14d|30d|90d
 */

import { NextRequest } from "next/server";
import {
  DATA_SOURCES,
  apiResponse,
  apiErrorResponse,
} from "@/lib/data-source-policy";
import { getPortfolioSnapshots } from "@/lib/db/portfolio-snapshots";

const RANGES: Record<string, number> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "90d": 90,
};

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  const rangeParam = request.nextUrl.searchParams.get("range") ?? "30d";
  const days = RANGES[rangeParam] ?? 30;

  if (!address) {
    return apiResponse(
      { series: { value: [], earnings: [], yield: [] } },
      {
        source: DATA_SOURCES.CHAIN_LIVE,
        fetchedAt: new Date().toISOString(),
        note: "No wallet address provided — empty history",
      },
    );
  }
  if (!address.startsWith("5") || address.length < 46) {
    return apiErrorResponse("Invalid SS58 address", 400);
  }

  try {
    const snapshots = await getPortfolioSnapshots(address, days);

    const value = snapshots.map((s) => ({
      label: s.snapshot_date,
      value: +s.total_value_usd.toFixed(2),
    }));
    const yieldSeries = snapshots.map((s) => ({
      label: s.snapshot_date,
      value: +s.weighted_yield.toFixed(2),
    }));

    // Derive a simple daily earnings proxy: value * weighted_yield / 365
    const earnings = snapshots.map((s) => {
      const daily = (s.total_value_usd * (s.weighted_yield / 100)) / 365;
      return { label: s.snapshot_date, value: +daily.toFixed(2) };
    });

    return apiResponse(
      { series: { value, earnings, yield: yieldSeries }, count: snapshots.length },
      {
        source: DATA_SOURCES.CHAIN_LIVE,
        fetchedAt: new Date().toISOString(),
        note:
          snapshots.length === 0
            ? "No snapshots yet — load your portfolio to start building history."
            : `${snapshots.length} daily snapshots`,
      },
    );
  } catch (err) {
    console.error("[portfolio/history] failed:", err);
    return apiResponse(
      { series: { value: [], earnings: [], yield: [] } },
      {
        source: DATA_SOURCES.CHAIN_LIVE,
        fetchedAt: new Date().toISOString(),
        fallbackUsed: true,
        note: "Snapshot read failed — returning empty series",
      },
    );
  }
}
