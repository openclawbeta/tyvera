import { NextResponse } from "next/server";

/* ─────────────────────────────────────────────────────────────────── */
/* In-memory cache (5-minute TTL)                                       */
/* ─────────────────────────────────────────────────────────────────── */

interface CachedRate {
  taoUsd: number;
  fetchedAt: string;
}

let cache: CachedRate | null = null;
let cacheTimestamp = 0;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

const FALLBACK_RATE = 600;

/* ─────────────────────────────────────────────────────────────────── */
/* Route handler                                                        */
/* ─────────────────────────────────────────────────────────────────── */

export async function GET() {
  const now = Date.now();

  // Return cached value if fresh
  if (cache && now - cacheTimestamp < TTL_MS) {
    return NextResponse.json(
      { taoUsd: cache.taoUsd, fetchedAt: cache.fetchedAt, fallback: false },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      },
    );
  }

  // Fetch fresh rate
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bittensor&vs_currencies=usd",
      { signal: AbortSignal.timeout(5000) },
    );

    if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`);

    const data = (await res.json()) as { bittensor?: { usd?: number } };
    const rate = data?.bittensor?.usd;

    if (typeof rate !== "number" || rate <= 0) {
      throw new Error("Invalid rate from CoinGecko");
    }

    cache = { taoUsd: rate, fetchedAt: new Date().toISOString() };
    cacheTimestamp = now;

    return NextResponse.json(
      { taoUsd: rate, fetchedAt: cache.fetchedAt, fallback: false },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      },
    );
  } catch {
    // Return cached value if available, otherwise fallback
    if (cache) {
      return NextResponse.json(
        { taoUsd: cache.taoUsd, fetchedAt: cache.fetchedAt, fallback: false },
        {
          headers: {
            "Cache-Control": "public, max-age=60, s-maxage=60",
          },
        },
      );
    }

    return NextResponse.json(
      { taoUsd: FALLBACK_RATE, fetchedAt: null, fallback: true },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      },
    );
  }
}
