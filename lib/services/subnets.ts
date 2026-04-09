import { internalSubnetProvider } from "@/lib/providers/subnets/internal";
import { staticSubnetProvider } from "@/lib/providers/subnets/static";
import type { SubnetProviderResult } from "@/lib/providers/subnets/types";

const providers = [internalSubnetProvider, staticSubnetProvider];

const cache = new Map<string, { result: SubnetProviderResult; cachedAt: number }>();
const TTL_MS = 5 * 60 * 1000;

export async function resolveSubnets(netuidFilter?: number): Promise<SubnetProviderResult> {
  const key = netuidFilter != null ? `netuid:${netuidFilter}` : "all";
  const hit = cache.get(key);
  if (hit && Date.now() - hit.cachedAt < TTL_MS) return hit.result;

  for (const provider of providers) {
    try {
      const result = await provider.fetch(netuidFilter);
      if (result && result.subnets.length > 0) {
        cache.set(key, { result, cachedAt: Date.now() });
        return result;
      }
    } catch {
      // try next provider
    }
  }

  const fallback = await staticSubnetProvider.fetch(netuidFilter);
  if (!fallback) {
    throw new Error("Static subnet provider returned no data");
  }
  cache.set(key, { result: fallback, cachedAt: Date.now() });
  return fallback;
}
