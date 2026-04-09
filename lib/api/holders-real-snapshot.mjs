import { buildHolderIntelSnapshot } from "./holders-snapshot-data.mjs";

export function buildHolderIntelFromRealAttribution(subnets, attributionSnapshot) {
  const subnetMap = new Map(subnets.map((subnet) => [subnet.netuid, subnet]));
  const grouped = new Map();

  for (const position of attributionSnapshot.positions ?? []) {
    const existing = grouped.get(position.coldkey) ?? {
      coldkey: position.coldkey,
      positions: [],
      totalTao: 0,
      rootStakedTao: 0,
      subnetStakedTao: 0,
    };

    existing.positions.push(position);
    existing.totalTao += position.stakeTao;
    if (position.netuid === 0) existing.rootStakedTao += position.stakeTao;
    else existing.subnetStakedTao += position.stakeTao;
    grouped.set(position.coldkey, existing);
  }

  const wallets = Array.from(grouped.values())
    .sort((a, b) => b.totalTao - a.totalTao)
    .slice(0, 100);

  if (wallets.length === 0) {
    const modeled = buildHolderIntelSnapshot(subnets);
    return {
      ...modeled,
      source: "modeled-demo",
    };
  }

  const topHolders = wallets.map((wallet, idx) => {
    const allocations = wallet.positions
      .map((position) => {
        const subnet = subnetMap.get(position.netuid);
        return {
          netuid: position.netuid,
          subnetName: position.netuid === 0 ? "Root Network" : (subnet?.name ?? `SN${position.netuid}`),
          symbol: position.netuid === 0 ? "TAO" : (subnet?.symbol ?? `SN${position.netuid}`),
          amountTao: Math.round(position.stakeTao * 1000) / 1000,
          percentage: +((position.stakeTao / wallet.totalTao) * 100).toFixed(1),
          kind: position.netuid === 0 ? "root" : "subnet",
        };
      })
      .sort((a, b) => b.amountTao - a.amountTao);

    const dominantSubnet = allocations.find((a) => a.kind === "subnet");
    const strategyTag = wallet.rootStakedTao / wallet.totalTao > 0.65
      ? "root-heavy"
      : wallet.subnetStakedTao / wallet.totalTao > 0.75
      ? "subnet-heavy"
      : allocations.length > 3
      ? "rotating"
      : "balanced";

    return {
      rank: idx + 1,
      wallet: `${wallet.coldkey.slice(0, 10)}...${wallet.coldkey.slice(-4)}`,
      label: `Attributed Wallet ${idx + 1}`,
      totalTao: Math.round(wallet.totalTao * 1000) / 1000,
      rootStakedTao: Math.round(wallet.rootStakedTao * 1000) / 1000,
      subnetStakedTao: Math.round(wallet.subnetStakedTao * 1000) / 1000,
      dominantSubnetNetuid: dominantSubnet?.netuid,
      dominantSubnetName: dominantSubnet?.subnetName,
      allocationMix: allocations,
      recentMoves: [
        {
          type: wallet.rootStakedTao > wallet.subnetStakedTao ? "root_to_subnet" : "subnet_rotation",
          summary: dominantSubnet
            ? `Current largest non-root exposure is ${dominantSubnet.subnetName}`
            : "Currently concentrated in root staking",
          amountTao: Math.round((dominantSubnet?.amountTao ?? wallet.rootStakedTao) * 100) / 100,
          timeframe: "7d",
        },
      ],
      strategyTag,
    };
  });

  const subnetFlowMap = new Map();
  for (const wallet of wallets) {
    for (const position of wallet.positions.filter((p) => p.netuid !== 0)) {
      const subnet = subnetMap.get(position.netuid);
      const existing = subnetFlowMap.get(position.netuid) ?? {
        netuid: position.netuid,
        subnetName: subnet?.name ?? `SN${position.netuid}`,
        inflowTao: 0,
        outflowTao: 0,
        netflowTao: 0,
        holdersIncreasing: 0,
        holdersDecreasing: 0,
      };
      existing.inflowTao += position.stakeTao;
      existing.netflowTao += position.stakeTao;
      existing.holdersIncreasing += 1;
      subnetFlowMap.set(position.netuid, existing);
    }
  }

  const subnetFlows = Array.from(subnetFlowMap.values())
    .map((flow) => ({
      ...flow,
      inflowTao: Math.round(flow.inflowTao * 1000) / 1000,
      outflowTao: Math.round(flow.outflowTao * 1000) / 1000,
      netflowTao: Math.round(flow.netflowTao * 1000) / 1000,
    }))
    .sort((a, b) => b.netflowTao - a.netflowTao)
    .slice(0, 12);

  const totalTrackedTao = topHolders.reduce((sum, holder) => sum + holder.totalTao, 0);
  const rootStakedTao = topHolders.reduce((sum, holder) => sum + holder.rootStakedTao, 0);
  const subnetStakedTao = topHolders.reduce((sum, holder) => sum + holder.subnetStakedTao, 0);

  return {
    generatedAt: new Date().toISOString(),
    source: "chain-partial",
    topHolders,
    subnetFlows,
    summary: {
      totalTrackedTao: Math.round(totalTrackedTao * 1000) / 1000,
      rootStakedTao: Math.round(rootStakedTao * 1000) / 1000,
      subnetStakedTao: Math.round(subnetStakedTao * 1000) / 1000,
      rootSharePct: totalTrackedTao > 0 ? +((rootStakedTao / totalTrackedTao) * 100).toFixed(1) : 0,
      subnetSharePct: totalTrackedTao > 0 ? +((subnetStakedTao / totalTrackedTao) * 100).toFixed(1) : 0,
      topRotations: subnetFlows.slice(0, 3).map((flow) => `${flow.subnetName}: +${flow.netflowTao} τ`),
    },
  };
}
