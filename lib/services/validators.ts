import { internalValidatorProvider } from "@/lib/providers/validators/internal";
import { taostatsValidatorProvider } from "@/lib/providers/validators/taostats";
import { staticValidatorProvider } from "@/lib/providers/validators/static";
import type { ValidatorProviderResult } from "@/lib/providers/validators/types";

const providers = [
  internalValidatorProvider,
  taostatsValidatorProvider,
  staticValidatorProvider,
];

let cached: ValidatorProviderResult | null = null;
let cachedAt = 0;
const TTL_MS = 10 * 60 * 1000;

export async function resolveValidators(): Promise<ValidatorProviderResult> {
  if (cached && Date.now() - cachedAt < TTL_MS) {
    return cached;
  }

  for (const provider of providers) {
    try {
      const result = await provider.fetch();
      if (result && result.validators.length > 0) {
        cached = result;
        cachedAt = Date.now();
        return result;
      }
    } catch {
      // try next provider
    }
  }

  const fallback = await staticValidatorProvider.fetch();
  if (!fallback) {
    throw new Error("Static validator provider returned no data");
  }
  cached = fallback;
  cachedAt = Date.now();
  return fallback;
}

export function getCachedValidators(): ValidatorProviderResult | null {
  if (!cached) return null;
  if (Date.now() - cachedAt >= TTL_MS) return null;
  return cached;
}
