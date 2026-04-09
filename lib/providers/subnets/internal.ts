import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SubnetDetailModel } from "@/lib/types/subnets";
import type { SubnetProvider, SubnetProviderResult } from "./types";
import { CURATED_METADATA, buildFallbackMeta } from "@/lib/data/subnets-curated-metadata";

const SNAPSHOT_MAX_AGE_HOURS = 2;
const SUBTENSOR_SNAPSHOT_PATH = join(process.cwd(), "public", "data", "subnets.json");

interface SubtensorPayload {
  _meta?: {
    fetched_at?: string;
  };
  subnets: SubnetDetailModel[];
}

function hydrateSubnetMetadata(subnet: SubnetDetailModel): SubnetDetailModel {
  const sourceName = subnet.name?.startsWith("SN{") ? undefined : subnet.name;
  const sourceSymbol = subnet.symbol?.startsWith("SN{") ? undefined : subnet.symbol;
  const meta = CURATED_METADATA[subnet.netuid] ?? buildFallbackMeta(subnet.netuid, sourceName, sourceSymbol);
  return {
    ...subnet,
    name: subnet.name && !subnet.name.includes("{") ? subnet.name : meta.name,
    symbol: subnet.symbol && !subnet.symbol.includes("{") ? subnet.symbol : meta.symbol,
    description: subnet.description || meta.description,
    summary: subnet.summary ?? meta.summary,
    thesis: subnet.thesis ?? meta.thesis,
    useCases: subnet.useCases ?? meta.useCases,
    links: subnet.links ?? meta.links,
    category: subnet.category || meta.category,
  };
}

export const internalSubnetProvider: SubnetProvider = {
  name: "internal",
  async fetch(netuidFilter?: number): Promise<SubnetProviderResult | null> {
    try {
      const raw = readFileSync(SUBTENSOR_SNAPSHOT_PATH, "utf-8");
      const payload: SubtensorPayload = JSON.parse(raw);
      if (!Array.isArray(payload.subnets) || payload.subnets.length === 0) return null;

      let ageMs: number;
      if (payload._meta?.fetched_at) ageMs = Date.now() - new Date(payload._meta.fetched_at).getTime();
      else ageMs = Date.now() - statSync(SUBTENSOR_SNAPSHOT_PATH).mtimeMs;

      const ageSeconds = Math.round(ageMs / 1000);
      const isStale = ageMs > SNAPSHOT_MAX_AGE_HOURS * 60 * 60 * 1000;

      const subnets = (netuidFilter != null
        ? payload.subnets.filter((s) => s.netuid === netuidFilter)
        : payload.subnets).map(hydrateSubnetMetadata);

      if (subnets.length === 0) return null;

      return {
        subnets,
        source: isStale ? "subtensor-snapshot-stale" : "subtensor-snapshot",
        fallbackUsed: isStale,
        stale: isStale,
        snapshotAgeSec: ageSeconds,
        note: isStale ? "Serving stale internal subnet snapshot." : undefined,
      };
    } catch {
      return null;
    }
  },
};
