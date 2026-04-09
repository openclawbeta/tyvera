import { ApiPromise, WsProvider } from "@polkadot/api";
import type { ChainHolderPosition, HolderAttributionSnapshot } from "./types";

const SUBTENSOR_ENDPOINTS = [
  "wss://entrypoint-finney.opentensor.ai:443",
  "wss://subtensor.api.opentensor.ai:443",
];

const CONNECT_TIMEOUT_MS = 15_000;
const QUERY_TIMEOUT_MS = 45_000;
const RAO_PER_TAO = 1_000_000_000;

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

export async function fetchHolderAttributionFromChain(limit = 250): Promise<HolderAttributionSnapshot> {
  let api: ApiPromise | null = null;

  try {
    api = await connect();

    // Real chain-level top-holder attribution needs heavier storage traversal/indexing
    // than the current serverless route can do cheaply. This function is the honest
    // scaffolding point for that future implementation.
    return {
      positions: [],
      fetchedAt: new Date().toISOString(),
      source: "unavailable",
      notes: `Live holder attribution is not wired yet. Planned approach: enumerate coldkeys/hotkeys from metagraph and staking storage, aggregate top holders, then limit to top ${toNumber(limit)} positions for caching.`,
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
