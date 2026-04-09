import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getHolderIntel } from "@/lib/api/holders";
import type { HolderIntelSnapshot } from "@/lib/types/holders";

interface HolderSnapshotFile extends HolderIntelSnapshot {
  _meta?: {
    generated_at?: string;
    source?: string;
    schema_version?: number;
  };
}

const HOLDER_SNAPSHOT_PATH = join(process.cwd(), "public", "data", "holders.json");

export function readHolderSnapshot(): {
  data: HolderIntelSnapshot;
  dataSource: string;
  generatedAt: string | null;
} {
  try {
    if (!existsSync(HOLDER_SNAPSHOT_PATH)) {
      const fallback = getHolderIntel();
      return {
        data: fallback,
        dataSource: "modeled-live-fallback",
        generatedAt: fallback.generatedAt,
      };
    }

    const raw = readFileSync(HOLDER_SNAPSHOT_PATH, "utf-8");
    const parsed = JSON.parse(raw) as HolderSnapshotFile;

    return {
      data: {
        generatedAt: parsed.generatedAt ?? parsed._meta?.generated_at ?? new Date().toISOString(),
        source: parsed.source ?? "modeled-demo",
        topHolders: parsed.topHolders ?? [],
        subnetFlows: parsed.subnetFlows ?? [],
        summary: parsed.summary,
      },
      dataSource: "holder-snapshot",
      generatedAt: parsed._meta?.generated_at ?? parsed.generatedAt ?? null,
    };
  } catch {
    const fallback = getHolderIntel();
    return {
      data: fallback,
      dataSource: "modeled-live-fallback",
      generatedAt: fallback.generatedAt,
    };
  }
}
