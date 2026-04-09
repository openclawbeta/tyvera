import { internalMetagraphProvider } from "@/lib/providers/metagraph/internal";
import { taostatsMetagraphProvider } from "@/lib/providers/metagraph/taostats";
import { syntheticMetagraphProvider } from "@/lib/providers/metagraph/synthetic";
import type { MetagraphProviderResult } from "@/lib/providers/metagraph/types";

const providers = [internalMetagraphProvider, taostatsMetagraphProvider, syntheticMetagraphProvider];

const cache = new Map<number, { result: MetagraphProviderResult; cachedAt: number }>();
const TTL_MS = 5 * 60 * 1000;

export async function resolveMetagraph(netuid: number): Promise<MetagraphProviderResult> {
  const hit = cache.get(netuid);
  if (hit && Date.now() - hit.cachedAt < TTL_MS) return hit.result;

  for (const provider of providers) {
    try {
      const result = await provider.fetch(netuid);
      if (result && result.neurons.length > 0) {
        cache.set(netuid, { result, cachedAt: Date.now() });
        return result;
      }
    } catch {
      // try next provider
    }
  }

  const fallback = await syntheticMetagraphProvider.fetch(netuid);
  if (!fallback) {
    throw new Error("Synthetic metagraph provider returned no data");
  }
  cache.set(netuid, { result: fallback, cachedAt: Date.now() });
  return fallback;
}
