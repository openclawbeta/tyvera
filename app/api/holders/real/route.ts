import { NextResponse } from "next/server";
import {
  fetchHolderAttributionFromChain,
  buildRealAttributionSummary,
} from "@/lib/chain/holders";
import {
  getHolderAttributionCache,
  isHolderAttributionCacheFresh,
  setHolderAttributionCache,
} from "@/lib/chain";

export async function GET() {
  if (isHolderAttributionCacheFresh()) {
    const cached = getHolderAttributionCache();
    if (cached) {
      return NextResponse.json({
        snapshot: cached,
        summary: buildRealAttributionSummary(cached),
      }, {
        headers: {
          "X-Data-Source": cached.source,
          "Cache-Control": "public, s-maxage=300",
        },
      });
    }
  }

  const snapshot = await fetchHolderAttributionFromChain(250);
  setHolderAttributionCache(snapshot);

  return NextResponse.json({
    snapshot,
    summary: buildRealAttributionSummary(snapshot),
  }, {
    headers: {
      "X-Data-Source": snapshot.source,
      "Cache-Control": "public, s-maxage=300",
    },
  });
}
