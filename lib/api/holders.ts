import { getSubnets } from "@/lib/api/subnets";
import type { HolderIntelSnapshot, HolderProfile, HolderSubnetFlow, HolderAllocation, HolderMovement } from "@/lib/types/holders";

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 99991) * 10000;
  return x - Math.floor(x);
}

function shortWallet(rank: number): string {
  const base = `5F${(100000 + rank * 7919).toString(16).padStart(10, "0")}`;
  return `${base}...${(9999 - rank).toString().padStart(4, "0")}`;
}

export function getHolderIntel(): HolderIntelSnapshot {
  const subnets = getSubnets()
    .filter((s) => s.netuid !== 0)
    .sort((a, b) => (b.liquidity + (b.volume24h ?? 0)) - (a.liquidity + (a.volume24h ?? 0)))
    .slice(0, 18);

  const topHolders: HolderProfile[] = Array.from({ length: 100 }).map((_, i) => {
    const rank = i + 1;
    const totalTao = Math.round((45000 / Math.sqrt(rank)) + seededRandom(rank) * 2500);
    const rootBias = 0.25 + seededRandom(rank * 3) * 0.55;
    const rootStakedTao = Math.round(totalTao * rootBias);
    const subnetStakedTao = totalTao - rootStakedTao;

    const chosen = subnets
      .map((subnet, idx) => ({ subnet, weight: seededRandom(rank * 101 + idx) }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);

    const splitWeights = chosen.map((c, idx) => c.weight + (idx === 0 ? 0.5 : 0.1));
    const totalWeight = splitWeights.reduce((a, b) => a + b, 0);

    const allocationMix: HolderAllocation[] = [
      {
        netuid: 0,
        subnetName: "Root Network",
        symbol: "TAO",
        amountTao: rootStakedTao,
        percentage: +(rootStakedTao / totalTao * 100).toFixed(1),
        kind: "root",
      },
      ...chosen.map((choice, idx) => {
        const amountTao = Math.round(subnetStakedTao * (splitWeights[idx] / totalWeight));
        return {
          netuid: choice.subnet.netuid,
          subnetName: choice.subnet.name,
          symbol: choice.subnet.symbol,
          amountTao,
          percentage: +(amountTao / totalTao * 100).toFixed(1),
          kind: "subnet" as const,
        };
      }),
    ].sort((a, b) => b.amountTao - a.amountTao);

    const dominant = allocationMix.find((item) => item.kind === "subnet");
    const rotationAmount = Math.round(totalTao * (0.01 + seededRandom(rank * 7) * 0.05));
    const recentMoves: HolderMovement[] = [
      {
        type: rootStakedTao > subnetStakedTao ? "root_to_subnet" : "subnet_rotation",
        summary: rootStakedTao > subnetStakedTao
          ? `Trimmed root stake and added to ${dominant?.subnetName ?? "top subnet"}`
          : `Rotated exposure across ${chosen[0]?.subnet.name ?? "higher-beta subnets"}`,
        amountTao: rotationAmount,
        timeframe: "7d",
      },
      {
        type: seededRandom(rank * 11) > 0.5 ? "accumulation" : "distribution",
        summary: seededRandom(rank * 11) > 0.5
          ? `Net accumulated TAO into ${dominant?.subnetName ?? "current leaders"}`
          : `Reduced exposure after recent strength in ${dominant?.subnetName ?? "largest position"}`,
        amountTao: Math.round(rotationAmount * 0.6),
        timeframe: "30d",
      },
    ];

    const strategyTag = rootStakedTao / totalTao > 0.65
      ? "root-heavy"
      : subnetStakedTao / totalTao > 0.75
      ? "subnet-heavy"
      : seededRandom(rank * 13) > 0.55
      ? "rotating"
      : "balanced";

    return {
      rank,
      wallet: shortWallet(rank),
      label: `Tracked Wallet ${rank}`,
      totalTao,
      rootStakedTao,
      subnetStakedTao,
      dominantSubnetNetuid: dominant?.netuid,
      dominantSubnetName: dominant?.subnetName,
      allocationMix,
      recentMoves,
      strategyTag,
    };
  });

  const subnetFlows: HolderSubnetFlow[] = subnets.slice(0, 8).map((subnet, idx) => {
    const inflowTao = Math.round((1200 + seededRandom(idx + 1) * 4000) * (1 + (subnet.change1w ?? 0) / 100));
    const outflowTao = Math.round(900 + seededRandom(idx + 101) * 3200);
    return {
      netuid: subnet.netuid,
      subnetName: subnet.name,
      inflowTao,
      outflowTao,
      netflowTao: inflowTao - outflowTao,
      holdersIncreasing: Math.round(8 + seededRandom(idx + 201) * 22),
      holdersDecreasing: Math.round(5 + seededRandom(idx + 301) * 16),
    };
  }).sort((a, b) => b.netflowTao - a.netflowTao);

  const totalTrackedTao = topHolders.reduce((sum, holder) => sum + holder.totalTao, 0);
  const rootStakedTao = topHolders.reduce((sum, holder) => sum + holder.rootStakedTao, 0);
  const subnetStakedTao = topHolders.reduce((sum, holder) => sum + holder.subnetStakedTao, 0);

  return {
    generatedAt: new Date().toISOString(),
    source: "modeled-demo",
    topHolders,
    subnetFlows,
    summary: {
      totalTrackedTao,
      rootStakedTao,
      subnetStakedTao,
      rootSharePct: +(rootStakedTao / totalTrackedTao * 100).toFixed(1),
      subnetSharePct: +(subnetStakedTao / totalTrackedTao * 100).toFixed(1),
      topRotations: subnetFlows.slice(0, 3).map((flow) => `${flow.subnetName}: ${flow.netflowTao >= 0 ? "+" : ""}${flow.netflowTao} τ`),
    },
  };
}
