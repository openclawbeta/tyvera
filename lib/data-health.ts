import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function inspectJsonFile(path: string) {
  if (!existsSync(path)) {
    return { exists: false, fetchedAt: null, ageSec: null, sizeBytes: null };
  }

  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    const stat = statSync(path);
    const fetchedAt = parsed?._meta?.generated_at ?? parsed?._meta?.fetched_at ?? parsed?.generatedAt ?? null;
    const ageSec = fetchedAt ? Math.round((Date.now() - Date.parse(fetchedAt)) / 1000) : null;
    return {
      exists: true,
      fetchedAt,
      ageSec,
      sizeBytes: stat.size,
    };
  } catch {
    return { exists: true, fetchedAt: null, ageSec: null, sizeBytes: null };
  }
}

export function getDataHealthSummary() {
  const root = process.cwd();
  return {
    checkedAt: new Date().toISOString(),
    datasets: {
      subnets: inspectJsonFile(join(root, "public", "data", "subnets.json")),
      holders: inspectJsonFile(join(root, "public", "data", "holders.json")),
      holderAttribution: inspectJsonFile(join(root, "public", "data", "holder-attribution.json")),
      validators: inspectJsonFile(join(root, "public", "data", "validators.json")),
      taoRate: {
        exists: true,
        fetchedAt: null,
        ageSec: null,
        sizeBytes: null,
        note: "Runtime API/cache-driven; inspect /api/tao-rate for live state.",
      },
      taoPriceHistory: {
        exists: true,
        fetchedAt: null,
        ageSec: null,
        sizeBytes: null,
        note: "Runtime API/provider-driven; inspect /api/tao-price-history for source metadata.",
      },
      metagraph: {
        exists: true,
        fetchedAt: null,
        ageSec: null,
        sizeBytes: null,
        note: "Runtime provider/cached route; inspect /api/metagraph?netuid=... for source metadata.",
      },
      activity: {
        exists: true,
        fetchedAt: null,
        ageSec: null,
        sizeBytes: null,
        note: "Runtime route; inspect /api/activity for live provider state.",
      },
    },
  };
}
