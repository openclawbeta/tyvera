/**
 * lib/chain/market-cache.ts
 *
 * In-memory market-data enrichment cache for subnet alpha tokens.
 *
 * Data source: ON-CHAIN ONLY
 *   - TAO/USD price from the price-engine rolling buffer
 *   - Alpha token prices derived from on-chain pool ratios
 *     (SubnetAlphaIn / SubnetAlphaOut)
 *
 * No external API dependencies (no CMC, no TaoStats).
 *
 * Populated by calling refreshMarketCache() from the cron sync job.
 * Individual subnet market data is merged into chain-live responses
 * via getMarketData(netuid).
 *
 * TTL: 10 minutes. If refresh fails the stale cache is served
 * until the next successful refresh.
 */

import { getLatestTaoPrice, getLatestPriceSnapshot, derivePriceChanges } from "./price-engine";
import { MARKET_DATA_CACHE_TTL_MS } from "@/lib/config";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SubnetMarketData {
  alphaPrice: number;
  marketCap: number;
  volume24h: number;
  change1h?: number;
  change24h?: number;
  change1w?: number;
  change1m?: number;
  flow24h?: number;
  flow1w?: number;
  flow1m?: number;
}

// ── Cache state ──────────────────────────────────────────────────────────────

const cache = new Map<number, SubnetMarketData>();
let lastRefresh = 0;
const TTL_MS = MARKET_DATA_CACHE_TTL_MS;

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute alpha token prices from on-chain pool ratios and the
 * TAO/USD price from the price-engine buffer.
 *
 * This is the ONLY source of alpha pricing — no external APIs.
 */
export function computeAlphaPrices(
  chainSubnets: Array<{ netuid: number; tao_in?: number; alpha_in?: number; liquidity?: number }>,
  taoUsd: number,
): Map<number, SubnetMarketData> {
  const result = new Map<number, SubnetMarketData>();
  const priceChanges = derivePriceChanges();

  for (const s of chainSubnets) {
    const taoIn = Number(s.tao_in ?? s.liquidity ?? 0);
    const alphaIn = Number(s.alpha_in ?? 0);
    if (taoIn <= 0 || alphaIn <= 0) continue;

    const alphaPriceTao = taoIn / alphaIn;
    const alphaPriceUsd = alphaPriceTao * taoUsd;

    result.set(s.netuid, {
      alphaPrice: +alphaPriceTao.toFixed(6),
      marketCap: +(alphaPriceUsd * alphaIn).toFixed(2),
      volume24h: 0, // No volume data from chain — would need historical tracking
      // Use TAO-level price changes as proxy for alpha changes
      // (individual alpha tracking requires historical snapshots)
      change1h: priceChanges.change1h || undefined,
      change24h: priceChanges.change24h || undefined,
      change1w: priceChanges.change7d || undefined,
      change1m: priceChanges.change30d || undefined,
    });
  }

  return result;
}

/**
 * Refresh the market cache from on-chain data only.
 *
 * Strategy:
 *   1. Get TAO/USD from price-engine rolling buffer
 *   2. Compute alpha prices from chain pool ratios
 *
 * If chainSubnets aren't provided, try the latest price-engine snapshot.
 */
export async function refreshMarketCache(
  chainSubnets?: Array<{ netuid: number; tao_in?: number; alpha_in?: number; liquidity?: number }>,
): Promise<boolean> {
  const taoPrice = getLatestTaoPrice();

  if (!taoPrice || taoPrice.taoUsd <= 0) {
    console.log("[market-cache] No TAO/USD price available — awaiting pricing source");
    return false;
  }

  const taoUsd = taoPrice.taoUsd;

  // Strategy A: Use provided chain subnet data + price-engine TAO/USD
  if (chainSubnets && chainSubnets.length > 0) {
    const alphaPrices = computeAlphaPrices(chainSubnets, taoUsd);
    for (const [netuid, data] of alphaPrices) {
      cache.set(netuid, data);
    }
    lastRefresh = Date.now();
    console.log(
      `[market-cache] Refreshed ${alphaPrices.size} subnets from chain pools + ` +
      `TAO=$${taoUsd} (source: ${taoPrice.source})`,
    );
    return true;
  }

  // Strategy B: Use latest price-engine snapshot (if available)
  const snapshot = getLatestPriceSnapshot();
  if (snapshot && snapshot.alphaTokens.length > 0) {
    for (const alpha of snapshot.alphaTokens) {
      cache.set(alpha.netuid, {
        alphaPrice: alpha.alphaPriceTao,
        marketCap: alpha.marketCapUsd,
        volume24h: 0,
      });
    }
    lastRefresh = Date.now();
    console.log(
      `[market-cache] Refreshed ${snapshot.alphaTokens.length} subnets from price-engine snapshot`,
    );
    return true;
  }

  console.log("[market-cache] No chain data available for alpha price computation");
  return false;
}

export function getMarketData(netuid: number): SubnetMarketData | undefined {
  return cache.get(netuid);
}

export function getMarketCacheAll(): Map<number, SubnetMarketData> {
  return cache;
}

export function isMarketCacheFresh(): boolean {
  return cache.size > 0 && Date.now() - lastRefresh < TTL_MS;
}

export function setMarketCache(netuid: number, data: SubnetMarketData): void {
  cache.set(netuid, data);
  lastRefresh = Date.now();
}
