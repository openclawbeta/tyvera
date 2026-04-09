import { internalHolderProvider } from "@/lib/providers/holders/internal";
import { realAttributionHolderProvider } from "@/lib/providers/holders/real-attribution";
import { modeledHolderProvider } from "@/lib/providers/holders/modeled";
import type { HolderProviderResult } from "@/lib/providers/holders/types";

const providers = [internalHolderProvider, realAttributionHolderProvider, modeledHolderProvider];

let cached: HolderProviderResult | null = null;
let cachedAt = 0;
const TTL_MS = 10 * 60 * 1000;

export async function resolveHolders(): Promise<HolderProviderResult> {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;

  for (const provider of providers) {
    try {
      const result = await provider.fetch();
      if (result && result.data.topHolders.length > 0) {
        cached = result;
        cachedAt = Date.now();
        return result;
      }
    } catch {
      // try next provider
    }
  }

  const fallback = await modeledHolderProvider.fetch();
  if (!fallback) {
    throw new Error("Modeled holder provider returned no data");
  }
  cached = fallback;
  cachedAt = Date.now();
  return fallback;
}
