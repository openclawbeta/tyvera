/**
 * app/api/portfolio/route.ts
 *
 * Real on-chain stake positions for a wallet address.
 *
 * Data source: live chain query only (T1).
 * Falls back to empty portfolio on error (no synthetic fill).
 */

import { NextRequest } from "next/server";
import { fetchWalletStakes } from "@/lib/chain/wallet-stakes";
import {
  DATA_SOURCES,
  apiResponse,
  apiErrorResponse,
} from "@/lib/data-source-policy";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return apiResponse(
      {
        positions: [],
        stats: { totalStakedTao: 0, totalValueUsd: 0, positionCount: 0 },
      },
      {
        source: DATA_SOURCES.CHAIN_LIVE,
        fetchedAt: new Date().toISOString(),
        note: "No wallet address provided — showing empty portfolio",
      },
    );
  }

  if (!address.startsWith("5") || address.length < 46) {
    return apiErrorResponse("Invalid SS58 address", 400);
  }

  try {
    const result = await fetchWalletStakes(address);

    return apiResponse(
      { ...result },
      {
        source: DATA_SOURCES.CHAIN_LIVE,
        fetchedAt: new Date().toISOString(),
      },
    );
  } catch (err) {
    console.error("[portfolio] Error fetching wallet stakes:", err);
    return apiResponse(
      {
        positions: [],
        stats: { totalStakedTao: 0, totalValueUsd: 0, positionCount: 0 },
        error: "Failed to fetch portfolio data",
      },
      {
        source: DATA_SOURCES.CHAIN_LIVE,
        fetchedAt: new Date().toISOString(),
        note: "Chain query failed — returning empty portfolio",
      },
    );
  }
}
