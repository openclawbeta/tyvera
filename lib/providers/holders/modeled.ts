import { getHolderIntel } from "@/lib/api/holders";
import type { HolderProvider, HolderProviderResult } from "./types";

export const modeledHolderProvider: HolderProvider = {
  name: "modeled",
  async fetch(): Promise<HolderProviderResult> {
    const data = getHolderIntel();
    return {
      data,
      source: "modeled-demo",
      generatedAt: data.generatedAt,
      fallbackUsed: true,
      note: "Modeled holder dataset fallback.",
    };
  },
};
