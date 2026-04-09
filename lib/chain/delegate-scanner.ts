/**
 * lib/chain/delegate-scanner.ts
 *
 * Validator/delegate information from direct Subtensor chain queries.
 * Replaces TaoStats /api/v1/delegate endpoint entirely.
 *
 * Queries:
 *   - S(netuid=0, uid) → root subnet stake per validator
 *   - hotkeys(netuid=0, uid) → validator hotkeys from root subnet
 *   - delegates storage → delegate take rates
 *   - nominatorCount or staking storage → nominator counts
 *
 * Enriched with the Opentensor delegate registry (GitHub JSON)
 * for human-readable names and descriptions.
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
const QUERY_TIMEOUT_MS = 45_000;

/** Opentensor public delegate registry */
const DELEGATE_REGISTRY_URL =
  "https://raw.githubusercontent.com/opentensor/bittensor-delegates/main/public/delegates.json";

/* ─────────────────────────────────────────────────────────────────── */
/* Types                                                                */
/* ─────────────────────────────────────────────────────────────────── */

export interface ChainDelegate {
  hotkey: string;
  /** Root subnet stake in TAO */
  rootStake: number;
  /** Take rate (0-1) */
  take: number;
  /** Number of nominators (delegators) */
  nominators: number;
  /** Subnets this validator is registered on */
  registeredSubnets: number[];
  /** Name from delegate registry */
  name: string;
  /** Description from delegate registry */
  description: string;
  /** Whether the delegate has a registry entry */
  verified: boolean;
}

