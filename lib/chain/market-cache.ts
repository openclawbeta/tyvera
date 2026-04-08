/**
 * lib/chain/market-cache.ts
 *
 * In-memory cache for per-subnet market data (alpha price, volume, % changes).
 *
 * This data comes from TaoStats and is used to ENRICH chain-live responses.
 * Without it, chain-live responses still work — they just lack market fields.
 *
 * Populated by: /api/cron/sync-chain (after chain sync, as a best-effort enrichment)
 * Consumed by: /api/subnets route (merges into chain-live responses)
 */

export interface SubnetMarketData {
  alphaPrice?: number;
  marketCap?: number;
  volume24h?: number;
  volumeCapRatio?: number;
  change1h?: number;
  change24h?: number;
  change1w?: number;
  change1m?: number;
  flow24h?: number;
  flow1w?: number;
  flow1m?: number;
  dailyChainBuys?: number;
  incentivePct?: number;
}

// netuid → market data
let marketCache: Map<number, SubnetMarketData> = new Map();
let marketCacheTimestamp = 0;
const MARKET_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Store market data for all subnets (called after TaoStats fetch).
 */
export function setMarketCache(data: Map<number, SubnetMarketData>): void {
  marketCache = data;
  marketCacheTimestamp = Date.now();
}

/**
 * Get market data for a specific subnet.
 */
export function getMarketData(netuid: number): SubnetMarketData | undefined {
  return marketCache.get(netuid);
}

/**
 * Check if market cache is still fresh.
 */
export function isMarketCacheFresh(): boolean {
  return Date.now() - marketCacheTimestamp < MARKET_CACHE_TTL_MS;
}

/**
 * Get the full market cache for bulk merge.
 */
export function getMarketCacheAll(): Map<number, SubnetMarketData> {
  return marketCache;
}

/**
 * Fetch market data from TaoStats and populate the cache.
 * Returns true on success, false on failure.
 * Designed to be called as best-effort (non-blocking) after chain sync.
 */
export async function refreshMarketCache(): Promise<boolean> {
  const apiKey = process.env.TAOSTATS_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch(
      "https://api.taostats.io/api/dtao/subnet/latest/v1?limit=256",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "User-Agent": "tao-navigator/3.0",
        },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!res.ok) return false;

    const body = await res.json();
    const rows: Record<string, unknown>[] = Array.isArray(body)
      ? body
      : (body.data ?? []);

    const newCache = new Map<number, SubnetMarketData>();

    for (const s of rows) {
      const netuid = Number(s.netuid ?? 0);
      if (netuid === 0) continue;

      const alphaPrice = Number(s.alpha_price ?? s.price ?? 0) || undefined;
      const marketCap = Number(s.market_cap ?? s.alpha_market_cap ?? 0) || undefined;
      const volume24h = Number(s.volume_24h ?? s.alpha_volume_24h ?? 0) || undefined;

      newCache.set(netuid, {
        alphaPrice,
        marketCap,
        volume24h,
        volumeCapRatio: (marketCap && volume24h) ? +((volume24h / marketCap) * 100).toFixed(1) : undefined,
        change1h: Number(s.percent_change_1h ?? s.price_change_1h ?? 0) || undefined,
        change24h: Number(s.percent_change_24h ?? s.price_change_24h ?? 0) || undefined,
        change1w: Number(s.percent_change_7d ?? s.price_change_7d ?? 0) || undefined,
        change1m: Number(s.percent_change_30d ?? s.price_change_30d ?? 0) || undefined,
        flow24h: Number(s.net_flow_24h ?? 0) || undefined,
        flow1w: Number(s.net_flow_7d ?? 0) || undefined,
        flow1m: Number(s.net_flow_30d ?? 0) || undefined,
        dailyChainBuys: Number(s.daily_chain_buys ?? 0) || undefined,
        incentivePct: Number(s.incentive ?? 0) || undefined,
      });
    }

    setMarketCache(newCache);
    return true;
  } catch {
    return false;
  }
}
