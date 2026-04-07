/**
 * lib/chain/subtensor.ts
 *
 * Direct Subtensor (Bittensor blockchain) client.
 *
 * Connects to a public Subtensor Finney node via WebSocket, queries
 * on-chain storage for subnet info and metagraph data, and returns
 * clean typed objects. No third-party API keys required.
 *
 * Architecture:
 *   - Connection is established on-demand and disconnected after use
 *   - Designed for serverless (Vercel cron) — no persistent connections
 *   - Falls back gracefully on any error — callers use TaoStats
 *
 * Key Subtensor storage locations:
 *   SubtensorModule::SubnetAlphaIn[netuid]     → TAO locked in subnet
 *   SubtensorModule::SubnetTaoInEmission[netuid] → emission per block (RAO)
 *   SubtensorModule::SubnetworkN[netuid]        → registered neuron count
 *   SubtensorModule::NetworkRegisteredAt[netuid] → registration block
 *   SubtensorModule::TokenSymbol[netuid]        → token symbol bytes
 *   SubtensorModule::NetworkName[netuid]        → subnet name bytes
 */

import { ApiPromise, WsProvider } from "@polkadot/api";
import type { ChainSubnet, ChainNeuron, ChainSnapshot, MetagraphCacheEntry } from "./types";

/* ─────────────────────────────────────────────────────────────────── */
/* Configuration                                                        */
/* ─────────────────────────────────────────────────────────────────── */

const SUBTENSOR_ENDPOINTS = [
  "wss://entrypoint-finney.opentensor.ai:443",
  "wss://subtensor.api.opentensor.ai:443",
];

const CONNECT_TIMEOUT_MS = 15_000;
const QUERY_TIMEOUT_MS   = 45_000;

const BLOCKS_PER_DAY = 7200;
const RAO_PER_TAO    = 1_000_000_000;

/* ─────────────────────────────────────────────────────────────────── */
/* Helpers                                                              */
/* ─────────────────────────────────────────────────────────────────── */

function decodeBytes(raw: unknown): string {
  if (!raw) return "";
  const str = String(raw);
  // Substrate sometimes returns hex-encoded bytes
  if (str.startsWith("0x")) {
    try {
      const hex = str.slice(2);
      let result = "";
      for (let i = 0; i < hex.length; i += 2) {
        const code = parseInt(hex.substring(i, i + 2), 16);
        if (code === 0) break;
        result += String.fromCharCode(code);
      }
      return result.trim();
    } catch {
      return "";
    }
  }
  return str.trim();
}

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
/* Connection                                                           */
/* ─────────────────────────────────────────────────────────────────── */

async function connect(): Promise<ApiPromise> {
  const provider = new WsProvider(SUBTENSOR_ENDPOINTS, 2500);
  const api = await withTimeout(
    ApiPromise.create({ provider, noInitWarn: true }),
    CONNECT_TIMEOUT_MS,
    "Subtensor connection",
  );
  return api;
}

