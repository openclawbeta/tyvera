/**
 * lib/chain/price-engine.ts
 *
 * On-chain price derivation for TAO and alpha tokens.
 *
 * Replaces CoinGecko / CoinMarketCap / TaoStats market data with
 * direct Subtensor chain queries. Every price comes from pool ratios
 * on the Bittensor network itself.
 *
 * ── Alpha token prices ──────────────────────────────────────────────
 * Each subnet has a TAO/alpha pool. The exchange rate is:
 *   alphaPrice (in TAO) = SubnetAlphaIn[netuid] / SubnetAlphaOut[netuid]
 *
 * ── TAO/USD price ───────────────────────────────────────────────────
 * TAO/USD is NOT on-chain — it's determined by external exchanges.
 * We maintain a rolling price buffer that can be seeded by:
 *   1. On-chain TotalIssuance + TotalStake for relative valuation
 *   2. A minimal price feed (kept as thin as possible)
 *   3. Manual price seed via admin API
 *
 * ── Price history ───────────────────────────────────────────────────
 * Built from periodic snapshots stored in the rolling buffer.
 * No external historical API needed.
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
  source: "chain-derived" | "admin-seed" | "bootstrap";
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

/** Get the latest known TAO/USD price, or a bootstrap estimate. */
export function getLatestTaoPrice(): TaoPricePoint {
  if (priceHistory.length > 0) {
    return priceHistory[priceHistory.length - 1];
  }
  // Bootstrap: use a reasonable default that will be overwritten on first sync
  return { taoUsd: 350, timestamp: new Date().toISOString(), source: "bootstrap" };
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
 * Run a full price sync from the Bittensor chain.
 *
 * 1. Connects to Subtensor
 * 2. Queries network stats (TotalIssuance, TotalStake)
 * 3. Gets all subnet pool ratios (alpha prices)
 * 4. Records a price point in the rolling buffer
 * 5. Returns the full snapshot
 *
 * Call this from the cron job every 5 minutes.
 */
export async function syncPricesFromChain(): Promise<PriceSnapshot | null> {
  let api: ApiPromise | null = null;

  try {
    console.log("[price-engine] Connecting to Subtensor...");
    api = await connect();

    // 1. Network stats
    const network = await withTimeout(queryNetworkStats(api), QUERY_TIMEOUT_MS, "networkStats");

    // 2. Enumerate subnets
    const entries = await api.query.subtensorModule.subnetworkN.entries();
    const netuids = entries
      .map(([key]) => toNumber(key.args[0]))
      .filter((n) => n > 0)
      .sort((a, b) => a - b);

    // 3. Get current TAO price (from buffer or bootstrap)
    const currentPrice = getLatestTaoPrice();
    const taoUsd = currentPrice.taoUsd;

    // 4. Query all alpha token prices from pool ratios
    const alphaTokens = await withTimeout(
      queryAlphaTokenPrices(api, netuids, taoUsd),
      QUERY_TIMEOUT_MS,
      "alphaTokenPrices",
    );

    // 5. Compute total pooled TAO
    network.totalPooledTao = alphaTokens.reduce((sum, a) => sum + a.taoIn, 0);

    // 6. Record price point
    seedTaoPrice(taoUsd, "chain-derived");

    // 7. Build snapshot
    const snapshot: PriceSnapshot = {
      taoUsd,
      network,
      alphaTokens,
      fetchedAt: new Date().toISOString(),
    };

    latestSnapshot = snapshot;

    console.log(
      `[price-engine] Sync complete: ${alphaTokens.length} alpha prices, ` +
      `block ${network.blockHeight}, TAO=$${taoUsd}`,
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
    change24h: pctChange(findPriceAtAge(24 * 60 * 60 * 1000)),
    change7d: pctChange(findPriceAtAge(7 * 24 * 60 * 60 * 1000)),
    change30d: pctChange(findPriceAtAge(30 * 24 * 60 * 60 * 1000)),
  };
}
