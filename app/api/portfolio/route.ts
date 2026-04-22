/**
 * app/api/portfolio/route.ts
 *
 * Real on-chain stake positions for a wallet address.
 *
 * Data source: live chain query only (T1).
 * Falls back to empty portfolio on error (no synthetic fill).
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchWalletStakes } from "@/lib/chain/wallet-stakes";
import {
  DATA_SOURCES,
  apiResponse,
  apiErrorResponse,
} from "@/lib/data-source-policy";
import { recordPortfolioSnapshot } from "@/lib/db/portfolio-snapshots";
import { getLatestTaoPrice } from "@/lib/chain/price-engine";
import { requireWalletAuth } from "@/lib/api/wallet-auth";

export async function GET(request: NextRequest) {
  // Wallet-auth required: portfolio data is sensitive (reveals a wallet's
  // staked positions). Callers may only read their OWN portfolio.
  const auth = await requireWalletAuth(request);
  if (!auth.verified || !auth.address) {
    return auth.errorResponse ?? NextResponse.json(
      { error: "Wallet authentication required" },
      { status: 401 },
    );
  }

  // Canonical source of truth is the authenticated address. We still
  // accept ?address= for API ergonomics, but it MUST match the signed
  // wallet — otherwise this would be an IDOR.
  const queried = request.nextUrl.searchParams.get("address");
  if (queried && queried !== auth.address) {
    return NextResponse.json(
      { error: "address must match authenticated wallet" },
      { status: 403 },
    );
  }
  const address = auth.address;

  if (!address.startsWith("5") || address.length < 46) {
    return apiErrorResponse("Invalid SS58 address", 400);
  }

  try {
    const result = await fetchWalletStakes(address);

    // Fire-and-forget daily snapshot. Deduped on (address, UTC day).
    // Protects the chart from gaps even when the user visits only once per day.
    const taoPoint = getLatestTaoPrice();
    const taoUsd = taoPoint?.taoUsd ?? 0;
    void recordPortfolioSnapshot({
      walletAddress: address,
      totalStakedTao: result.stats.totalStakedTao,
      totalValueUsd: result.stats.totalValueUsd,
      weightedYield: result.stats.weightedYield,
      positionCount: result.stats.positionCount,
      taoPriceUsd: taoUsd,
    });

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
