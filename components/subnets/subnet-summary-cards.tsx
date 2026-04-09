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
    const totalValue = subnets.reduce((sum, subnet) => sum + (subnet.marketCap ?? 0), 0);
    const totalStake = subnets.reduce((sum, subnet) => sum + (subnet.liquidity ?? 0), 0);
    const totalVolume = subnets.reduce((sum, subnet) => sum + (subnet.volume24h ?? 0), 0);
    const activeSubnets = subnets.filter((subnet) => subnet.netuid !== 0).length;
    const avgYield = subnets.length > 0
      ? subnets.reduce((sum, subnet) => sum + (subnet.yield ?? 0), 0) / subnets.length
      : 0;
    const avgScore = subnets.length > 0
      ? subnets.reduce((sum, subnet) => sum + (subnet.score ?? 0), 0) / subnets.length
      : 0;

    return { totalValue, totalStake, totalVolume, activeSubnets, avgYield, avgScore };
  }, [subnets]);

  const Card = ({
    title,
    total,
    helper,
    detail,
  }: {
    title: string;
    total: number;
    helper: string;
    detail: string;
  }) => (
    <div className="glass rounded-xl p-4 flex flex-col gap-3">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {title}
      </div>
      <div className="text-lg font-bold text-white font-mono">
        {formatCurrencyValue(total, currency, taoUsdRate)}
      </div>
      <div className="text-[11px] text-slate-400">{helper}</div>
      <div className="text-[10px] text-slate-600">{detail}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card
        title="Displayed Market Value"
        total={stats.totalValue}
        helper={`${stats.activeSubnets} active subnets in current results`}
        detail={`Average score ${stats.avgScore.toFixed(2)}`}
      />
      <Card
        title="Displayed Liquidity"
        total={stats.totalStake}
        helper="Sum of liquidity across the displayed subnet set"
        detail={`Average yield ${stats.avgYield.toFixed(2)}%`}
      />
      <Card
        title="Displayed 24H Volume"
        total={stats.totalVolume}
        helper="Combined 24-hour volume for the displayed subnet set"
        detail="No root/alpha split shown unless root data is actually present"
      />
    </div>
  );
}
