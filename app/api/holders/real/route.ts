/**
 * app/api/holders/real/route.ts
 *
 * Live holder attribution from on-chain data.
 *
 * Data source priority:
 *   1. Holder attribution cache (15 min)  → T2
 *   2. Live chain extraction              → T1
 */

import {
  fetchHolderAttributionFromChain,
  buildRealAttributionSummary,
} from "@/lib/chain/holders";
import {
  getHolderAttributionCache,
  isHolderAttributionCacheFresh,
  setHolderAttributionCache,
} from "@/lib/chain";
import {
  DATA_SOURCES,
  apiResponse,
} from "@/lib/data-source-policy";

export async function GET() {
  if (isHolderAttributionCacheFresh()) {
    const cached = getHolderAttributionCache();
    if (cached) {
      return apiResponse(
        {
          snapshot: cached,
          summary: buildRealAttributionSummary(cached),
        },
        {
          source: DATA_SOURCES.HOLDER_CACHE,
          fetchedAt: cached.fetchedAt,
          fallbackUsed: cached.source !== "chain-live",
          note: cached.notes,
        },
        {
          cacheControl: "public, s-maxage=300",
        },
      );
    }
  }

  const snapshot = await fetchHolderAttributionFromChain(250);
  setHolderAttributionCache(snapshot);

  const source = snapshot.source === "chain-live"
    ? DATA_SOURCES.CHAIN_LIVE
    : DATA_SOURCES.MODELED;

  return apiResponse(
    {
      snapshot,
      summary: buildRealAttributionSummary(snapshot),
    },
    {
      source,
      fetchedAt: snapshot.fetchedAt,
      fallbackUsed: snapshot.source !== "chain-live",
      ...(snapshot.notes ? { note: snapshot.notes } : {}),
    },
    {
      cacheControl: "public, s-maxage=300",
    },
  );
}
