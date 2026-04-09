export interface HolderAllocation {
  netuid: number;
  subnetName: string;
  symbol: string;
  amountTao: number;
  percentage: number;
  kind: "root" | "subnet";
}

export interface HolderMovement {
  type: "root_to_subnet" | "subnet_to_root" | "subnet_rotation" | "accumulation" | "distribution";
  summary: string;
  amountTao: number;
  timeframe: "24h" | "7d" | "30d";
}

export interface HolderProfile {
  rank: number;
  wallet: string;
  label: string;
  totalTao: number;
  rootStakedTao: number;
  subnetStakedTao: number;
  dominantSubnetNetuid?: number;
  dominantSubnetName?: string;
  allocationMix: HolderAllocation[];
  recentMoves: HolderMovement[];
  strategyTag: "root-heavy" | "subnet-heavy" | "rotating" | "balanced";
}

export interface HolderSubnetFlow {
  netuid: number;
  subnetName: string;
  inflowTao: number;
  outflowTao: number;
  netflowTao: number;
  holdersIncreasing: number;
  holdersDecreasing: number;
}

export interface HolderIntelSnapshot {
  generatedAt: string;
  source: "modeled-demo";
  topHolders: HolderProfile[];
  subnetFlows: HolderSubnetFlow[];
  summary: {
    totalTrackedTao: number;
    rootStakedTao: number;
    subnetStakedTao: number;
    rootSharePct: number;
    subnetSharePct: number;
    topRotations: string[];
  };
}
