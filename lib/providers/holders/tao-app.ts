import { getSubnets } from "@/lib/api/subnets";
import type { HolderIntelSnapshot } from "@/lib/types/holders";
import type { HolderProvider, HolderProviderResult } from "./types";

const TAO_APP_BASE = "https://api.tao.app";
const ATTRIBUTION = "Powered by TAO.app API";
const TARGET_NETUIDS = [13, 8, 19, 64, 41, 27, 1, 18];

interface TaoAppHolderEntry {
  coldkey: string;
  total_alpha_stake?: number;
  total_tao_stake?: number;
  pct?: number;
  identity?: string;
  net_volume_tao_24h?: number;
  net_volume_tao_7d?: number;
  net_volume_tao_1m?: number;
  [key: string]: unknown;
}

interface TaoAppExtrinsic {
  timestamp?: string;
  call_function?: string;
  call_module?: string;
  extrinsic_hash?: string;
  call_args?: Array<{ name?: string; value?: string | number }>;
}

let cached: HolderProviderResult | null = null;
let cachedAt = 0;
const TTL_MS = 30 * 60 * 1000;

export const taoAppHolderProvider: HolderProvider = {
  name: "tao-app",
  async fetch(): Promise<HolderProviderResult | null> {
    if (cached && Date.now() - cachedAt < TTL_MS) return cached;

    const apiKey = process.env.TAO_APP_API_KEY;
    if (!apiKey) return null;

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-API-Key": apiKey,
    };

    try {
      const responses = await Promise.all(
        TARGET_NETUIDS.map(async (netuid) => {
          const res = await fetch(`${TAO_APP_BASE}/api/beta/analytics/subnets/holders?netuid=${netuid}`, {
            headers,
            signal: AbortSignal.timeout(10000),
          });
          if (!res.ok) return { netuid, rows: [] as TaoAppHolderEntry[] };
          const json = await res.json();
          const rows: TaoAppHolderEntry[] = Array.isArray(json)
            ? json
            : Array.isArray(json?.data)
            ? json.data
            : [];
          return { netuid, rows };
        }),
      );

      const subnetMap = new Map(getSubnets().map((subnet) => [subnet.netuid, subnet]));
      const walletMap = new Map<string, {
        coldkey: string;
        totalTao: number;
        rootStakedTao: number;
        subnetStakedTao: number;
        allocations: Array<{ netuid: number; subnetName: string; symbol: string; amountTao: number; percentage: number; kind: "root" | "subnet" }>;
        recentMoves: Array<{ type: "root_to_subnet" | "subnet_to_root" | "subnet_rotation" | "accumulation" | "distribution"; summary: string; amountTao: number; timeframe: "24h" | "7d" | "30d" }>;
        label: string;
      }>();

      for (const { netuid, rows } of responses) {
        const subnet = subnetMap.get(netuid);
        for (const row of rows.slice(0, 15)) {
          const coldkey = row.coldkey;
          if (!coldkey) continue;
          const tao = Number(row.total_tao_stake ?? 0);
          const wallet = walletMap.get(coldkey) ?? {
            coldkey,
            totalTao: 0,
            rootStakedTao: 0,
            subnetStakedTao: 0,
            allocations: [],
            recentMoves: [],
            label: `${String(row.identity ?? "Holder")} ${coldkey.slice(0, 6)}`,
          };

          wallet.totalTao += tao;
          wallet.subnetStakedTao += tao;
          wallet.allocations.push({
            netuid,
            subnetName: subnet?.name ?? `SN${netuid}`,
            symbol: subnet?.symbol ?? `SN${netuid}`,
            amountTao: tao,
            percentage: Number(row.pct ?? 0),
            kind: "subnet",
          });

          const net24h = Number(row.net_volume_tao_24h ?? 0);
          const net7d = Number(row.net_volume_tao_7d ?? 0);
          if (net24h !== 0) {
            wallet.recentMoves.push({
              type: net24h >= 0 ? "accumulation" : "distribution",
              summary: `${net24h >= 0 ? "Accumulating" : "Distributing"} ${subnet?.name ?? `SN${netuid}`} over 24h`,
              amountTao: Math.abs(net24h),
              timeframe: "24h",
            });
          } else if (net7d !== 0) {
            wallet.recentMoves.push({
              type: net7d >= 0 ? "subnet_rotation" : "distribution",
              summary: `${net7d >= 0 ? "Rotating into" : "Rotating out of"} ${subnet?.name ?? `SN${netuid}`} over 7d`,
              amountTao: Math.abs(net7d),
              timeframe: "7d",
            });
          }

          walletMap.set(coldkey, wallet);
        }
      }

      const rankedWallets = Array.from(walletMap.values())
        .sort((a, b) => b.totalTao - a.totalTao)
        .slice(0, 100);

      const extrinsicResponses = await Promise.all(
        rankedWallets.slice(0, 20).map(async (wallet) => {
          try {
            const res = await fetch(`${TAO_APP_BASE}/api/beta/address/extrinsics?address=${wallet.coldkey}&page=1&page_size=3`, {
              headers,
              signal: AbortSignal.timeout(10000),
            });
            if (!res.ok) return { coldkey: wallet.coldkey, rows: [] as TaoAppExtrinsic[] };
            const json = await res.json();
            const rows: TaoAppExtrinsic[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
            return { coldkey: wallet.coldkey, rows };
          } catch {
            return { coldkey: wallet.coldkey, rows: [] as TaoAppExtrinsic[] };
          }
        })
      );

      const extrinsicMap = new Map(extrinsicResponses.map((item) => [item.coldkey, item.rows]));

      const topHolders = rankedWallets.map((wallet, index) => {
          const total = wallet.totalTao || 1;
          const allocations = wallet.allocations
            .sort((a, b) => b.amountTao - a.amountTao)
            .map((allocation) => ({
              ...allocation,
              percentage: +((allocation.amountTao / total) * 100).toFixed(1),
            }));
          const dominant = allocations[0];
          const extrinsics = extrinsicMap.get(wallet.coldkey) ?? [];
          const enrichedMoves = [
            ...wallet.recentMoves,
            ...extrinsics.slice(0, 2).map((xt) => ({
              type: "subnet_rotation" as const,
              summary: `${xt.call_module ?? "Chain"}.${xt.call_function ?? "extrinsic"} ${xt.timestamp ? `at ${xt.timestamp}` : "recently"}`,
              amountTao: 0,
              timeframe: "24h" as const,
            })),
          ];
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
            recentMoves: enrichedMoves.slice(0, 3),
            strategyTag: (allocations.length > 2 ? "rotating" : "subnet-heavy") as "rotating" | "subnet-heavy",
          };
        });

      if (topHolders.length === 0) return null;

      const subnetFlows = responses
        .map(({ netuid, rows }) => {
          const subnet = subnetMap.get(netuid);
          const inflowTao = rows.reduce((sum, row) => sum + Math.max(0, Number(row.net_volume_tao_24h ?? 0)), 0);
          const outflowTao = rows.reduce((sum, row) => sum + Math.max(0, -Number(row.net_volume_tao_24h ?? 0)), 0);
          return {
            netuid,
            subnetName: subnet?.name ?? `SN${netuid}`,
            inflowTao: Math.round(inflowTao * 1000) / 1000,
            outflowTao: Math.round(outflowTao * 1000) / 1000,
            netflowTao: Math.round((inflowTao - outflowTao) * 1000) / 1000,
            holdersIncreasing: rows.filter((row) => Number(row.net_volume_tao_24h ?? 0) > 0).length,
            holdersDecreasing: rows.filter((row) => Number(row.net_volume_tao_24h ?? 0) < 0).length,
          };
        })
        .sort((a, b) => b.netflowTao - a.netflowTao);

      const totalTrackedTao = topHolders.reduce((sum, holder) => sum + holder.totalTao, 0);
      const snapshot: HolderIntelSnapshot = {
        generatedAt: new Date().toISOString(),
        source: "chain-partial",
        topHolders,
        subnetFlows,
        summary: {
          totalTrackedTao,
          rootStakedTao: 0,
          subnetStakedTao: totalTrackedTao,
          rootSharePct: 0,
          subnetSharePct: 100,
          topRotations: subnetFlows.slice(0, 3).map((flow) => `${flow.subnetName}: ${flow.netflowTao >= 0 ? "+" : ""}${flow.netflowTao} τ`),
        },
      };

      cached = {
        data: snapshot,
        source: "tao-app",
        generatedAt: snapshot.generatedAt,
        fallbackUsed: false,
        note: ATTRIBUTION,
      };
      cachedAt = Date.now();
      return cached;
    } catch {
      return null;
    }
  },
};
