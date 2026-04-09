/**
 * lib/chain/price-engine.ts
 *
 * Hybrid price engine for TAO and alpha tokens.
 *
 * ── Alpha token prices (100% on-chain) ──────────────────────────────
 * Each subnet has a TAO/alpha pool. The exchange rate is:
 *   alphaPrice (in TAO) = SubnetAlphaIn[netuid] / SubnetAlphaOut[netuid]
 * This is FULLY on-chain — no external API needed.
 *
 * ── TAO/USD price (external feed) ───────────────────────────────────
 * TAO/USD is NOT on-chain — it's determined by external exchanges.
 * We use a minimal external feed:
 *   1. CoinGecko (free, no key required)  — primary
 *   2. CoinMarketCap (free tier, CMC_API_KEY) — fallback
 *   3. Bootstrap constant ($350) — last resort
 *
 * The rest of the pipeline (metagraph, subnets, validators, activity)
 * is fully chain-native with zero external dependencies.
 *
 * ── Price history ───────────────────────────────────────────────────
 * Built from periodic snapshots stored in the rolling buffer.
 * The cron job calls syncPricesFromChain() every 5 minutes,
 * which fetches TAO/USD and records it + all alpha prices.
 */

import { ApiPromise, WsProvider } from "@polkadot/api";

/* ─────────────────────────────────────────────────────────────────── */
/* Constants                                                            */
/* ─────────────────────────────────────────────────────────────────── */

const RAO_PER_TAO = 1_000_000_000;

const SUBTENSOR_ENDPOINTS = [
  "wss://entrypoint-finney.opentensor.ai:443",
  "wss://subtensor.api.opentensor.ai:443",
];

const CONNECT_TIMEOUT_MS = 15_000;
const QUERY_TIMEOUT_MS = 30_000;

/* ─────────────────────────────────────────────────────────────────── */
/* Types                                                                */
/* ─────────────────────────────────────────────────────────────────── */

export interface AlphaTokenPrice {
  netuid: number;
  /** Alpha price in TAO (pool ratio) */
  alphaPriceTao: number;
  /** Alpha price in USD (alphaPriceTao * taoUsd) */
  alphaPriceUsd: number;
  /** TAO locked in the pool */
  taoIn: number;
  /** Alpha tokens in the pool */
  alphaOut: number;
  /** Estimated market cap in USD */
  marketCapUsd: number;
}

export interface TaoNetworkStats {
  /** Total TAO issued (circulating + locked) */
  totalIssuance: number;
  /** Total TAO staked across all subnets */
  totalStake: number;
  /** Current block number */
  blockHeight: number;
  /** Number of active subnets */
  subnetCount: number;
  /** Total TAO locked in all subnet pools */
  totalPooledTao: number;
  /** Timestamp of this reading */
  fetchedAt: string;
}

export interface TaoPricePoint {
  /** TAO price in USD */
  taoUsd: number;
  /** Timestamp */
  timestamp: string;
  /** Where this price came from */
  source: "coingecko" | "coinmarketcap" | "chain-derived" | "admin-seed" | "bootstrap";
  /** 24h change percentage (from exchange API) */
  change24h?: number;
  /** Market cap from exchange API */
  marketCap?: number;
  /** 24h volume from exchange API */
  volume24h?: number;
}

