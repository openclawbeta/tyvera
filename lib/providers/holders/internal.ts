import { readHolderSnapshot } from "@/lib/api/holders-snapshot";
import type { HolderProvider, HolderProviderResult } from "./types";

export const internalHolderProvider: HolderProvider = {
  name: "internal",
  async fetch(): Promise<HolderProviderResult | null> {
    const { data, dataSource, generatedAt } = readHolderSnapshot();
    if (!data || !Array.isArray(data.topHolders) || data.topHolders.length === 0) return null;

    return {
      data,
      source: dataSource,
      generatedAt,
      fallbackUsed: dataSource !== "holder-snapshot",
      note: dataSource !== "holder-snapshot"
        ? "Internal holder snapshot unavailable; using modeled fallback path."
        : undefined,
    };
  },
};
