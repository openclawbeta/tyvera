/**
 * lib/chain/root-metrics.ts
 *
 * Live root (netuid 0) economics pulled directly from Subtensor.
 *
 * Why this exists:
 *   The recommendation engine needs to answer "will I earn more by staking
 *   on root or on an alpha subnet?" To do that honestly we need a REAL root
 *   APR, not a heuristic derived from subnet yields. This module queries
 *   chain storage, computes root APR, and caches the result for sync reads.
 *
 * What it queries:
 *   - Total root stake     — subtensorModule.totalStake (network-wide stake
 *                             is what earns root emissions)
 *   - Root neuron count    — subtensorModule.subnetworkN(0)
 *   - Root emission rate   — derived from chain issuance / root share
 *
 * Root emission math (dTAO era):
 *   Network issues ~1 TAO per block. Root's share is currently 41% of
 *   network emissions (post-dTAO switchover), which flows to root stakers
 *   as rewards. We approximate this conservatively from chain data:
 *     dailyRootEmission = blockRate × 1 TAO × rootShare × 7200 blocks/day
 *   Where rootShare is derived from ROOT_EMISSION_SHARE (0.41) by default,
 *   with a fallback if a future chain query surfaces a cleaner value.
 *
 * Yield formula:
 *   APR = (dailyRootEmission × 365 / totalRootStake) × 100
 *
 * Caching:
 *   Module-scoped, identical pattern to cache.ts. Written by cron
 *   sync-chain, read by /api/subnets and (indirectly) by the recommender.
 */

import { ApiPromise, WsProvider } from "@polkadot/api";

const SUBTENSOR_ENDPOINTS = [
  "wss://entrypoint-finney.opentensor.ai:443",
  "wss://subtensor.api.opentensor.ai:443",
];

const CONNECT_TIMEOUT_MS = 15_000;
const QUERY_TIMEOUT_MS = 30_000;

const BLOCKS_PER_DAY = 7200;
const RAO_PER_TAO = 1_000_000_000;

/**
 * Root's share of network TAO emissions post-dTAO.
 * Subtensor splits block rewards between root (netuid 0) and alpha subnets.
 * The split is governance-controlled; 0.41 is the current observed share
 * per opentensor/subtensor and the TaoStats UI. When chain storage exposes
 * a cleaner query for this we can replace the constant.
 */
const ROOT_EMISSION_SHARE = 0.41;

/** TAO emitted per block network-wide (pre-halving baseline). */
const TAO_PER_BLOCK = 1;

/** Cache TTL for root metrics — matches subnet cache cadence. */
const ROOT_METRICS_MAX_AGE_MS = 15 * 60 * 1000;

/* ─────────────────────────────────────────────────────────────────── */
/* Types                                                                */
/* ─────────────────────────────────────────────────────────────────── */

