/**
 * app/api/holders/route.ts
 *
 * Modeled holder intelligence endpoint.
 *
 * Data source priority:
 *   1. JSON snapshot (public/data/holders.json) → T3
 *   2. Modeled live fallback                   → T4
 */

import { readHolderSnapshot } from "@/lib/api/holders-snapshot";
import {
  DATA_SOURCES,
  apiResponse,
  type DataSourceId,
} from "@/lib/data-source-policy";

export async function GET() {
  const { data, dataSource, generatedAt } = readHolderSnapshot();

  const source: DataSourceId =
    dataSource === "holder-snapshot"
      ? DATA_SOURCES.HOLDER_SNAPSHOT
      : DATA_SOURCES.MODELED;

  return apiResponse(
    { ...data },
    {
      source,
      fetchedAt: generatedAt ?? data.generatedAt,
      ...(source === DATA_SOURCES.MODELED
        ? { note: "No snapshot file found — using modeled holder data" }
        : {}),
    },
  );
}