export interface PriceSnapshot {
  /** TAO/USD price */
  taoUsd: number;
  /** Network stats */
  network: TaoNetworkStats;
  /** Per-subnet alpha token prices */
  alphaTokens: AlphaTokenPrice[];
  /** When this snapshot was taken */
  fetchedAt: string;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Rolling price buffer (in-memory, persists across warm invocations)   */
/* ─────────────────────────────────────────────────────────────────── */

/** Max price points to keep (1 per cron tick = ~288/day at 5min intervals) */
const MAX_PRICE_HISTORY = 2016; // ~7 days at 5-min intervals

const priceHistory: TaoPricePoint[] = [];
let latestSnapshot: PriceSnapshot | null = null;

/** Seed the TAO price. Call once on first deploy or via admin endpoint. */
export function seedTaoPrice(taoUsd: number, source: TaoPricePoint["source"] = "admin-seed"): void {
  priceHistory.push({
    taoUsd,
    timestamp: new Date().toISOString(),
    source,
  });
  if (priceHistory.length > MAX_PRICE_HISTORY) {
    priceHistory.splice(0, priceHistory.length - MAX_PRICE_HISTORY);
  }
}

/** Get the latest known TAO/USD price, or a bootstrap fallback. */
export function getLatestTaoPrice(): TaoPricePoint {
  if (priceHistory.length > 0) {
    return priceHistory[priceHistory.length - 1];
  }
  // Only returned on a completely cold start (no cron has ever run).
  // After the first successful sync this is never reached again.
  return { taoUsd: 0, timestamp: new Date().toISOString(), source: "bootstrap" };
}

/** Get price history for the last N points. */
export function getTaoPriceHistory(count?: number): TaoPricePoint[] {
  const n = count ?? priceHistory.length;
  return priceHistory.slice(-n);
}

/** Get the latest full snapshot. */
export function getLatestPriceSnapshot(): PriceSnapshot | null {
  return latestSnapshot;
}

/* ─────────────────────────────────────────────────────────────────── */
/* TAO/USD external feed (minimal — only thing that needs external)     */
/* ─────────────────────────────────────────────────────────────────── */

interface FiatPriceResult {
  taoUsd: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  source: "coingecko" | "coinmarketcap";
}

/**
 * Fetch TAO/USD from CoinGecko (free, no key required).
 */
async function fetchTaoUsdFromCoinGecko(): Promise<FiatPriceResult | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bittensor&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true",
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;

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
      change24h: data.bittensor?.usd_24h_change ?? 0,
      marketCap: data.bittensor?.usd_market_cap ?? 0,
      volume24h: data.bittensor?.usd_24h_vol ?? 0,
      source: "coingecko",
    };
  } catch {
    return null;
  }
}

/**
 * Fetch TAO/USD from CoinMarketCap (requires CMC_API_KEY env var).
 */
async function fetchTaoUsdFromCmc(): Promise<FiatPriceResult | null> {
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
    if (!res.ok) return null;

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
      marketCap: usd.market_cap ?? 0,
      volume24h: usd.volume_24h ?? 0,
      source: "coinmarketcap",
    };
  } catch {
    return null;
  }
}

/**
 * Fetch TAO/USD price from external feeds.
 * CoinGecko primary → CMC fallback → null.
 */
