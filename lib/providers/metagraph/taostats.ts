import type { MetagraphProvider, MetagraphProviderResult } from "./types";

const TAOSTATS_BASE = "https://api.taostats.io/api";

export const taostatsMetagraphProvider: MetagraphProvider = {
  name: "taostats",
  async fetch(netuid: number): Promise<MetagraphProviderResult | null> {
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

      const neurons = data
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

      if (neurons.length === 0) return null;

      return {
        neurons,
        source: "taostats-live",
        fallbackUsed: true,
        note: "Serving TaoStats metagraph fallback provider.",
      };
    } catch {
      return null;
    }
  },
};