async function disconnect(api: ApiPromise): Promise<void> {
  try {
    await api.disconnect();
  } catch {
    // Ignore disconnect errors
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/* Query: all subnet netuids                                            */
/* ─────────────────────────────────────────────────────────────────── */

async function getNetUids(api: ApiPromise): Promise<number[]> {
  // SubtensorModule::SubnetworkN is a StorageMap<netuid, u16>
  // Enumerate all keys to discover active subnets
  const entries = await api.query.subtensorModule.subnetworkN.entries();
  const netuids: number[] = [];
  for (const [key] of entries) {
    const netuid = toNumber(key.args[0]);
    if (netuid > 0) netuids.push(netuid); // Skip netuid 0 (root subnet)
  }
  return netuids.sort((a, b) => a - b);
}

/* ─────────────────────────────────────────────────────────────────── */
/* Query: subnet details                                                */
/* ─────────────────────────────────────────────────────────────────── */

async function querySubnetBatch(api: ApiPromise, netuids: number[]): Promise<ChainSubnet[]> {
  const subnets: ChainSubnet[] = [];
  const currentBlock = toNumber((await api.rpc.chain.getHeader()).number);

  // Batch queries for all subnets at once
  const [
    taoInResults,
    emissionResults,
    stakersResults,
    regAtResults,
    nameResults,
    symbolResults,
  ] = await Promise.all([
    // TAO locked in each subnet pool
    tryMultiQuery(api, ["subnetAlphaIn", "taoIn", "subnetTaoIn"], netuids),
    // Emission per block per subnet (RAO)
    tryMultiQuery(api, ["subnetTaoInEmission", "subnetAlphaOutEmission", "emissionValues"], netuids),
    // Registered neuron count
    Promise.all(netuids.map((n) => api.query.subtensorModule.subnetworkN(n).then(toNumber).catch(() => 0))),
    // Registration block
    tryMultiQuery(api, ["networkRegisteredAt"], netuids),
    // Subnet name
    tryMultiQuery(api, ["networkName", "subnetName"], netuids),
    // Token symbol
    tryMultiQuery(api, ["tokenSymbol", "subnetSymbol"], netuids),
  ]);

  for (let i = 0; i < netuids.length; i++) {
    const netuid = netuids[i];

    let taoIn = toNumber(taoInResults[i]);
    // SubnetAlphaIn is stored in RAO. Even small subnets have millions of RAO,
    // so any value > 1e6 is almost certainly RAO, not TAO.
    if (taoIn > 1e6) taoIn /= RAO_PER_TAO;

    let emissionRaw = toNumber(emissionResults[i]);
    // Emission per block is always in RAO (e.g. 6,212,418 RAO = 0.006 TAO).
    // Convert to TAO if the value looks like RAO (> 1, since TAO values would be < 1).
    if (emissionRaw > 1) emissionRaw /= RAO_PER_TAO;
    const emissionPerDay = emissionRaw * BLOCKS_PER_DAY;

    const regAt = toNumber(regAtResults[i]);
    const ageDays = regAt > 0 ? Math.round((currentBlock - regAt) / BLOCKS_PER_DAY) : 0;

    subnets.push({
      netuid,
      name: decodeBytes(nameResults[i]),
      symbol: decodeBytes(symbolResults[i]),
      taoIn: Math.round(taoIn * 10) / 10,
      emissionPerDay: Math.round(emissionPerDay * 1000) / 1000,
      stakers: stakersResults[i],
      registeredAt: regAt,
      ageDays: Math.max(ageDays, 0),
    });
  }

  return subnets;
}

/**
 * Try multiple storage key names (camelCase) for a batch of netuids.
 * Returns the first key that succeeds for all netuids.
 */
async function tryMultiQuery(
  api: ApiPromise,
  keyNames: string[],
  netuids: number[],
): Promise<unknown[]> {
  for (const key of keyNames) {
    try {
      const queryFn = (api.query.subtensorModule as any)[key];
      if (!queryFn) continue;

      const results = await Promise.all(
        netuids.map((n) => queryFn(n).catch(() => null)),
      );

      // Check if we got any real data
      const hasData = results.some((r) => r !== null && toNumber(r) > 0);
      if (hasData) return results;
    } catch {
      continue;
    }
  }
  // All keys failed — return zeros
  return netuids.map(() => 0);
}

/* ─────────────────────────────────────────────────────────────────── */
/* Query: metagraph (neurons for a single subnet)                       */
/* ─────────────────────────────────────────────────────────────────── */

async function queryMetagraph(api: ApiPromise, netuid: number): Promise<ChainNeuron[]> {
  const neurons: ChainNeuron[] = [];

  // Get neuron count for this subnet
  const neuronCount = toNumber(await api.query.subtensorModule.subnetworkN(netuid));
  if (neuronCount === 0) return neurons;

  const uids = Array.from({ length: Math.min(neuronCount, 256) }, (_, i) => i);

  // Batch query neuron properties
  const [hotkeys, stakes, trusts, consensus, incentives, dividends, emissions, actives] = await Promise.all([
    Promise.all(uids.map((u) => api.query.subtensorModule.hotkeys(netuid, u).then(String).catch(() => ""))),
    Promise.all(uids.map((u) => api.query.subtensorModule.s(netuid, u).then(toNumber).catch(() => 0))),
    Promise.all(uids.map((u) => api.query.subtensorModule.trust(netuid, u).then(toNumber).catch(() => 0))),
    Promise.all(uids.map((u) => api.query.subtensorModule.consensus(netuid, u).then(toNumber).catch(() => 0))),
    Promise.all(uids.map((u) => api.query.subtensorModule.incentive(netuid, u).then(toNumber).catch(() => 0))),
    Promise.all(uids.map((u) => api.query.subtensorModule.dividends(netuid, u).then(toNumber).catch(() => 0))),
    Promise.all(uids.map((u) => api.query.subtensorModule.emission(netuid, u).then(toNumber).catch(() => 0))),
    Promise.all(uids.map((u) => api.query.subtensorModule.active(netuid, u).then((v: unknown) => !!toNumber(v)).catch(() => false))),
  ]);

  // U16 max = 65535, used for normalized fields.
  // Subtensor stores trust/consensus/incentive/dividends as U16 (0–65535).
  // Values > 1 are raw U16 and need normalization. Values <= 1 are already normalized.
  const U16_MAX = 65535;
  function normalizeU16(val: number): number {
    if (val > 1) return val / U16_MAX;
    return val; // Already normalized (0.0–1.0)
  }

  for (let i = 0; i < uids.length; i++) {
    let stake = stakes[i];
    if (stake > 1e12) stake /= RAO_PER_TAO;

    let emissionRaw = emissions[i];
    if (emissionRaw > 1e12) emissionRaw /= RAO_PER_TAO;

    neurons.push({
      uid: uids[i],
      hotkey: hotkeys[i],
      coldkey: "", // Not queried for performance — add if needed
      stake: Math.round(stake * 100) / 100,
      trust: normalizeU16(trusts[i]),
      consensus: normalizeU16(consensus[i]),
      incentive: normalizeU16(incentives[i]),
      dividends: normalizeU16(dividends[i]),
      emission: emissionRaw * BLOCKS_PER_DAY,
      active: actives[i],
    });
  }

  return neurons;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Public API                                                           */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Fetch all subnet data from Subtensor.
 * Connects, queries, disconnects. Safe for serverless.
 */
export async function fetchSubnetsFromChain(): Promise<ChainSnapshot | null> {
  const start = Date.now();
  let api: ApiPromise | null = null;

  try {
    console.log("[chain] Connecting to Subtensor...");
    api = await connect();
    console.log("[chain] Connected. Querying subnet list...");

    const netuids = await withTimeout(getNetUids(api), QUERY_TIMEOUT_MS, "getNetUids");
    console.log(`[chain] Found ${netuids.length} subnets. Fetching details...`);

    const subnets = await withTimeout(querySubnetBatch(api, netuids), QUERY_TIMEOUT_MS, "querySubnetBatch");
    const blockHeight = toNumber((await api.rpc.chain.getHeader()).number);

    const snapshot: ChainSnapshot = {
      subnets,
      blockHeight,
      fetchedAt: new Date().toISOString(),
      syncDurationMs: Date.now() - start,
    };

    console.log(
      `[chain] Sync complete: ${subnets.length} subnets, block ${blockHeight}, ` +
      `took ${snapshot.syncDurationMs}ms`,
    );

    return snapshot;
  } catch (err) {
    console.error("[chain] Subnet sync failed:", err);
    return null;
  } finally {
    if (api) await disconnect(api);
  }
}

/**
 * Fetch metagraph for a single subnet from Subtensor.
 */
export async function fetchMetagraphFromChain(netuid: number): Promise<MetagraphCacheEntry | null> {
  let api: ApiPromise | null = null;

  try {
    api = await connect();
    const neurons = await withTimeout(queryMetagraph(api, netuid), QUERY_TIMEOUT_MS, "queryMetagraph");
    const blockHeight = toNumber((await api.rpc.chain.getHeader()).number);

    return {
      netuid,
      neurons,
      blockHeight,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[chain] Metagraph sync failed for SN${netuid}:`, err);
    return null;
  } finally {
    if (api) await disconnect(api);
  }
}