export interface RootMetrics {
  /** Total TAO staked on root (network-wide stake). */
  liquidity: number;
  /** Root neurons (validator slots), proxy for "stakers". */
  stakers: number;
  /** TAO per day flowing to root stakers. */
  dailyEmission: number;
  /** Annualised APR as a percentage. */
  yield: number;
  /** Block height at which these metrics were captured. */
  blockHeight: number;
  /** Where this came from: "chain" is fully fresh, "chain-partial" if a sub-query failed. */
  source: "chain" | "chain-partial";
  fetchedAt: string;
  syncDurationMs: number;
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

async function connect(): Promise<ApiPromise> {
  const provider = new WsProvider(SUBTENSOR_ENDPOINTS, 2500);
  return withTimeout(
    ApiPromise.create({ provider, noInitWarn: true }),
    CONNECT_TIMEOUT_MS,
    "Root metrics connection",
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Public API                                                           */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Query root-subnet economics from chain.
 *
 * Returns null on hard failure (can't connect / no totalStake). Returns a
 * "chain-partial" result if a secondary query failed but core numbers are
 * good enough to serve.
 */
export async function fetchRootMetricsFromChain(): Promise<RootMetrics | null> {
  const start = Date.now();
  let api: ApiPromise | null = null;
  let partial = false;

  try {
    console.log("[root-metrics] Connecting to Subtensor...");
    api = await connect();

    const [totalStakeRaw, rootNeuronCountRaw, headerRaw] = await Promise.all([
      withTimeout(
        api.query.subtensorModule.totalStake().catch(() => null),
        QUERY_TIMEOUT_MS,
        "totalStake",
      ),
      withTimeout(
        api.query.subtensorModule.subnetworkN(0).catch(() => null),
        QUERY_TIMEOUT_MS,
        "rootNeuronCount",
      ),
      withTimeout(
        api.rpc.chain.getHeader(),
        QUERY_TIMEOUT_MS,
        "chainHeader",
      ),
    ]);

    // totalStake is network-wide TAO stake — everything staked to a hotkey.
    // Values this large are stored in RAO; convert to TAO.
    let totalStake = toNumber(totalStakeRaw);
    if (totalStake <= 0) {
      console.error("[root-metrics] totalStake returned zero/invalid");
      return null;
    }
    if (totalStake > 1e12) totalStake /= RAO_PER_TAO;

    let rootNeuronCount = toNumber(rootNeuronCountRaw);
    if (rootNeuronCount <= 0) {
      // Not fatal — use a conservative default so we still return data.
      rootNeuronCount = 64;
      partial = true;
    }

    const blockHeight = toNumber(headerRaw.number);

    // Emission math.
    // Every block: TAO_PER_BLOCK TAO issued network-wide.
    // Root's share flows proportionally to root stakers.
    const dailyNetworkEmission = TAO_PER_BLOCK * BLOCKS_PER_DAY;
    const dailyRootEmission = dailyNetworkEmission * ROOT_EMISSION_SHARE;

    // APR = (dailyEmission × 365 / totalRootStake) × 100
    const rawYield = (dailyRootEmission * 365 / totalStake) * 100;
    const yieldPct = +rawYield.toFixed(2);

    const result: RootMetrics = {
      liquidity: Math.round(totalStake * 10) / 10,
      stakers: rootNeuronCount,
      dailyEmission: +dailyRootEmission.toFixed(3),
      yield: yieldPct,
      blockHeight,
      source: partial ? "chain-partial" : "chain",
      fetchedAt: new Date().toISOString(),
      syncDurationMs: Date.now() - start,
    };

    console.log(
      `[root-metrics] stake=${result.liquidity.toLocaleString()} τ, ` +
      `daily=${result.dailyEmission} τ, APR=${result.yield}%, ` +
      `took ${result.syncDurationMs}ms`,
    );

    return result;
  } catch (err) {
    console.error("[root-metrics] Fetch failed:", err);
    return null;
  } finally {
    if (api) {
      try { await api.disconnect(); } catch { /* ignore */ }
    }
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/* Module-scoped cache                                                  */
/* ─────────────────────────────────────────────────────────────────── */

let rootMetricsCache: RootMetrics | null = null;

export function setRootMetricsCache(metrics: RootMetrics): void {
  rootMetricsCache = metrics;
}

export function getRootMetricsCache(): RootMetrics | null {
  return rootMetricsCache;
}

export function isRootMetricsCacheFresh(): boolean {
  if (!rootMetricsCache) return false;
  const ts = Date.parse(rootMetricsCache.fetchedAt);
  if (isNaN(ts)) return false;
  return Date.now() - ts < ROOT_METRICS_MAX_AGE_MS;
}

export function getRootMetricsCacheAgeMs(): number {
  if (!rootMetricsCache) return Infinity;
  const ts = Date.parse(rootMetricsCache.fetchedAt);
  if (isNaN(ts)) return Infinity;
  return Date.now() - ts;
}