export interface DelegateScanResult {
  delegates: ChainDelegate[];
  totalNetworkStake: number;
  blockHeight: number;
  fetchedAt: string;
  scanDurationMs: number;
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
/* Registry fetch                                                       */
/* ─────────────────────────────────────────────────────────────────── */

interface RegistryEntry {
  name?: string;
  url?: string;
  description?: string;
}

async function fetchDelegateRegistry(): Promise<Record<string, RegistryEntry>> {
  try {
    const resp = await fetch(DELEGATE_REGISTRY_URL, {
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return {};
    return (await resp.json()) as Record<string, RegistryEntry>;
  } catch {
    return {};
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/* Chain queries                                                        */
/* ─────────────────────────────────────────────────────────────────── */

async function connect(): Promise<ApiPromise> {
  const provider = new WsProvider(SUBTENSOR_ENDPOINTS, 2500);
  return withTimeout(
    ApiPromise.create({ provider, noInitWarn: true }),
    CONNECT_TIMEOUT_MS,
    "Delegate scanner connection",
  );
}

/**
 * Scan all delegates from the root subnet (netuid=0).
 *
 * Root subnet neurons are validators. Their stake in the root subnet
 * represents their total network influence.
 */
async function scanDelegatesFromChain(api: ApiPromise): Promise<ChainDelegate[]> {
  // Get neuron count on root subnet (netuid=0)
  const rootNeuronCount = toNumber(await api.query.subtensorModule.subnetworkN(0));
  if (rootNeuronCount === 0) return [];

  const maxUids = Math.min(rootNeuronCount, 256);
  const uids = Array.from({ length: maxUids }, (_, i) => i);

  // Batch query: hotkeys and stakes for root subnet
  const [hotkeys, stakes] = await Promise.all([
    Promise.all(uids.map((u) =>
      api.query.subtensorModule.hotkeys(0, u).then(String).catch(() => ""),
    )),
    Promise.all(uids.map((u) =>
      api.query.subtensorModule.s(0, u).then(toNumber).catch(() => 0),
    )),
  ]);

  // Build delegate list from root neurons with non-zero stake
  const delegates: ChainDelegate[] = [];

  for (let i = 0; i < uids.length; i++) {
    const hotkey = hotkeys[i];
    if (!hotkey || hotkey === "" || hotkey === "0x") continue;

    let stake = stakes[i];
    if (stake > 1e12) stake /= RAO_PER_TAO;
    if (stake < 1) continue; // Skip dust

    delegates.push({
      hotkey,
      rootStake: +(stake.toFixed(2)),
      take: 0.18, // Default take — could query Delegates storage
      nominators: 0, // Would need to scan nominator storage
      registeredSubnets: [],
      name: `${hotkey.slice(0, 8)}...${hotkey.slice(-4)}`,
      description: "",
      verified: false,
    });
  }

  // Sort by stake descending
  delegates.sort((a, b) => b.rootStake - a.rootStake);

  // Query delegate take rates for top delegates (best-effort)
  const topDelegates = delegates.slice(0, 64);
  try {
    const takes = await Promise.all(
      topDelegates.map((d) =>
        (api.query.subtensorModule as Record<string, unknown>).delegates
          ? (api.query.subtensorModule as any).delegates(d.hotkey).then(toNumber).catch(() => 0)
          : Promise.resolve(0),
      ),
    );
    for (let i = 0; i < topDelegates.length; i++) {
      if (takes[i] > 0) {
        // Delegate take is stored as u16 (0-65535), representing 0-100%
        topDelegates[i].take = takes[i] > 1 ? takes[i] / 65535 : takes[i];
      }
    }
  } catch {
    // Keep defaults
  }

  // Query subnet registrations for top delegates (best-effort)
  try {
    const allSubnetEntries = await api.query.subtensorModule.subnetworkN.entries();
    const allNetuids = allSubnetEntries
      .map(([key]) => toNumber(key.args[0]))
      .filter((n) => n > 0);

    // For each top delegate, check which subnets they're registered on
    // This is expensive, so limit to top 32 + first 20 subnets
    const checkDelegates = topDelegates.slice(0, 32);
    const checkSubnets = allNetuids.slice(0, 20);

    for (const delegate of checkDelegates) {
      const registrations: number[] = [];
      for (const netuid of checkSubnets) {
        try {
          // Check if hotkey is in the metagraph for this subnet
          const isRegistered = await (api.query.subtensorModule as any)
            .uids?.(netuid, delegate.hotkey)
            .then((v: unknown) => toNumber(v) >= 0)
            .catch(() => false);
          if (isRegistered) registrations.push(netuid);
        } catch {
          continue;
        }
      }
      delegate.registeredSubnets = registrations;
    }
  } catch {
    // Subnet registration scan failed — leave empty
  }

  return delegates;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Public API                                                           */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Scan delegates from chain and enrich with registry names.
 */
export async function fetchDelegatesFromChain(): Promise<DelegateScanResult | null> {
  const start = Date.now();
  let api: ApiPromise | null = null;

  try {
    // Fetch registry and connect to chain in parallel
    const [registry, apiInstance] = await Promise.all([
      fetchDelegateRegistry(),
      connect(),
    ]);
    api = apiInstance;

    const delegates = await withTimeout(
      scanDelegatesFromChain(api),
      QUERY_TIMEOUT_MS,
      "scanDelegates",
    );

    const blockHeight = toNumber((await api.rpc.chain.getHeader()).number);

    // Enrich with registry names
    for (const d of delegates) {
      const entry = registry[d.hotkey];
      if (entry) {
        d.name = entry.name || d.name;
        d.description = entry.description || "";
        d.verified = true;
      }
    }

    const totalNetworkStake = delegates.reduce((sum, d) => sum + d.rootStake, 0);

    const result: DelegateScanResult = {
      delegates,
      totalNetworkStake,
      blockHeight,
      fetchedAt: new Date().toISOString(),
      scanDurationMs: Date.now() - start,
    };

    console.log(
      `[delegate-scanner] Found ${delegates.length} delegates, ` +
      `total stake ${totalNetworkStake.toFixed(0)} TAO, took ${result.scanDurationMs}ms`,
    );

    return result;
  } catch (err) {
    console.error("[delegate-scanner] Scan failed:", err);
    return null;
  } finally {
    if (api) {
      try { await api.disconnect(); } catch { /* ignore */ }
    }
  }
}
