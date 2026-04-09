import type { SubnetDetailModel } from "@/lib/types/subnets";

export interface SubnetProviderResult {
  subnets: SubnetDetailModel[];
  source: string;
  fallbackUsed: boolean;
  stale?: boolean;
  snapshotAgeSec?: number | null;
  note?: string;
}

export interface SubnetProvider {
  name: string;
  fetch(netuidFilter?: number): Promise<SubnetProviderResult | null>;
}
