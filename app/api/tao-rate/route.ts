/**
 * app/api/tao-rate/route.ts
 *
 * TAO/USD price endpoint — chain-only data source.
 *
 * Priority:
 *   1. Price-engine rolling buffer (warm cache)      → T2
 *   2. Price-engine live sync from chain             → T1
 *   3. Hard-coded fallback constants                 → T4
 *
 * No external API dependencies (no CoinGecko, no CMC).
 * TAO/USD is seeded via the price-engine and updated by the cron job.
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

  // ── Tier 1/2: Price-engine buffer ─────────────────────────────────
  const latestPrice = getLatestTaoPrice();
  const priceChanges = derivePriceChanges();

  if (latestPrice.source !== "bootstrap") {
    // We have a real price from the engine
    const snapshot = {
      taoUsd: latestPrice.taoUsd,
      change24h: priceChanges.change24h,
      marketCap: +(latestPrice.taoUsd * 21_000_000).toFixed(0), // Approximate: price * max supply
      volume24h: 0, // No volume data from chain
      fetchedAt: latestPrice.timestamp,
      source: DATA_SOURCES.CHAIN_CACHE as DataSourceId,
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
      { source: DATA_SOURCES.CHAIN_CACHE, fetchedAt: snapshot.fetchedAt },
    );
  }

  // ── Tier 1: Try live chain sync ───────────────────────────────────
  try {
    const syncResult = await syncPricesFromChain();
    if (syncResult) {
      const updatedPrice = getLatestTaoPrice();
      const updatedChanges = derivePriceChanges();

      const fresh: CachedRate = {
        taoUsd: updatedPrice.taoUsd,
        change24h: updatedChanges.change24h,
        marketCap: +(updatedPrice.taoUsd * syncResult.network.totalIssuance).toFixed(0),
        volume24h: 0,
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
        { source: fresh.source, fetchedAt: fresh.fetchedAt },
      );
    }
  } catch (err) {
    console.error("[tao-rate] Chain sync failed:", err);
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
      note: "Price engine has no data — using hard-coded fallback. Seed via admin or wait for cron sync.",
    },
  );
}
