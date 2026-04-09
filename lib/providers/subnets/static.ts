import type { SubnetProvider, SubnetProviderResult } from "./types";
import { getSubnets, getSubnetByNetuid } from "@/lib/api/subnets";

export const staticSubnetProvider: SubnetProvider = {
  name: "static",
  async fetch(netuidFilter?: number): Promise<SubnetProviderResult | null> {
    const subnets = netuidFilter != null
      ? [getSubnetByNetuid(netuidFilter)].filter(Boolean)
      : getSubnets();

    if (!subnets || subnets.length === 0) return null;

    return {
      subnets,
      source: "static-snapshot",
      fallbackUsed: true,
      stale: false,
      snapshotAgeSec: null,
      note: "Static subnet fallback dataset.",
    };
  },
};
