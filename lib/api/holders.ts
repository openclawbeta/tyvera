import { getSubnets } from "@/lib/api/subnets";
import type { HolderIntelSnapshot } from "@/lib/types/holders";
import { buildHolderIntelSnapshot } from "@/lib/api/holders-snapshot-data.mjs";

export function getHolderIntel(): HolderIntelSnapshot {
  const subnets = getSubnets()
    .filter((s) => s.netuid !== 0)
    .sort((a, b) => (b.liquidity + (b.volume24h ?? 0)) - (a.liquidity + (a.volume24h ?? 0)))
    .slice(0, 18);

  return buildHolderIntelSnapshot(subnets) as HolderIntelSnapshot;
}
