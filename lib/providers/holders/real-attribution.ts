import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildHolderIntelFromRealAttribution } from "@/lib/api/holders-real-snapshot.mjs";
import { getSubnets } from "@/lib/api/subnets";
import type { HolderIntelSnapshot } from "@/lib/types/holders";
import type { HolderProvider, HolderProviderResult } from "./types";

interface AttributionSnapshotFile {
  positions?: Array<{ coldkey: string; hotkey: string; netuid: number; stakeTao: number }>;
  fetchedAt?: string;
  source?: string;
  notes?: string;
}

function readAttributionSnapshot(): AttributionSnapshotFile | null {
  const path = join(process.cwd(), "public", "data", "holder-attribution.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as AttributionSnapshotFile;
  } catch {
    return null;
  }
}

export const realAttributionHolderProvider: HolderProvider = {
  name: "real-attribution",
  async fetch(): Promise<HolderProviderResult | null> {
    const snapshot = readAttributionSnapshot();
    if (!snapshot || !Array.isArray(snapshot.positions) || snapshot.positions.length === 0) return null;

    const subnets = getSubnets()
      .filter((s) => s.netuid !== 0)
      .sort((a, b) => (b.liquidity + (b.volume24h ?? 0)) - (a.liquidity + (a.volume24h ?? 0)))
      .slice(0, 18);

    const data = buildHolderIntelFromRealAttribution(subnets, snapshot) as HolderIntelSnapshot;
    return {
      data,
      source: data.source,
      generatedAt: snapshot.fetchedAt ?? data.generatedAt,
      fallbackUsed: data.source !== "chain-partial",
      note: snapshot.notes,
    };
  },
};
