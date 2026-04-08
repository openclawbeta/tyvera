/**
 * lib/chain/market-cache.ts
 *
 * In-memory market-data enrichment cache for subnet alpha tokens.
 *
 * Data source priority:
 *   1. CoinMarketCap (CMC_API_KEY) -- primary, free tier
 *   2. TaoStats dtao/subnet/latest/v1 -- secondary fallback
 *
 * Populated by calling refreshMarketCache() (typically from the chain
 * sync cron or on-demand when the cache is stale).  Individual subnet
 * market data is merged into chain-live responses via getMarketData(netuid).
 *
 * TTL: 10 minutes.  If both sources fail the stale cache is served
 * until the next successful refresh.
 */

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
const TTL_MS = 10 * 60 * 1000; // 10 minutes

// ── Source 1: CoinMarketCap ──────────────────────────────────────────────────

interface CmcTaoQuote {
  price: number;
  volume_24h: number;
  percent_change_1h: number;
  percent_change_24h: number;
  percent_change_7d: number;
  percent_change_30d: number;
  market_cap: number;
}

async function fetchCmcTaoQuote(): Promise<CmcTaoQuote | null> {
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
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;

    const body = (await res.json()) as {
      data?: Record<
        string,
        { quote?: { USD?: Record<string, number> } }
      >;
    };

    const entries = Object.values(body?.data ?? {});
    const usd = entries[0]?.quote?.USD;
    if (!usd || typeof usd.price !== "number" || usd.price <= 0) return null;

    return {
      price: usd.price,
      volume_24h: usd.volume_24h ?? 0,
      percent_change_1h: usd.percent_change_1h ?? 0,
      percent_change_24h: usd.percent_change_24h ?? 0,
      percent_change_7d: usd.percent_change_7d ?? 0,
      percent_change_30d: usd.percent_change_30d ?? 0,
      market_cap: usd.market_cap ?? 0,
    };
  } catch {
    return null;
  }
}

// ── Source 2: TaoStats (secondary) ───────────────────────────────────────────

interface TaoStatsSubnet {
  netuid: number;
  price?: number;
  alpha_price?: number;
  market_cap?: number;
  volume_24h?: number;
  price_change_1h?: number;
  price_change_24h?: number;
  price_change_7d?: number;
  price_change_30d?: number;
  tao_in_24h_change?: number;
  tao_in_7d_change?: number;
  tao_in_30d_change?: number;
}

async function fetchTaoStatsMarket(): Promise<Map<number, SubnetMarketData> | null> {
  const apiKey = process.env.TAOSTATS_API_KEY ?? "";
  if (!apiKey) return null;

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
    if (!res.ok) return null;

    const body = await res.json();
    const rows: TaoStatsSubnet[] = Array.isArray(body) ? body : (body.data ?? []);
    const result = new Map<number, SubnetMarketData>();

    for (const row of rows) {
      const netuid = Number(row.netuid);
      if (netuid === 0) continue;

      result.set(netuid, {
        alphaPrice: Number(row.alpha_price ?? row.price ?? 0),
        marketCap: Number(row.market_cap ?? 0),
        volume24h: Number(row.volume_24h ?? 0),
        change1h: row.price_change_1h != null ? Number(row.price_change_1h) : undefined,
        change24h: row.price_change_24h != null ? Number(row.price_change_24h) : undefined,
        change1w: row.price_change_7d != null ? Number(row.price_change_7d) : undefined,
        change1m: row.price_change_30d != null ? Number(row.price_change_30d) : undefined,
        flow24h: row.tao_in_24h_change != null ? Number(row.tao_in_24h_change) : undefined,
        flow1w: row.tao_in_7d_change != null ? Number(row.tao_in_7d_change) : undefined,
        flow1m: row.tao_in_30d_change != null ? Number(row.tao_in_30d_change) : undefined,
      });
    }

    return result.size > 0 ? result : null;
  } catch {
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function computeAlphaPrices(
  chainSubnets: Array<{ netuid: number; tao_in?: number; alpha_in?: number; liquidity?: number }>,
  taoUsd: number,
): Map<number, SubnetMarketData> {
  const result = new Map<number, SubnetMarketData>();

  for (const s of chainSubnets) {
    const taoIn = Number(s.tao_in ?? s.liquidity ?? 0);
    const alphaIn = Number(s.alpha_in ?? 0);
    if (taoIn <= 0 || alphaIn <= 0) continue;

    const alphaPriceTao = taoIn / alphaIn;
    const alphaPriceUsd = alphaPriceTao * taoUsd;

    result.set(s.netuid, {
      alphaPrice: +alphaPriceTao.toFixed(6),
      marketCap: +(alphaPriceUsd * alphaIn).toFixed(2),
      volume24h: 0,
    });
  }

  return result;
}

export async function refreshMarketCache(
  chainSubnets?: Array<{ netuid: number; tao_in?: number; alpha_in?: number; liquidity?: number }>,
): Promise<boolean> {
  // Strategy A: CMC TAO quote + chain pool ratios
  const cmcQuote = await fetchCmcTaoQuote();
  if (cmcQuote && chainSubnets && chainSubnets.length > 0) {
    const alphaPrices = computeAlphaPrices(chainSubnets, cmcQuote.price);
    for (const [netuid, data] of alphaPrices) {
      data.change1h = cmcQuote.percent_change_1h;
      data.change24h = cmcQuote.percent_change_24h;
      data.change1w = cmcQuote.percent_change_7d;
      data.change1m = cmcQuote.percent_change_30d;
      cache.set(netuid, data);
    }
    lastRefresh = Date.now();
    console.log("[market-cache] Refreshed " + alphaPrices.size + " subnets from CMC + chain pools");
    return true;
  }

  // Strategy B: TaoStats full market data
  const taoStatsData = await fetchTaoStatsMarket();
  if (taoStatsData) {
    cache.clear();
    for (const [netuid, data] of taoStatsData) {
      cache.set(netuid, data);
    }
    lastRefresh = Date.now();
    console.log("[market-cache] Refreshed " + taoStatsData.size + " subnets from TaoStats");
    return true;
  }

  if (cmcQuote) {
    lastRefresh = Date.now();
    console.log("[market-cache] CMC quote available but no chain data for alpha price derivation");
    return false;
  }

  console.log("[market-cache] All sources failed -- serving stale cache");
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
