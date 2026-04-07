/**
 * app/api/metagraph/route.ts
 *
 * Metagraph data gateway for validators and miners on a subnet.
 *
 * Data source priority (highest → lowest):
 *   1. TaoStats API: https://api.taostats.io/api/metagraph/latest/v1
 *      Requires: TAOSTATS_API_KEY env var (server-side only)
 *   2. Synthetic fallback: generates realistic metagraph data for the subnet
 *
 * Query params:
 *   ?netuid=N  → return metagraph for that subnet
 *
 * Response:
 *   JSON array of neuron objects with stake, trust, incentive, etc.
 *
 * Caching:
 *   s-maxage=300 (5 minutes)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchMetagraphFromChain,
  getMetagraphCache,
  isMetagraphCacheFresh,
  setMetagraphCache,
} from "@/lib/chain";

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

const TAOSTATS_BASE = "https://api.taostats.io/api";

/**
 * Generate a realistic-looking hotkey (Bittensor public key format).
 * Format: 5-character prefix + 58-char base58-like string
 */
function generateHotkey(seed: number): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let result = "1";
  const rng = mulberry32(seed);

  for (let i = 0; i < 63; i++) {
    result += chars[Math.floor(rng() * chars.length)];
  }

  return result;
}

/**
 * Seeded PRNG (Mulberry32) for deterministic synthetic data.
 */
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate synthetic metagraph data.
 * Allocates: 32 validators + 224 miners per subnet.
 */
function generateSyntheticMetagraph(netuid: number): MetagraphNeuron[] {
  const neurons: MetagraphNeuron[] = [];
  const baseSeed = netuid * 1000;

  // 32 validators
  for (let i = 0; i < 32; i++) {
    const rng = mulberry32(baseSeed + i);
    const stake = 10000 + rng() * 90000; // 10k - 100k τ
    neurons.push({
      uid: i,
      hotkey: generateHotkey(baseSeed + i),
      type: "validator",
      stake: Math.round(stake * 100) / 100,
      trust: 0.7 + rng() * 0.3, // 0.7 - 1.0
      consensus: 0.6 + rng() * 0.4, // 0.6 - 1.0
      incentive: 0.3 + rng() * 0.7, // 0.3 - 1.0
      dividends: 0.5 + rng() * 0.5, // 0.5 - 1.0
      emissionPerDay: rng() * 50, // 0 - 50 τ/day
    });
  }

  // 224 miners
  for (let i = 0; i < 224; i++) {
    const rng = mulberry32(baseSeed + 32 + i);
    const stake = 100 + rng() * 10000; // 100 - 10k τ
    neurons.push({
      uid: 32 + i,
      hotkey: generateHotkey(baseSeed + 32 + i),
      type: "miner",
      stake: Math.round(stake * 100) / 100,
      trust: rng() * 0.8, // 0 - 0.8
      consensus: rng() * 0.9, // 0 - 0.9
      incentive: rng() * 1.0, // 0 - 1.0
      dividends: rng() * 0.3, // 0 - 0.3
      emissionPerDay: rng() * 10, // 0 - 10 τ/day
    });
  }

  return neurons;
}

/**
 * Fetch from TaoStats API.
 */
async function fetchFromTaoStats(netuid: number): Promise<MetagraphNeuron[] | null> {
  const apiKey = process.env.TAOSTATS_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL(`${TAOSTATS_BASE}/metagraph/latest/v1`);
    url.searchParams.set("netuid", String(netuid));
    url.searchParams.set("limit", "256");

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data)) return null;

    // Transform TaoStats response to our schema
    return data
      .map((neuron: any) => ({
        uid: neuron.uid,
        hotkey: neuron.hotkey || `0x${neuron.uid}`,
        type: (neuron.type === 1 ? "validator" : "miner") as "validator" | "miner",
        stake: Number(neuron.stake ?? 0),
        trust: Number(neuron.trust ?? 0),
        consensus: Number(neuron.consensus ?? 0),
        incentive: Number(neuron.incentive ?? 0),
        dividends: Number(neuron.dividends ?? 0),
        emissionPerDay: Number(neuron.emission ?? 0),
      }))
      .filter((n) => typeof n.uid === "number");
  } catch (error) {
    console.error("TaoStats metagraph fetch failed:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const netuid = request.nextUrl.searchParams.get("netuid");

  if (!netuid || isNaN(Number(netuid))) {
    return NextResponse.json(
      { error: "Missing or invalid netuid query parameter" },
      { status: 400 }
    );
  }

  const netuidNum = Number(netuid);

  // ── Priority 0: Chain cache (from cron or previous on-demand fetch) ────
  if (isMetagraphCacheFresh(netuidNum)) {
    const cached = getMetagraphCache(netuidNum);
    if (cached && cached.neurons.length > 0) {
      const neurons: MetagraphNeuron[] = cached.neurons.map((n) => ({
        uid: n.uid,
        hotkey: n.hotkey,
        type: n.dividends > 0.01 ? "validator" : "miner",
        stake: n.stake,
        trust: n.trust,
        consensus: n.consensus,
        incentive: n.incentive,
        dividends: n.dividends,
        emissionPerDay: n.emission,
      }));

      return NextResponse.json(neurons, {
        headers: {
          "X-Data-Source": "chain-live",
          "X-Block-Height": String(cached.blockHeight),
          "Cache-Control": "public, s-maxage=120",
        },
      });
    }
  }

  // ── Priority 0b: Try live chain query (on-demand, cached for next request) ──
  try {
    const chainResult = await fetchMetagraphFromChain(netuidNum);
    if (chainResult && chainResult.neurons.length > 0) {
      setMetagraphCache(chainResult);

      const neurons: MetagraphNeuron[] = chainResult.neurons.map((n) => ({
        uid: n.uid,
        hotkey: n.hotkey,
        type: n.dividends > 0.01 ? "validator" : "miner",
        stake: n.stake,
        trust: n.trust,
        consensus: n.consensus,
        incentive: n.incentive,
        dividends: n.dividends,
        emissionPerDay: n.emission,
      }));

      return NextResponse.json(neurons, {
        headers: {
          "X-Data-Source": "chain-live",
          "X-Block-Height": String(chainResult.blockHeight),
          "Cache-Control": "public, s-maxage=120",
        },
      });
    }
  } catch (err) {
    console.error(`[metagraph] Chain query failed for SN${netuidNum}:`, err);
  }

  // ── Priority 1: TaoStats API ───────────────────────────────────────────
  const taoStatsNeurons = await fetchFromTaoStats(netuidNum);
  if (taoStatsNeurons) {
    return NextResponse.json(taoStatsNeurons, {
      headers: {
        "X-Data-Source": "taostats-live",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  }

  // ── Priority 2: Synthetic fallback ─────────────────────────────────────
  const synthetic = generateSyntheticMetagraph(netuidNum);
  return NextResponse.json(synthetic, {
    headers: {
      "X-Data-Source": "synthetic",
      "Cache-Control": "public, s-maxage=300",
    },
  });
}
