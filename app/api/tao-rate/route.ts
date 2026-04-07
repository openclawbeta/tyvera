import { NextResponse } from "next/server";

/* ─────────────────────────────────────────────────────────────────── */
/* In-memory cache (5-minute TTL)                                       */
/* ─────────────────────────────────────────────────────────────────── */

interface CachedRate {
  taoUsd: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  fetchedAt: string;
}

let cache: CachedRate | null = null;
let cacheTimestamp = 0;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

const FALLBACK_RATE = 600;
const FALLBACK_CHANGE = 0;
const FALLBACK_MARKET_CAP = 12_600_000_000; // 600 * 21M
const FALLBACK_VOLUME = 305_520_000;

/* ─────────────────────────────────────────────────────────────────── */
/* Route handler                                                        */
/* ─────────────────────────────────────────────────────────────────── */

export async function GET() {
  const now = Date.now();

  // Return cached value if fresh
  if (cache && now - cacheTimestamp < TTL_MS) {
    return NextResponse.json(
      {
        taoUsd: cache.taoUsd,
        change24h: cache.change24h,
        marketCap: cache.marketCap,
        volume24h: cache.volume24h,
        fetchedAt: cache.fetchedAt,
        fallback: false,
      },
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
      "https://api.coingecko.com/api/v3/simple/price?ids=bittensor&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true",
      { signal: AbortSignal.timeout(5000) },
    );

    if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`);

    const data = (await res.json()) as {
      bittensor?: {
        usd?: number;
        usd_24h_change?: number;
        usd_market_cap?: number;
        usd_24h_vol?: number;
      };
    };
    const rate = data?.bittensor?.usd;
    const change = data?.bittensor?.usd_24h_change ?? 0;
    const marketCap = data?.bittensor?.usd_market_cap ?? FALLBACK_MARKET_CAP;
    const volume = data?.bittensor?.usd_24h_vol ?? FALLBACK_VOLUME;

    if (typeof rate !== "number" || rate <= 0) {
      throw new Error("Invalid rate from CoinGecko");
    }

    cache = {
      taoUsd: rate,
      change24h: change,
      marketCap,
      volume24h: volume,
      fetchedAt: new Date().toISOString(),
    };
    cacheTimestamp = now;

    return NextResponse.json(
      {
        taoUsd: rate,
        change24h: change,
        marketCap,
        volume24h: volume,
        fetchedAt: cache.fetchedAt,
        fallback: false,
      },
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
        {
          taoUsd: cache.taoUsd,
          change24h: cache.change24h,
          marketCap: cache.marketCap,
          volume24h: cache.volume24h,
          fetchedAt: cache.fetchedAt,
          fallback: false,
        },
        {
          headers: {
            "Cache-Control": "public, max-age=60, s-maxage=60",
          },
        },
      );
    }

    return NextResponse.json(
      {
        taoUsd: FALLBACK_RATE,
        change24h: FALLBACK_CHANGE,
        marketCap: FALLBACK_MARKET_CAP,
        volume24h: FALLBACK_VOLUME,
        fetchedAt: null,
        fallback: true,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      },
    );
  }
}
