import { ApiPromise, WsProvider } from "@polkadot/api";
import type { ChainHolderPosition, HolderAttributionSnapshot } from "./types";

const SUBTENSOR_ENDPOINTS = [
  "wss://entrypoint-finney.opentensor.ai:443",
  "wss://subtensor.api.opentensor.ai:443",
];

const CONNECT_TIMEOUT_MS = 15_000;
const QUERY_TIMEOUT_MS = 45_000;
const RAO_PER_TAO = 1_000_000_000;
const MAX_COLDKEYS_TO_SCAN = 20;
const MAX_HOTKEYS_PER_COLDKEY = 3;
const MAX_NETUIDS_TO_SCAN = 12;
const MIN_POSITION_TAO = 5;
const MAX_TOTAL_ALPHA_QUERIES = 360;
const TOP_NEURONS_PER_SUBNET = 8;

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
  return withTimeout(ApiPromise.create({ provider, noInitWarn: true }), CONNECT_TIMEOUT_MS, "Subtensor connection");
}

async function disconnect(api: ApiPromise): Promise<void> {
  try {
    await api.disconnect();
  } catch {
    // ignore
  }
}

async function getActiveNetuids(api: ApiPromise): Promise<number[]> {
  const entries = await api.query.subtensorModule.subnetworkN.entries();
  return entries
    .map(([key]) => toNumber(key.args[0]))
    .filter((n) => n >= 0)
    .sort((a, b) => a - b);
}

/**
 * Strategy 1 (legacy): Query stakingColdkeysByIndex if available.
 * Low yield — this storage key is unreliable on many chains.
 */
async function getColdkeysByIndex(api: ApiPromise): Promise<string[]> {
  const coldkeys: string[] = [];
  for (let i = 0; i < MAX_COLDKEYS_TO_SCAN; i++) {
    try {
      const coldkey = await withTimeout(
        (api.query.subtensorModule as any).stakingColdkeysByIndex(i),
        2_000,
        `stakingColdkeysByIndex(${i})`,
      );
      const value = String(coldkey);
      if (value && value !== "null" && value !== "undefined" && value.length > 10) {
        coldkeys.push(value);
      }
    } catch {
      break;
    }
  }
  return coldkeys;
}

/**
 * Strategy 2 (improved): Query metagraph for top subnets, collect top-stake
 * hotkeys, then resolve coldkeys via Owner storage map.
 * Much higher yield because we start from known high-value neurons.
 */
async function getColdkeysFromMetagraph(api: ApiPromise, netuids: number[]): Promise<string[]> {
  const hotkeyStakeMap = new Map<string, number>();

  // Query metagraph for top 3 subnets by staker count to find high-stake hotkeys
  const sampleNetuids = netuids.slice(0, 3);
  for (const netuid of sampleNetuids) {
    try {
      // Get UIDs in this subnet
      const nRaw = await withTimeout(
        api.query.subtensorModule.subnetworkN(netuid),
        3_000,
        `subnetworkN(${netuid})`,
      );
      const n = toNumber(nRaw);
      const uids = Array.from({ length: Math.min(n, 64) }, (_, i) => i);

      // Get hotkeys for these UIDs
      const hotkeys = await Promise.all(
        uids.map((uid) =>
          withTimeout(
            api.query.subtensorModule.keys(netuid, uid),
            1_500,
            `keys(${netuid},${uid})`,
          ).then(String).catch(() => ""),
        ),
      );

      // Get stakes for these UIDs
      const stakes = await Promise.all(
        uids.map((uid) =>
          withTimeout(
            (api.query.subtensorModule as any).S?.(netuid, uid) ??
            (api.query.subtensorModule as any).stake?.(netuid, uid) ??
            Promise.resolve(0),
            1_500,
            `stake(${netuid},${uid})`,
          ).then(toNumber).catch(() => 0),
        ),
      );

      for (let i = 0; i < hotkeys.length; i++) {
        const hk = hotkeys[i];
        if (hk && hk.length > 10) {
          const existing = hotkeyStakeMap.get(hk) ?? 0;
          hotkeyStakeMap.set(hk, existing + stakes[i]);
        }
      }
    } catch {
      // skip this subnet
    }
  }

  // Sort by total stake and take top candidates
  const topHotkeys = Array.from(hotkeyStakeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_COLDKEYS_TO_SCAN * 2)
    .map(([hk]) => hk);

  // Resolve hotkeys → coldkeys via Owner storage
  const coldkeySet = new Set<string>();
  for (const hotkey of topHotkeys) {
    try {
      const owner = await withTimeout(
        (api.query.subtensorModule as any).owner(hotkey),
        1_500,
        `owner(${hotkey.slice(0, 10)})`,
      );
      const ck = String(owner);
      if (ck && ck.length > 10 && ck !== "null" && ck !== "undefined") {
        coldkeySet.add(ck);
      }
    } catch {
      // skip
    }
    if (coldkeySet.size >= MAX_COLDKEYS_TO_SCAN) break;
  }

  return Array.from(coldkeySet);
}

