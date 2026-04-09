import fs from "node:fs/promises";
import path from "node:path";

const apiKey = process.env.TAO_APP_API_KEY;
if (!apiKey) {
  console.error("TAO_APP_API_KEY is required for build-holder-snapshot-from-tao-app");
  process.exit(1);
}

const headers = {
  Accept: "application/json",
  Authorization: `Bearer ${apiKey}`,
  "X-API-Key": apiKey,
};

const targetNetuids = [13, 8, 19, 64, 41, 27, 1, 18];
const subnetsPath = path.join(process.cwd(), "public", "data", "subnets.json");
const holdersPath = path.join(process.cwd(), "public", "data", "holders.json");

const subnetsRaw = await fs.readFile(subnetsPath, "utf-8");
const subnetsParsed = JSON.parse(subnetsRaw);
const subnetMap = new Map((subnetsParsed.subnets ?? []).map((subnet) => [subnet.netuid, subnet]));

const walletMap = new Map();
const subnetFlows = [];

for (const netuid of targetNetuids) {
  const response = await fetch(`https://api.tao.app/api/beta/analytics/subnets/holders?netuid=${netuid}`, {
    headers,
  });
  if (!response.ok) continue;
  const json = await response.json();
  const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  const subnet = subnetMap.get(netuid);

  let inflow = 0;
  let outflow = 0;
  let holdersIncreasing = 0;
  let holdersDecreasing = 0;

  for (const row of rows.slice(0, 20)) {
    const coldkey = row.coldkey;
    const tao = Number(row.total_tao_stake ?? 0);
    const existing = walletMap.get(coldkey) ?? {
      coldkey,
      totalTao: 0,
      subnetStakedTao: 0,
      allocations: [],
      recentMoves: [],
      label: `${String(row.identity ?? "Holder")} ${String(coldkey).slice(0, 6)}`,
    };

    existing.totalTao += tao;
    existing.subnetStakedTao += tao;
    existing.allocations.push({
      netuid,
      subnetName: subnet?.name ?? `SN${netuid}`,
      symbol: subnet?.symbol ?? `SN${netuid}`,
      amountTao: tao,
      percentage: Number(row.pct ?? 0),
      kind: "subnet",
    });

    const flow24h = Number(row.net_volume_tao_24h ?? 0);
    if (flow24h > 0) {
      inflow += flow24h;
      holdersIncreasing += 1;
    } else if (flow24h < 0) {
      outflow += Math.abs(flow24h);
      holdersDecreasing += 1;
    }

    walletMap.set(coldkey, existing);
  }

  subnetFlows.push({
    netuid,
    subnetName: subnet?.name ?? `SN${netuid}`,
    inflowTao: Math.round(inflow * 1000) / 1000,
    outflowTao: Math.round(outflow * 1000) / 1000,
    netflowTao: Math.round((inflow - outflow) * 1000) / 1000,
    holdersIncreasing,
    holdersDecreasing,
  });
}

const topHolders = Array.from(walletMap.values())
  .sort((a, b) => b.totalTao - a.totalTao)
  .slice(0, 100)
  .map((wallet, index) => {
    const total = wallet.totalTao || 1;
    const allocations = wallet.allocations
      .sort((a, b) => b.amountTao - a.amountTao)
      .map((allocation) => ({ ...allocation, percentage: +((allocation.amountTao / total) * 100).toFixed(1) }));
    const dominant = allocations[0];
    return {
      rank: index + 1,
      wallet: `${wallet.coldkey.slice(0, 10)}...${wallet.coldkey.slice(-4)}`,
      label: wallet.label,
      totalTao: Math.round(wallet.totalTao * 1000) / 1000,
      rootStakedTao: 0,
      subnetStakedTao: Math.round(wallet.subnetStakedTao * 1000) / 1000,
      dominantSubnetNetuid: dominant?.netuid,
      dominantSubnetName: dominant?.subnetName,
      allocationMix: allocations,
      recentMoves: wallet.recentMoves ?? [],
      strategyTag: (allocations.length > 2 ? "rotating" : "subnet-heavy"),
    };
  });

const totalTrackedTao = topHolders.reduce((sum, holder) => sum + holder.totalTao, 0);
const snapshot = {
  _meta: {
    generated_at: new Date().toISOString(),
    source: "tao-app",
    schema_version: 1,
    attribution: "Powered by TAO.app API",
  },
  generatedAt: new Date().toISOString(),
  source: "chain-partial",
  topHolders,
  subnetFlows: subnetFlows.sort((a, b) => b.netflowTao - a.netflowTao),
  summary: {
    totalTrackedTao,
    rootStakedTao: 0,
    subnetStakedTao: totalTrackedTao,
    rootSharePct: 0,
    subnetSharePct: 100,
    topRotations: subnetFlows.slice(0, 3).map((flow) => `${flow.subnetName}: ${flow.netflowTao >= 0 ? "+" : ""}${flow.netflowTao} τ`),
  },
};

await fs.writeFile(holdersPath, JSON.stringify(snapshot, null, 2));
console.log(`Wrote TAO.app-backed holder snapshot to ${holdersPath}`);
