/**
 * app/api/tao-rate/route.ts
 *
 * TAO/USD price endpoint with multi-source fallback.
 *
 * Priority:
 *   1. CoinGecko (free, no key required)            → T1
 *   2. CoinMarketCap (free tier, requires CMC_API_KEY) → T1
 *   3. Stale in-memory cache (if any prior fetch)    → T3
 *   4. Hard-coded fallback constants                 → T4
 *
 * In-memory cache TTL: 5 minutes.
 */

import { NextResponse } from "next/server";
import { TAO_RATE_CACHE_TTL_MS } from "@/lib/config";
import {
  DATA_SOURCES,
  apiResponse,
  type DataSourceId,
} from "@/lib/data-source-policy";

/* ─────────────────────────────────────────────────────────────────── */
/* In-memory cache (5-minute TTL)                                       */
/* ─────────────────────────────────────────────────────────────────── */

interface CachedRate {
  taoUsd: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  fetchedAt: string;
  source: DataSourceId;
}

let cache: CachedRate | null = null;
let cacheTimestamp = 0;
const TTL_MS = TAO_RATE_CACHE_TTL_MS;

const FALLBACK_RATE = 600;
const FALLBACK_CHANGE = 0;
const FALLBACK_MARKET_CAP = 12_600_000_000; // 600 * 21M
const FALLBACK_VOLUME = 305_520_000;

/* ─────────────────────────────────────────────────────────────────── */
/* Source 1: CoinGecko                                                  */
/* ─────────────────────────────────────────────────────────────────── */

async function fetchCoinGecko(): Promise<CachedRate | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bittensor&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true",
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

    const data = (await res.json()) as {
      bittensor?: {
        usd?: number;
        usd_24h_change?: number;
        usd_market_cap?: number;
        usd_24h_vol?: number;
      };
    };
    const rate = data?.bittensor?.usd;
    if (typeof rate !== "number" || rate <= 0) return null;

    return {
      taoUsd: rate,
      change24h: data?.bittensor?.usd_24h_change ?? 0,
      marketCap: data?.bittensor?.usd_market_cap ?? FALLBACK_MARKET_CAP,
      volume24h: data?.bittensor?.usd_24h_vol ?? FALLBACK_VOLUME,
      fetchedAt: new Date().toISOString(),
      source: DATA_SOURCES.COINGECKO_LIVE,
    };
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/* Source 2: CoinMarketCap                                              */
/* ─────────────────────────────────────────────────────────────────── */

async function fetchCoinMarketCap(): Promise<CachedRate | null> {
  const apiKey = process.env.CMC_API_KEY ?? "";
  if (!apiKey) return null;

  try {
    const res = await fetch(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?slug=bittensor&convert=USD",
      {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) throw new Error(`CMC ${res.status}`);

    const body = (await res.json()) as {
      data?: Record<
        string,
        {
          quote?: {
            USD?: {
              price?: number;
              percent_change_24h?: number;
              market_cap?: number;
              volume_24h?: number;
            };
          };
        }
      >;
    };

    const entries = Object.values(body?.data ?? {});
    const usd = entries[0]?.quote?.USD;
    if (!usd || typeof usd.price !== "number" || usd.price <= 0) return null;

    return {
      taoUsd: usd.price,
      change24h: usd.percent_change_24h ?? 0,
      marketCap: usd.market_cap ?? FALLBACK_MARKET_CAP,
      volume24h: usd.volume_24h ?? FALLBACK_VOLUME,
      fetchedAt: new Date().toISOString(),
      source: DATA_SOURCES.COINMARKETCAP_LIVE,
    };
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/* Route handler                                                        */
/* ─────────────────────────────────────────────────────────────────── */

export async function GET() {
  const now = Date.now();

  // ── Tier 2: warm in-memory cache ──────────────────────────────────
  if (cache && now - cacheTimestamp < TTL_MS) {
    return apiResponse(
      {
        taoUsd: cache.taoUsd,
        change24h: cache.change24h,
        marketCap: cache.marketCap,
        volume24h: cache.volume24h,
      },
      { source: DATA_SOURCES.RATE_CACHE, fetchedAt: cache.fetchedAt },
    );
  }

  // ── Tier 1: fresh fetch ───────────────────────────────────────────
  const fresh = (await fetchCoinGecko()) ?? (await fetchCoinMarketCap());

  if (fresh) {
    cache = fresh;
    cacheTimestamp = now;
    return apiResponse(
      {
        taoUsd: fresh.taoUsd,
        change24h: fresh.change24h,
        marketCap: fresh.marketCap,
        volume24h: fresh.volume24h,
      },
      { source: fresh.source, fetchedAt: fresh.fetchedAt },
    );
  }

  // ── Tier 3: stale cache ───────────────────────────────────────────
  if (cache) {
    return apiResponse(
      {
        taoUsd: cache.taoUsd,
        change24h: cache.change24h,
        marketCap: cache.marketCap,
        volume24h: cache.volume24h,
      },
      {
        source: DATA_SOURCES.RATE_STALE,
        fetchedAt: cache.fetchedAt,
        stale: true,
        snapshotAgeMs: now - cacheTimestamp,
      },
    );
  }

  // ── Tier 4: hard-coded fallback ───────────────────────────────────
  return apiResponse(
    {
      taoUsd: FALLBACK_RATE,
      change24h: FALLBACK_CHANGE,
      marketCap: FALLBACK_MARKET_CAP,
      volume24h: FALLBACK_VOLUME,
    },
    {
      source: DATA_SOURCES.FALLBACK_CONSTANT,
      fetchedAt: new Date(0).toISOString(),
      note: "All live sources unavailable — using hard-coded fallback values",
    },
  );
}
