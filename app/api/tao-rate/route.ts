import { NextResponse } from "next/server";

/* ─────────────────────────────────────────────────────────────────── */
/* In-memory cache (5-minute TTL)                                       */
/* ─────────────────────────────────────────────────────────────────── */

interface CachedRate {
  taoUsd: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  blockHeight: number | null;
  fetchedAt: string;
  source: "coingecko" | "taostats" | "cache";
}

let cache: CachedRate | null = null;
let cacheTimestamp = 0;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

/* ─────────────────────────────────────────────────────────────────── */
/* Source 1: CoinGecko (primary — no API key required)                  */
/* ─────────────────────────────────────────────────────────────────── */

async function fetchFromCoinGecko(): Promise<CachedRate | null> {
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
    if (typeof rate !== "number" || rate <= 0) {
      throw new Error("Invalid rate from CoinGecko");
    }

    return {
      taoUsd: rate,
      change24h: data?.bittensor?.usd_24h_change ?? 0,
      marketCap: data?.bittensor?.usd_market_cap ?? 0,
      volume24h: data?.bittensor?.usd_24h_vol ?? 0,
      blockHeight: null, // CoinGecko doesn't provide block height
      fetchedAt: new Date().toISOString(),
      source: "coingecko",
    };
  } catch (err) {
    console.error("[tao-rate] CoinGecko fetch failed:", err);
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/* Source 2: TaoStats (fallback — requires TAOSTATS_API_KEY)            */
/* ─────────────────────────────────────────────────────────────────── */

async function fetchFromTaoStats(): Promise<CachedRate | null> {
  const apiKey = process.env.TAOSTATS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      "https://api.taostats.io/api/price/latest/v1?asset=tao&currency=usd",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "User-Agent": "tao-navigator/3.0",
        },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!res.ok) throw new Error(`TaoStats returned ${res.status}`);

    const body = await res.json();

    // TaoStats price response formats vary — handle both array and object
    const row = Array.isArray(body) ? body[0] : (body?.data?.[0] ?? body);
    const price = Number(row?.close ?? row?.price ?? row?.usd ?? 0);

    if (price <= 0) throw new Error("Invalid price from TaoStats");

    return {
      taoUsd: price,
      change24h: Number(row?.percent_change_24h ?? row?.change_24h ?? 0),
      marketCap: Number(row?.market_cap ?? 0),
      volume24h: Number(row?.volume_24h ?? row?.volume ?? 0),
      blockHeight: Number(row?.block_number ?? row?.block_height ?? 0) || null,
      fetchedAt: new Date().toISOString(),
      source: "taostats",
    };
  } catch (err) {
    console.error("[tao-rate] TaoStats fetch failed:", err);
    return null;
  }
}

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
        blockHeight: cache.blockHeight,
        fetchedAt: cache.fetchedAt,
        source: cache.source,
        fallback: false,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      },
    );
  }

  // Try CoinGecko first, then TaoStats
  let result = await fetchFromCoinGecko();
  if (!result) {
    result = await fetchFromTaoStats();
  }

  if (result) {
    cache = result;
    cacheTimestamp = now;

    return NextResponse.json(
      {
        taoUsd: result.taoUsd,
        change24h: result.change24h,
        marketCap: result.marketCap,
        volume24h: result.volume24h,
        blockHeight: result.blockHeight,
        fetchedAt: result.fetchedAt,
        source: result.source,
        fallback: false,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      },
    );
  }

  // Both sources failed — return stale cache if available
  if (cache) {
    return NextResponse.json(
      {
        taoUsd: cache.taoUsd,
        change24h: cache.change24h,
        marketCap: cache.marketCap,
        volume24h: cache.volume24h,
        fetchedAt: cache.fetchedAt,
        source: "cache",
        fallback: true,
        stale: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      },
    );
  }

  // No data at all — return 503
  return NextResponse.json(
    {
      error: "Unable to fetch TAO price from any source",
      fallback: true,
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-cache",
        "Retry-After": "60",
      },
    },
  );
}
