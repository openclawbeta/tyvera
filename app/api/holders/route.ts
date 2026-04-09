import { resolveHolders } from "@/lib/services/holders";
import {
  DATA_SOURCES,
  apiResponse,
  type DataSourceId,
} from "@/lib/data-source-policy";

export async function GET() {
  const result = await resolveHolders();

  const source: DataSourceId =
    result.source === "holder-snapshot"
      ? DATA_SOURCES.HOLDER_SNAPSHOT
      : result.source === "tao-app"
      ? DATA_SOURCES.TAOSTATS_LIVE
      : DATA_SOURCES.MODELED;

  return apiResponse(
    { ...result.data },
    {
      source,
      fetchedAt: result.generatedAt ?? result.data.generatedAt,
      fallbackUsed: result.fallbackUsed,
      stale: result.stale ?? false,
      note:
        result.source === "tao-app"
          ? [result.note, "Powered by TAO.app API"].filter(Boolean).join(" · ")
          : result.note,
    },
    {
      cacheControl: "public, s-maxage=300",
    },
  );
}
