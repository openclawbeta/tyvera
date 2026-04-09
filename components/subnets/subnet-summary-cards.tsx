"use client";

import { useMemo } from "react";
import type { SubnetDetailModel } from "@/lib/types/subnets";
import type { CurrencyMode } from "@/lib/currency";
import { formatCurrencyValue } from "@/lib/currency";

interface SubnetSummaryCardsProps {
  subnets: SubnetDetailModel[];
  currency: CurrencyMode;
  taoUsdRate: number | null;
}

export function SubnetSummaryCards({ subnets, currency, taoUsdRate }: SubnetSummaryCardsProps) {
  const stats = useMemo(() => {
    let rootValue = 0;
    let alphaValue = 0;
    let rootStake = 0;
    let alphaStake = 0;
    let rootVolume = 0;
    let alphaVolume = 0;

    subnets.forEach((subnet) => {
      const isRoot = subnet.netuid === 0;
      const value = subnet.marketCap ?? 0;
      const stake = subnet.liquidity ?? 0;
      const volume = subnet.volume24h ?? 0;

      if (isRoot) {
        rootValue += value;
        rootStake += stake;
        rootVolume += volume;
      } else {
        alphaValue += value;
        alphaStake += stake;
        alphaVolume += volume;
      }
    });

    return {
      totalValue: rootValue + alphaValue,
      rootValue,
      alphaValue,
      rootValuePct: (rootValue / (rootValue + alphaValue)) * 100 || 0,
      totalStake: rootStake + alphaStake,
      rootStake,
      alphaStake,
      rootStakePct: (rootStake / (rootStake + alphaStake)) * 100 || 0,
      totalVolume: rootVolume + alphaVolume,
      rootVolume,
      alphaVolume,
      rootVolumePct: (rootVolume / (rootVolume + alphaVolume)) * 100 || 0,
    };
  }, [subnets]);

  const Card = ({
    title,
    total,
    rootLabel,
    alphaLabel,
    rootValue,
    alphaValue,
    rootPct,
  }: {
    title: string;
    total: number;
    rootLabel: string;
    alphaLabel: string;
    rootValue: number;
    alphaValue: number;
    rootPct: number;
  }) => (
    <div className="glass rounded-xl p-4 flex flex-col gap-3">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {title}
      </div>
      <div className="text-lg font-bold text-white font-mono">
        {formatCurrencyValue(total, currency, taoUsdRate)}
      </div>

      {/* Progress bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.05]">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${rootPct}%` }}
        />
        <div className="flex-1 bg-red-500/40" />
      </div>

      {/* Breakdown */}
      <div className="flex items-center gap-4 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <div>
            <span className="text-slate-300 font-mono">{formatCurrencyValue(rootValue, currency, taoUsdRate)}</span>
            <span className="text-slate-600"> {rootLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <div>
            <span className="text-slate-300 font-mono">{formatCurrencyValue(alphaValue, currency, taoUsdRate)}</span>
            <span className="text-slate-600"> {alphaLabel}</span>
          </div>
        </div>
        <div className="ml-auto text-slate-500">
          {rootPct.toFixed(0)}% Root
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card
        title="Subnets Value"
        total={stats.totalValue}
        rootLabel="Root"
        alphaLabel="Alpha"
        rootValue={stats.rootValue}
        alphaValue={stats.alphaValue}
        rootPct={stats.rootValuePct}
      />
      <Card
        title="Total Stake Split"
        total={stats.totalStake}
        rootLabel="Root"
        alphaLabel="Alpha"
        rootValue={stats.rootStake}
        alphaValue={stats.alphaStake}
        rootPct={stats.rootStakePct}
      />
      <Card
        title="Total Volume (24H)"
        total={stats.totalVolume}
        rootLabel="Root"
        alphaLabel="Alpha"
        rootValue={stats.rootVolume}
        alphaValue={stats.alphaVolume}
        rootPct={stats.rootVolumePct}
      />
    </div>
  );
}
