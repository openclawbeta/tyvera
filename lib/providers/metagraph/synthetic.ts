import { SYNTHETIC_VALIDATOR_COUNT, SYNTHETIC_MINER_COUNT } from "@/lib/config";
import type { MetagraphProvider, MetagraphProviderResult, MetagraphNeuron } from "./types";

function generateHotkey(seed: number): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let result = "1";
  const rng = mulberry32(seed);
  for (let i = 0; i < 63; i++) result += chars[Math.floor(rng() * chars.length)];
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

export const syntheticMetagraphProvider: MetagraphProvider = {
  name: "synthetic",
  async fetch(netuid: number): Promise<MetagraphProviderResult> {
    return {
      neurons: generateSyntheticMetagraph(netuid),
      source: "synthetic",
      fallbackUsed: true,
      note: "Synthetic metagraph fallback provider.",
    };
  },
};
