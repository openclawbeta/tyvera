/**
 * /api/subnets/history
 *
 * Daily per-netuid history from the subnet_history table populated by
 * the sync-chain cron. Used by the subnet detail charts.
 *
 * GET ?netuid=N&range=7d|14d|30d|90d
 */

import { NextRequest } from "next/server";
import {
  DATA_SOURCES,
  apiResponse,
  apiErrorResponse,
} from "@/lib/data-source-policy";
import { isAllowedInternalOrigin } from "@/lib/api/internal-origin";
import { getSubnetHistory } from "@/lib/db/subnet-history";

const RANGES: Record<string, number> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "90d": 90,
};

export async function GET(request: NextRequest) {
  if (!isAllowedInternalOrigin(request)) {
    return apiErrorResponse("Internal endpoint", 403);
  }

  const netuidParam = request.nextUrl.searchParams.get("netuid");
  const rangeParam = request.nextUrl.searchParams.get("range") ?? "14d";
  const days = RANGES[rangeParam] ?? 14;
  const netuid = netuidParam != null ? Number(netuidParam) : NaN;

  if (!Number.isFinite(netuid) || netuid < 0) {
    return apiErrorResponse("Valid netuid required", 400);
  }

  try {
    const rows = await getSubnetHistory(netuid, days);

    const yieldSeries = rows.map((r) => ({ label: r.snapshot_date, value: r.yield_pct }));
    const liquiditySeries = rows.map((r) => ({ label: r.snapshot_date, value: r.tao_in }));
    const emissionSeries = rows.map((r) => ({ label: r.snapshot_date, value: r.emission_per_day }));

    return apiResponse(
      {
        netuid,
        range: rangeParam,
        count: rows.length,
        series: {
          yield: yieldSeries,
          liquidity: liquiditySeries,
          emission: emissionSeries,
        },
      },
      {
        source: DATA_SOURCES.CHAIN_LIVE,
        fetchedAt: new Date().toISOString(),
        note:
          rows.length === 0
            ? "No history yet — the cron writes one row per UTC day."
            : `${rows.length} daily rows`,
      },
    );
  } catch (err) {
    console.error("[subnets/history] failed:", err);
    return apiErrorResponse("Failed to read subnet history", 500);
  }
}