/**
 * Combined strategy: try metagraph-based extraction first (higher yield),
 * fall back to index-based if that returns few results.
 */
async function getColdkeysToScan(api: ApiPromise, netuids: number[]): Promise<string[]> {
  // Strategy 2: metagraph-based (preferred)
  const metagraphColdkeys = await getColdkeysFromMetagraph(api, netuids).catch(() => [] as string[]);

  if (metagraphColdkeys.length >= 5) {
    return metagraphColdkeys;
  }

  // Strategy 1: index-based (fallback)
  const indexColdkeys = await getColdkeysByIndex(api).catch(() => [] as string[]);

  // Merge both sets
  const merged = new Set([...metagraphColdkeys, ...indexColdkeys]);
  return Array.from(merged).slice(0, MAX_COLDKEYS_TO_SCAN);
}

export async function fetchHolderAttributionFromChain(limit = 250): Promise<HolderAttributionSnapshot> {
  let api: ApiPromise | null = null;

  try {
    api = await connect();
    const connectedApi = api;

    const netuids = (await withTimeout(getActiveNetuids(connectedApi), QUERY_TIMEOUT_MS, "activeNetuids")).slice(0, MAX_NETUIDS_TO_SCAN);
    const coldkeys = await withTimeout(getColdkeysToScan(connectedApi, netuids), QUERY_TIMEOUT_MS, "getColdkeysToScan");

    const positions: ChainHolderPosition[] = [];
    let alphaQueries = 0;

    for (const coldkey of coldkeys) {
      let hotkeys: string[] = [];
      try {
        const stakingHotkeys = await (api.query.subtensorModule as any).stakingHotkeys(coldkey);
        hotkeys = (stakingHotkeys?.toJSON?.() as string[] | undefined) ?? [];
      } catch {
        continue;
      }

      for (const hotkey of hotkeys.slice(0, MAX_HOTKEYS_PER_COLDKEY)) {
        const candidateNetuids = netuids.slice(0, Math.max(0, MAX_NETUIDS_TO_SCAN - Math.floor(alphaQueries / Math.max(1, MAX_COLDKEYS_TO_SCAN))));
        const alphaChecks = await Promise.all(
          candidateNetuids.map(async (netuid) => {
            if (alphaQueries >= MAX_TOTAL_ALPHA_QUERIES) return null;
            alphaQueries += 1;
            try {
              const alpha = await withTimeout(
                (connectedApi.query.subtensorModule as any).alpha(hotkey, coldkey, netuid),
                1_500,
                `alpha(${netuid})`,
              );
              const raw = toNumber(alpha);
              const stakeTao = raw > 1e6 ? raw / RAO_PER_TAO : raw;
              if (stakeTao < MIN_POSITION_TAO) return null;
              return {
                coldkey,
                hotkey,
                netuid,
                stakeTao: Math.round(stakeTao * 1000) / 1000,
              };
            } catch {
              return null;
            }
          }),
        );

        positions.push(...alphaChecks.filter(Boolean) as ChainHolderPosition[]);
        if (alphaQueries >= MAX_TOTAL_ALPHA_QUERIES) break;
      }

      if (alphaQueries >= MAX_TOTAL_ALPHA_QUERIES) break;
    }

    const sorted = positions
      .sort((a, b) => b.stakeTao - a.stakeTao)
      .slice(0, limit);

    return {
      positions: sorted,
      fetchedAt: new Date().toISOString(),
      source: sorted.length > 0 ? "chain-live" : "unavailable",
      notes: sorted.length > 0
        ? `Partial real extraction from stakingColdkeysByIndex + stakingHotkeys + alpha across ${coldkeys.length} coldkeys (${alphaQueries} alpha queries).`
        : `No positions found from partial extraction across ${coldkeys.length} coldkeys (${alphaQueries} alpha queries).`,
    };
  } catch (error) {
    return {
      positions: [],
      fetchedAt: new Date().toISOString(),
      source: "unavailable",
      notes: error instanceof Error ? error.message : "Unknown holder attribution error",
    };
  } finally {
    if (api) await disconnect(api);
  }
}

export function buildRealAttributionSummary(snapshot: HolderAttributionSnapshot): {
  available: boolean;
  source: string;
  trackedPositions: number;
  trackedWallets: number;
  notes?: string;
} {
  const wallets = new Set(snapshot.positions.map((p) => p.coldkey));
  return {
    available: snapshot.source === "chain-live" && snapshot.positions.length > 0,
    source: snapshot.source,
    trackedPositions: snapshot.positions.length,
    trackedWallets: wallets.size,
    notes: snapshot.notes,
  };
}
