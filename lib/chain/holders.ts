import { ApiPromise, WsProvider } from "@polkadot/api";
import type { ChainHolderPosition, HolderAttributionSnapshot } from "./types";

const SUBTENSOR_ENDPOINTS = [
  "wss://entrypoint-finney.opentensor.ai:443",
  "wss://subtensor.api.opentensor.ai:443",
];

const CONNECT_TIMEOUT_MS = 15_000;
const QUERY_TIMEOUT_MS = 45_000;
const RAO_PER_TAO = 1_000_000_000;
const MAX_COLDKEYS_TO_SCAN = 12;
const MAX_HOTKEYS_PER_COLDKEY = 3;
const MAX_NETUIDS_TO_SCAN = 10;
const MIN_POSITION_TAO = 5;
const MAX_TOTAL_ALPHA_QUERIES = MAX_COLDKEYS_TO_SCAN * MAX_HOTKEYS_PER_COLDKEY * MAX_NETUIDS_TO_SCAN;

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

async function getColdkeysToScan(api: ApiPromise): Promise<string[]> {
  const entries = await (api.query.subtensorModule as any).stakingColdkeysByIndex.entries();
  return entries
    .map(([, value]) => String(value))
    .filter(Boolean)
    .slice(0, MAX_COLDKEYS_TO_SCAN);
}

export async function fetchHolderAttributionFromChain(limit = 250): Promise<HolderAttributionSnapshot> {
  let api: ApiPromise | null = null;

  try {
    api = await connect();

    const coldkeys = await withTimeout(getColdkeysToScan(api), QUERY_TIMEOUT_MS, "stakingColdkeysByIndex");
    const netuids = (await withTimeout(getActiveNetuids(api), QUERY_TIMEOUT_MS, "activeNetuids")).slice(0, MAX_NETUIDS_TO_SCAN);

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
                (api.query.subtensorModule as any).alpha(hotkey, coldkey, netuid),
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