async function fetchTaoUsdPrice(): Promise<FiatPriceResult | null> {
  const cg = await fetchTaoUsdFromCoinGecko();
  if (cg) return cg;

  const cmc = await fetchTaoUsdFromCmc();
  if (cmc) return cmc;

  return null;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Helpers                                                              */
/* ─────────────────────────────────────────────────────────────────── */

function toNumber(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  const str = String(raw).replace(/,/g, "");
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/* ─────────────────────────────────────────────────────────────────── */
/* Chain queries                                                        */
/* ─────────────────────────────────────────────────────────────────── */

async function connect(): Promise<ApiPromise> {
  const provider = new WsProvider(SUBTENSOR_ENDPOINTS, 2500);
  return withTimeout(
    ApiPromise.create({ provider, noInitWarn: true }),
    CONNECT_TIMEOUT_MS,
    "Price engine connection",
  );
}

/**
 * Query network-wide stats from Subtensor.
 */
async function queryNetworkStats(api: ApiPromise): Promise<TaoNetworkStats> {
  const [totalIssuanceRaw, totalStakeRaw, header, subnetEntries] = await Promise.all([
    api.query.balances?.totalIssuance?.()
      .catch(() => api.query.subtensorModule?.totalIssuance?.())
      .catch(() => null),
    api.query.subtensorModule.totalStake().catch(() => null),
    api.rpc.chain.getHeader(),
    api.query.subtensorModule.subnetworkN.entries(),
  ]);

  let totalIssuance = toNumber(totalIssuanceRaw);
  if (totalIssuance > 1e12) totalIssuance /= RAO_PER_TAO;

  let totalStake = toNumber(totalStakeRaw);
  if (totalStake > 1e12) totalStake /= RAO_PER_TAO;

  const subnetCount = subnetEntries.filter(([key]) => toNumber(key.args[0]) > 0).length;

  return {
    totalIssuance,
    totalStake,
    blockHeight: toNumber(header.number),
    subnetCount,
    totalPooledTao: 0, // Filled in after pool queries
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Query alpha token pool ratios for all subnets.
 * Returns alpha prices in TAO and USD.
 */
async function queryAlphaTokenPrices(
  api: ApiPromise,
  netuids: number[],
  taoUsd: number,
): Promise<AlphaTokenPrice[]> {
  const prices: AlphaTokenPrice[] = [];

  // Query pool data for all subnets
  // SubnetAlphaIn = TAO locked in pool, SubnetAlphaOut = alpha tokens in pool
  const [taoInResults, alphaOutResults] = await Promise.all([
    tryQuery(api, ["subnetAlphaIn", "taoIn", "subnetTaoIn"], netuids),
    tryQuery(api, ["subnetAlphaOut", "alphaOut"], netuids),
  ]);

  for (let i = 0; i < netuids.length; i++) {
    let taoIn = toNumber(taoInResults[i]);
    if (taoIn > 1e6) taoIn /= RAO_PER_TAO;

    let alphaOut = toNumber(alphaOutResults[i]);
    if (alphaOut > 1e6) alphaOut /= RAO_PER_TAO;

    if (taoIn <= 0 || alphaOut <= 0) continue;

    const alphaPriceTao = taoIn / alphaOut;
    const alphaPriceUsd = alphaPriceTao * taoUsd;

    prices.push({
      netuid: netuids[i],
      alphaPriceTao: +alphaPriceTao.toFixed(8),
      alphaPriceUsd: +alphaPriceUsd.toFixed(6),
      taoIn: +taoIn.toFixed(2),
      alphaOut: +alphaOut.toFixed(2),
      marketCapUsd: +(alphaPriceUsd * alphaOut).toFixed(2),
    });
  }

  return prices;
}

/** Try multiple storage keys, return first that works. */
async function tryQuery(
  api: ApiPromise,
  keyNames: string[],
  netuids: number[],
): Promise<unknown[]> {
  for (const key of keyNames) {
    try {
      const queryFn = (api.query.subtensorModule as Record<string, unknown>)[key] as
        | ((n: number) => Promise<unknown>)
        | undefined;
      if (!queryFn) continue;

      const results = await Promise.all(
        netuids.map((n) => queryFn(n).catch(() => null)),
      );

      if (results.some((r) => r !== null && toNumber(r) > 0)) return results;
    } catch {
      continue;
    }
  }
  return netuids.map(() => 0);
}

/* ─────────────────────────────────────────────────────────────────── */
/* Public API: full price sync                                          */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Run a full price sync.
 *
 * 1. Fetch TAO/USD from CoinGecko → CMC → stale buffer → bootstrap
 * 2. Connect to Subtensor chain
 * 3. Query network stats (TotalIssuance, TotalStake)
 * 4. Query all subnet pool ratios (alpha prices — 100% on-chain)
 * 5. Record price point in rolling buffer
 * 6. Return the full snapshot
 *
 * Call this from the cron job every 5 minutes.
 */
export async function syncPricesFromChain(): Promise<PriceSnapshot | null> {
  let api: ApiPromise | null = null;

  try {
    // Step 1: Get TAO/USD from external feed
    const fiatPrice = await fetchTaoUsdPrice();
    let taoUsd: number;
    let priceSource: TaoPricePoint["source"];
    let change24h = 0;
    let marketCap = 0;
    let volume24h = 0;

    if (fiatPrice) {
      taoUsd = fiatPrice.taoUsd;
      priceSource = fiatPrice.source;
      change24h = fiatPrice.change24h;
      marketCap = fiatPrice.marketCap;
      volume24h = fiatPrice.volume24h;
      console.log(`[price-engine] TAO/USD = $${taoUsd} from ${fiatPrice.source}`);
    } else {
      // Fall back to last known price from buffer (preserves the last real price)
      const lastKnown = getLatestTaoPrice();
      taoUsd = lastKnown.taoUsd;
      priceSource = lastKnown.source; // Keep original source label — don't downgrade
      change24h = lastKnown.change24h ?? 0;
      marketCap = lastKnown.marketCap ?? 0;
      volume24h = lastKnown.volume24h ?? 0;

      if (taoUsd <= 0) {
        // True cold start — no price has ever been fetched
        console.error("[price-engine] No price data available — cold start, skipping sync");
        return null;
      }

      console.warn(`[price-engine] External feeds unavailable — reusing last known price $${taoUsd} (${lastKnown.source})`);
    }

    // Step 2: Connect to chain
    console.log("[price-engine] Connecting to Subtensor...");
    api = await connect();

    // Step 3: Network stats
    const network = await withTimeout(queryNetworkStats(api), QUERY_TIMEOUT_MS, "networkStats");

    // Step 4: Enumerate subnets
    const entries = await api.query.subtensorModule.subnetworkN.entries();
    const netuids = entries
      .map(([key]) => toNumber(key.args[0]))
      .filter((n) => n > 0)
      .sort((a, b) => a - b);

    // Step 5: Query all alpha token prices from pool ratios (100% on-chain)
    const alphaTokens = await withTimeout(
      queryAlphaTokenPrices(api, netuids, taoUsd),
      QUERY_TIMEOUT_MS,
      "alphaTokenPrices",
    );

    // Step 6: Compute total pooled TAO
    network.totalPooledTao = alphaTokens.reduce((sum, a) => sum + a.taoIn, 0);

    // Use real market cap from exchange if available, else derive from issuance
    if (marketCap <= 0) {
      marketCap = +(taoUsd * network.totalIssuance).toFixed(0);
    }

    // Step 7: Record price point in rolling buffer
    priceHistory.push({
      taoUsd,
      timestamp: new Date().toISOString(),
      source: priceSource,
      change24h,
      marketCap,
      volume24h,
    });
    if (priceHistory.length > MAX_PRICE_HISTORY) {
      priceHistory.splice(0, priceHistory.length - MAX_PRICE_HISTORY);
    }

    // Step 8: Build snapshot
    const snapshot: PriceSnapshot = {
      taoUsd,
      network,
      alphaTokens,
      fetchedAt: new Date().toISOString(),
    };

    latestSnapshot = snapshot;

    console.log(
      `[price-engine] Sync complete: TAO=$${taoUsd} (${priceSource}), ` +
      `${alphaTokens.length} alpha prices, block ${network.blockHeight}`,
    );

    return snapshot;
  } catch (err) {
    console.error("[price-engine] Price sync failed:", err);
    return null;
  } finally {
    if (api) {
      try { await api.disconnect(); } catch { /* ignore */ }
    }
  }
}

/**
 * Derive price changes from the rolling buffer.
 * Returns percentage changes for 1h, 24h, 7d, 30d.
 */
export function derivePriceChanges(): {
  change1h: number;
  change24h: number;
  change7d: number;
  change30d: number;
} {
  // If the latest point has a change24h from the exchange API, use it
  const latest = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1] : null;
  const exchangeChange24h = latest?.change24h ?? 0;

  const now = Date.now();
  const current = getLatestTaoPrice().taoUsd;

  function findPriceAtAge(ageMs: number): number | null {
    const target = now - ageMs;
    let closest: TaoPricePoint | null = null;
    let closestDist = Infinity;

    for (const p of priceHistory) {
      const ts = Date.parse(p.timestamp);
      const dist = Math.abs(ts - target);
      if (dist < closestDist) {
        closestDist = dist;
        closest = p;
      }
    }

    // Only use if within 20% of the target age
    if (closest && closestDist < ageMs * 0.2) return closest.taoUsd;
    return null;
  }

  function pctChange(old: number | null): number {
    if (!old || old <= 0) return 0;
    return +((current - old) / old * 100).toFixed(2);
  }

  return {
    change1h: pctChange(findPriceAtAge(60 * 60 * 1000)),
    // Prefer exchange-reported 24h change if available (more accurate)
    change24h: exchangeChange24h !== 0
      ? +exchangeChange24h.toFixed(2)
      : pctChange(findPriceAtAge(24 * 60 * 60 * 1000)),
    change7d: pctChange(findPriceAtAge(7 * 24 * 60 * 60 * 1000)),
    change30d: pctChange(findPriceAtAge(30 * 24 * 60 * 60 * 1000)),
  };
}
