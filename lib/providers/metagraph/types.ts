export interface MetagraphNeuron {
  uid: number;
  hotkey: string;
  type: "validator" | "miner";
  stake: number;
  trust: number;
  consensus: number;
  incentive: number;
  dividends: number;
  emissionPerDay: number;
}

export interface MetagraphProviderResult {
  neurons: MetagraphNeuron[];
  source: string;
  fallbackUsed: boolean;
  stale?: boolean;
  note?: string;
  blockHeight?: number;
}

export interface MetagraphProvider {
  name: string;
  fetch(netuid: number): Promise<MetagraphProviderResult | null>;
}
