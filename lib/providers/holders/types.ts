import type { HolderIntelSnapshot } from "@/lib/types/holders";

export interface HolderProviderResult {
  data: HolderIntelSnapshot;
  source: string;
  generatedAt: string | null;
  fallbackUsed: boolean;
  stale?: boolean;
  note?: string;
}

export interface HolderProvider {
  name: string;
  fetch(): Promise<HolderProviderResult | null>;
}
