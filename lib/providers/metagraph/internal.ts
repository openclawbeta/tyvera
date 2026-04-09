import {
  fetchMetagraphFromChain,
  getMetagraphCache,
  isMetagraphCacheFresh,
  setMetagraphCache,
} from "@/lib/chain";
import type { MetagraphProvider, MetagraphProviderResult } from "./types";

function mapNeuron(n: any) {
  return {
    uid: n.uid,
    hotkey: n.hotkey,
    type: n.dividends > 0.01 ? "validator" as const : "miner" as const,
    stake: n.stake,
    trust: n.trust,
    consensus: n.consensus,
    incentive: n.incentive,
    dividends: n.dividends,
    emissionPerDay: n.emission,
  };
}

export const internalMetagraphProvider: MetagraphProvider = {
  name: "internal",
  async fetch(netuid: number): Promise<MetagraphProviderResult | null> {
    if (isMetagraphCacheFresh(netuid)) {
      const cached = getMetagraphCache(netuid);
      if (cached && cached.neurons.length > 0) {
        return {
          neurons: cached.neurons.map(mapNeuron),
          source: "chain-live",
          fallbackUsed: false,
          blockHeight: cached.blockHeight,
        };
      }
    }

    try {
      const chainResult = await fetchMetagraphFromChain(netuid);
      if (chainResult && chainResult.neurons.length > 0) {
        setMetagraphCache(chainResult);
        return {
          neurons: chainResult.neurons.map(mapNeuron),
          source: "chain-live",
          fallbackUsed: false,
          blockHeight: chainResult.blockHeight,
        };
      }
    } catch {
      return null;
    }

    return null;
  },
};
