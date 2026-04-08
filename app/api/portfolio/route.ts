import { NextRequest, NextResponse } from "next/server";
import { fetchWalletStakes } from "@/lib/chain/wallet-stakes";

/* ─────────────────────────────────────────────────────────────────── */
/* GET /api/portfolio?address=5...                                       */
/*                                                                     */
/* Returns real on-chain stake positions for a wallet address.         */
/* Falls back gracefully to empty portfolio if chain query fails.      */
/* ─────────────────────────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      {
        positions: [],
        stats: { totalStakedTao: 0, totalValueUsd: 0, positionCount: 0 },
        source: "disconnected",
      },
      { status: 200 },
    );
  }

  // Validate SS58 format
  if (!address.startsWith("5") || address.length < 46) {
    return NextResponse.json({ error: "Invalid SS58 address" }, { status: 400 });
  }

  try {
    const result = await fetchWalletStakes(address);

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[portfolio] Error fetching wallet stakes:", err);
    return NextResponse.json(
      {
        positions: [],
        stats: { totalStakedTao: 0, totalValueUsd: 0, positionCount: 0 },
        source: "error",
        error: "Failed to fetch portfolio data",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }, // Don't 500 — frontend should show empty state
    );
  }
}
