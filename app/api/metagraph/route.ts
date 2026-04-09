/**
 * app/api/metagraph/route.ts
 *
 * Metagraph data gateway for validators and miners on a subnet.
 *
 * Data source priority (highest → lowest):
 *   0. Chain cache (warm in-memory)         → T2
 *   1. Live chain query (Subtensor RPC)     → T1
 *   2. Synthetic fallback                   → T4
 *
 * No external API dependencies (no TaoStats).
 *
 * Query params:
 *   ?netuid=N  → return metagraph for that subnet
 */

import { NextRequest } from "next/server";
import {
  fetchMetagraphFromChain,
  getMetagraphCache,
  isMetagraphCacheFresh,
  setMetagraphCache,
} from "@/lib/chain";
import { checkApiAuth, rateLimitHeaders } from "@/lib/api/auth-middleware";
import { SYNTHETIC_VALIDATOR_COUNT, SYNTHETIC_MINER_COUNT } from "@/lib/config";
import {
  DATA_SOURCES,
  apiResponse,
  apiErrorResponse,
  type DataSourceId,
} from "@/lib/data-source-policy";

interface MetagraphNeuron {
  uid: number;
  hotkey: string;
  type: "validator" | "miner";
  stake: number;
  trust: number;
  consensus: number;
  incentive: number;
  dividends: number;
  emissionPerDay: number;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Helpers                                                              */
/* ─────────────────────────────────────────────────────────────────── */

function generateHotkey(seed: number): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let result = "1";
  const rng = mulberry32(seed);
  for (let i = 0; i < 63; i++) {
    result += chars[Math.floor(rng() * chars.length)];
  }
  return result;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSyntheticMetagraph(netuid: number): MetagraphNeuron[] {
  const neurons: MetagraphNeuron[] = [];
  const baseSeed = netuid * 1000;

  for (let i = 0; i < SYNTHETIC_VALIDATOR_COUNT; i++) {
    const rng = mulberry32(baseSeed + i);
    const stake = 10000 + rng() * 90000;
    neurons.push({
      uid: i,
      hotkey: generateHotkey(baseSeed + i),
      type: "validator",
      stake: Math.round(stake * 100) / 100,
      trust: 0.7 + rng() * 0.3,
      consensus: 0.6 + rng() * 0.4,
      incentive: 0.3 + rng() * 0.7,
      dividends: 0.5 + rng() * 0.5,
      emissionPerDay: rng() * 50,
    });
  }

  for (let i = 0; i < SYNTHETIC_MINER_COUNT; i++) {
    const rng = mulberry32(baseSeed + SYNTHETIC_VALIDATOR_COUNT + i);
    const stake = 100 + rng() * 10000;
    neurons.push({
      uid: SYNTHETIC_VALIDATOR_COUNT + i,
      hotkey: generateHotkey(baseSeed + SYNTHETIC_VALIDATOR_COUNT + i),
      type: "miner",
      stake: Math.round(stake * 100) / 100,
      trust: rng() * 0.8,
      consensus: rng() * 0.9,
      incentive: rng() * 1.0,
      dividends: rng() * 0.3,
      emissionPerDay: rng() * 10,
    });
  }

  return neurons;
}

/** Map chain neurons to our standard MetagraphNeuron shape. */
function mapChainNeurons(
  neurons: { uid: number; hotkey: string; stake: number; trust: number; consensus: number; incentive: number; dividends: number; emission: number }[],
): MetagraphNeuron[] {
  return neurons.map((n) => ({
    uid: n.uid,
    hotkey: n.hotkey,
    type: (n.dividends > 0.01 ? "validator" : "miner") as "validator" | "miner",
    stake: n.stake,
    trust: n.trust,
    consensus: n.consensus,
    incentive: n.incentive,
    dividends: n.dividends,
    emissionPerDay: n.emission,
  }));
}

/* ─────────────────────────────────────────────────────────────────── */
/* Route handler                                                        */
/* ─────────────────────────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const auth = await checkApiAuth(request);
  if (auth.errorResponse) return auth.errorResponse;
  const extraHeaders = auth.validation ? rateLimitHeaders(auth.validation) : {};

  const netuid = request.nextUrl.searchParams.get("netuid");
  if (!netuid || !/^\d+$/.test(netuid) || parseInt(netuid, 10) < 0) {
    return apiErrorResponse("Missing or invalid netuid query parameter", 400);
  }

  const netuidNum = Number(netuid);

  // ── Tier 2: Chain cache (warm) ────────────────────────────────────
  if (isMetagraphCacheFresh(netuidNum)) {
    const cached = getMetagraphCache(netuidNum);
    if (cached && cached.neurons.length > 0) {
      return apiResponse(
        { neurons: mapChainNeurons(cached.neurons), neuronCount: cached.neurons.length },
        {
          source: DATA_SOURCES.METAGRAPH_CACHE,
          fetchedAt: cached.fetchedAt,
          blockHeight: cached.blockHeight,
        },
        { extraHeaders },
      );
    }
  }

  // ── Tier 1: Live chain query ──────────────────────────────────────
  try {
    const chainResult = await fetchMetagraphFromChain(netuidNum);
    if (chainResult && chainResult.neurons.length > 0) {
      setMetagraphCache(chainResult);
      return apiResponse(
        { neurons: mapChainNeurons(chainResult.neurons), neuronCount: chainResult.neurons.length },
        {
          source: DATA_SOURCES.CHAIN_LIVE,
          fetchedAt: chainResult.fetchedAt,
          blockHeight: chainResult.blockHeight,
        },
        { extraHeaders },
      );
    }
  } catch (err) {
    console.error(`[metagraph] Chain query failed for SN${netuidNum}:`, err);
  }

  // ── Tier 4: Synthetic fallback ────────────────────────────────────
  const synthetic = generateSyntheticMetagraph(netuidNum);
  return apiResponse(
    { neurons: synthetic, neuronCount: synthetic.length },
    {
      source: DATA_SOURCES.SYNTHETIC,
      fetchedAt: new Date().toISOString(),
      note: "All live sources unavailable — deterministic synthetic metagraph",
    },
    { extraHeaders },
  );
}
