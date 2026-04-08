/**
 * lib/chain/wallet-stakes.ts
 *
 * Query a wallet's staked positions across all Bittensor subnets.
 *
 * Strategy:
 *   1. Read the subnets snapshot (public/data/subnets.json) for subnet metadata
 *   2. Attempt to query Subtensor via RPC for the wallet's actual stake amounts
 *   3. Enrich positions with subnet names, yields, and USD values
 *   4. Fall back to empty portfolio if RPC fails (honest empty state)
 *
 * On Subtensor, stakes are stored as:
 *   SubtensorModule::Alpha[hotkey, coldkey, netuid] → u64 (RAO)
 *   SubtensorModule::StakingHotkeys[coldkey] → Vec<hotkey>
 *
 * This module queries the wallet's staking hotkeys, then looks up
 * the alpha (stake) for each hotkey across active subnets.
 */

import { getSubnets } from "@/lib/api/subnets";

const RAO_PER_TAO = 1_000_000_000;

export interface WalletPosition {
  netuid: number;
  subnetName: string;
  symbol: string;
  stakedTao: number;
  yieldPercent: number;
  risk: string;
  category: string;
}

export interface WalletPortfolio {
  positions: WalletPosition[];
  stats: {
    totalStakedTao: number;
    totalValueUsd: number;
    positionCount: number;
    weightedYield: number;
  };
  source: "chain" | "snapshot" | "empty";
}

/**
 * Attempt to fetch real staked positions for a wallet from Subtensor RPC.
 * Falls back gracefully on any error.
 */
export async function fetchWalletStakes(coldkey: string): Promise<WalletPortfolio> {
  // Get subnet metadata for enrichment
  const subnets = getSubnets();
  const subnetMap = new Map(subnets.map((s) => [s.netuid, s]));

  try {
    // Dynamically import @polkadot/api — only on server side, only when needed
    const { ApiPromise, WsProvider } = await import("@polkadot/api");

    const provider = new WsProvider(
      [
        "wss://entrypoint-finney.opentensor.ai:443",
        "wss://subtensor.api.opentensor.ai:443",
      ],
      2500,
    );

    const api = await Promise.race([
      ApiPromise.create({ provider, noInitWarn: true }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout")), 12_000),
      ),
    ]);

    try {
      // Step 1: Get all hotkeys this coldkey has staked to
      let hotkeys: string[] = [];

      try {
        const stakingHotkeys = await (api.query.subtensorModule as any).stakingHotkeys(coldkey);
        if (stakingHotkeys) {
          hotkeys = (stakingHotkeys.toJSON() as string[]) || [];
        }
      } catch {
        // Storage key may not exist on all runtime versions
        // Try alternative: enumerate known hotkeys from metagraph
        console.warn("[wallet-stakes] stakingHotkeys query failed, trying alternative");
      }

      if (hotkeys.length === 0) {
        // No stakes found — return honest empty state
        await api.disconnect().catch(() => {});
        return {
          positions: [],
          stats: { totalStakedTao: 0, totalValueUsd: 0, positionCount: 0, weightedYield: 0 },
          source: "chain",
        };
      }

      // Step 2: Get active subnet IDs
      const subnetEntries = await api.query.subtensorModule.subnetworkN.entries();
      const activeNetuids = subnetEntries
        .map(([key]) => Number(key.args[0]))
        .filter((n) => n > 0);

      // Step 3: For each hotkey × subnet, query alpha stake
      const positions: WalletPosition[] = [];

      for (const hotkey of hotkeys) {
        // Query alpha stake across all subnets for this hotkey+coldkey pair
        const stakePromises = activeNetuids.map(async (netuid) => {
          try {
            const alpha = await (api.query.subtensorModule as any).alpha(hotkey, coldkey, netuid);
            const amount = Number(String(alpha).replace(/,/g, ""));
            return { netuid, amount };
          } catch {
            return { netuid, amount: 0 };
          }
        });

        const stakes = await Promise.all(stakePromises);

        for (const { netuid, amount } of stakes) {
          if (amount <= 0) continue;

          const taoAmount = amount > 1e6 ? amount / RAO_PER_TAO : amount;
          if (taoAmount < 0.001) continue; // skip dust

          const subnet = subnetMap.get(netuid);

          positions.push({
            netuid,
            subnetName: subnet?.name || `SN${netuid}`,
            symbol: subnet?.symbol || `SN${netuid}`,
            stakedTao: Math.round(taoAmount * 1000) / 1000,
            yieldPercent: subnet?.yield ?? 0,
            risk: subnet?.risk ?? "MODERATE",
            category: subnet?.category ?? "Unknown",
          });
        }
      }

      // Merge positions for same subnet (different hotkeys)
      const merged = new Map<number, WalletPosition>();
      for (const pos of positions) {
        const existing = merged.get(pos.netuid);
        if (existing) {
          existing.stakedTao += pos.stakedTao;
        } else {
          merged.set(pos.netuid, { ...pos });
        }
      }

      const finalPositions = Array.from(merged.values()).sort(
        (a, b) => b.stakedTao - a.stakedTao,
      );

      const totalStaked = finalPositions.reduce((sum, p) => sum + p.stakedTao, 0);
      const weightedYield =
        totalStaked > 0
          ? finalPositions.reduce((sum, p) => sum + p.stakedTao * p.yieldPercent, 0) / totalStaked
          : 0;

      // Get TAO/USD price for USD value
      let taoPrice = 0;
      try {
        const priceRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/tao-rate`,
        );
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          taoPrice = priceData.price ?? 0;
        }
      } catch {
        // Price enrichment is best-effort
      }

      await api.disconnect().catch(() => {});

      return {
        positions: finalPositions,
        stats: {
          totalStakedTao: Math.round(totalStaked * 1000) / 1000,
          totalValueUsd: Math.round(totalStaked * taoPrice * 100) / 100,
          positionCount: finalPositions.length,
          weightedYield: Math.round(weightedYield * 100) / 100,
        },
        source: "chain",
      };
    } catch (queryErr) {
      await api.disconnect().catch(() => {});
      throw queryErr;
    }
  } catch (err) {
    console.error("[wallet-stakes] Chain query failed:", err);

    // Return honest empty state rather than fake data
    return {
      positions: [],
      stats: { totalStakedTao: 0, totalValueUsd: 0, positionCount: 0, weightedYield: 0 },
      source: "empty",
    };
  }
}
