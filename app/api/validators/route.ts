import {
  DATA_SOURCES,
  apiResponse,
  type DataSourceId,
} from "@/lib/data-source-policy";
import { resolveValidators } from "@/lib/services/validators";

export async function GET() {
  const result = await resolveValidators();

  const source: DataSourceId =
    result.source === "validator-tao-app"
      ? DATA_SOURCES.TAOSTATS_LIVE
      : result.source === "validator-static"
      ? DATA_SOURCES.STATIC_SNAPSHOT
      : result.source === "validator-taostats"
      ? DATA_SOURCES.TAOSTATS_LIVE
      : DATA_SOURCES.CHAIN_CACHE;

  return apiResponse(
    {
      validators: result.validators,
      summary: result.summary,
    },
    {
      source,
      fetchedAt: new Date().toISOString(),
      fallbackUsed: result.fallbackUsed,
      stale: result.stale ?? false,
      note:
        result.source === "validator-tao-app"
          ? [result.note, "Powered by TAO.app API"].filter(Boolean).join(" · ")
          : result.note,
    },
    {
      cacheControl: "public, s-maxage=300",
    },
  );
}
