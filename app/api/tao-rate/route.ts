/**
 * app/api/tao-rate/route.ts
 *
 * TAO/USD price endpoint.
 */

import { TAO_RATE_CACHE_TTL_MS } from "@/lib/config";
import {
  DATA_SOURCES,
  apiResponse,
  type DataSourceId,
} from "@/lib/data-source-policy";
import {
  getLatestTaoPrice,
  derivePriceChanges,
  syncPricesFromChain,
} from "@/lib/chain/price-engine";

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

export async function GET() {
  const now = Date.now();

  if (cache && now - cacheTimestamp < TTL_MS) {
    return apiResponse(
      {
        taoUsd: cache.taoUsd,
        change24h: cache.change24h,
        marketCap: cache.marketCap,
        volume24h: cache.volume24h,
      },
      {
        source: DATA_SOURCES.RATE_CACHE,
        fetchedAt: cache.fetchedAt,
        fallbackUsed: false,
      },
      {
        cacheControl: "public, max-age=300, s-maxage=300",
      },
    );
  }

  const latestPrice = getLatestTaoPrice();

  if (latestPrice) {
    const priceChanges = derivePriceChanges();
    const snapshot: CachedRate = {
      taoUsd: latestPrice.taoUsd,
      change24h: latestPrice.change24h ?? priceChanges.change24h,
      marketCap: latestPrice.marketCap ?? +(latestPrice.taoUsd * 21_000_000).toFixed(0),
      volume24h: latestPrice.volume24h ?? 0,
      fetchedAt: latestPrice.timestamp,
      source:
        latestPrice.source === "coingecko" || latestPrice.source === "coinmarketcap"
          ? DATA_SOURCES.CHAIN_LIVE
          : DATA_SOURCES.CHAIN_CACHE,
    };

    cache = snapshot;
    cacheTimestamp = now;

    return apiResponse(
      {
        taoUsd: snapshot.taoUsd,
        change24h: snapshot.change24h,
        marketCap: snapshot.marketCap,
        volume24h: snapshot.volume24h,
      },
      {
        source: snapshot.source,
        fetchedAt: snapshot.fetchedAt,
        fallbackUsed: false,
      },
      {
        cacheControl: "public, max-age=300, s-maxage=300",
      },
    );
  }

  try {
    const syncResult = await syncPricesFromChain();
    const updatedPrice = syncResult ? getLatestTaoPrice() : null;
    if (syncResult && updatedPrice) {
      const updatedChanges = derivePriceChanges();

      const fresh: CachedRate = {
        taoUsd: updatedPrice.taoUsd,
        change24h: updatedPrice.change24h ?? updatedChanges.change24h,
        marketCap: updatedPrice.marketCap ?? +(updatedPrice.taoUsd * syncResult.network.totalIssuance).toFixed(0),
        volume24h: updatedPrice.volume24h ?? 0,
        fetchedAt: updatedPrice.timestamp,
        source: DATA_SOURCES.CHAIN_LIVE,
      };

      cache = fresh;
      cacheTimestamp = now;

      return apiResponse(
        {
          taoUsd: fresh.taoUsd,
          change24h: fresh.change24h,
          marketCap: fresh.marketCap,
          volume24h: fresh.volume24h,
        },
        {
          source: fresh.source,
          fetchedAt: fresh.fetchedAt,
          fallbackUsed: false,
        },
        {
          cacheControl: "public, max-age=300, s-maxage=300",
        },
      );
    }
  } catch (err) {
    console.error("[tao-rate] Price sync failed:", err);
  }

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
        fallbackUsed: true,
        snapshotAgeMs: now - cacheTimestamp,
        note: `Using last known real price from ${cache.source}.`,
      },
      {
        cacheControl: "public, max-age=60, s-maxage=60",
      },
    );
  }

  return apiResponse(
    {
      taoUsd: null,
      change24h: null,
      marketCap: null,
      volume24h: null,
      awaiting: true,
    },
    {
      source: DATA_SOURCES.UNAVAILABLE,
      fetchedAt: null,
      fallbackUsed: true,
      awaiting: true,
      note: "Awaiting pricing source — no price data has been fetched yet",
    },
    {
      cacheControl: "public, max-age=60, s-maxage=60",
    },
  );
}
