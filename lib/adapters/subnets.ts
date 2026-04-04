import type { Subnet as MockSubnet } from "@/lib/mock-data/subnets";
import type { SubnetCardModel, SubnetDetailModel, SubnetHistoryModel, TimeSeriesPoint } from "@/lib/types/subnets";

interface SubnetHistoryDto {
  series?: {
    yield?: Array<{ label?: string; ts?: string; value: number }>;
    inflow?: Array<{ label?: string; ts?: string; value: number }>;
    liquidity?: Array<{ label?: string; ts?: string; value: number }>;
    emissions?: Array<{ label?: string; ts?: string; value: number }>;
  };
}

type SubnetDto = MockSubnet & Partial<Pick<SubnetCardModel, "momentumDirection">>;

export function mapSubnetDtoToCardModel(dto: SubnetDto): SubnetCardModel {
  return {
    id: String(dto.id ?? dto.netuid),
    netuid: dto.netuid,
    name: dto.name,
    symbol: dto.symbol ?? `SN${dto.netuid}`,
    score: dto.score,
    yield: dto.yield,
    yieldDelta7d: dto.yieldDelta7d,
    inflow: dto.inflow,
    inflowPct: dto.inflowPct,
    risk: dto.risk,
    liquidity: dto.liquidity,
    stakers: dto.stakers,
    emissions: dto.emissions,
    validatorTake: dto.validatorTake,
    description: dto.description ?? "",
    category: dto.category ?? "Unknown",
    momentum: dto.momentum ?? [],
    momentumDirection: dto.momentumDirection,
    isWatched: dto.isWatched ?? false,
    breakeven: dto.breakeven,
    age: dto.age,
  };
}

export function mapSubnetDetailDto(dto: SubnetDto & Partial<SubnetDetailModel>): SubnetDetailModel {
  return {
    ...mapSubnetDtoToCardModel(dto),
    validatorConcentration: dto.validatorConcentration,
    volatility: dto.volatility,
    confidence: dto.confidence,
  };
}

export function mapSubnetHistoryDto(dto: SubnetHistoryDto): SubnetHistoryModel {
  const mapSeries = (arr: Array<{ label?: string; ts?: string; value: number }> = []): TimeSeriesPoint[] =>
    arr.map((p) => ({
      label: p.label ?? p.ts ?? "",
      value: p.value,
    }));

  return {
    yield: mapSeries(dto.series?.yield),
    inflow: mapSeries(dto.series?.inflow),
    liquidity: mapSeries(dto.series?.liquidity),
    emissions: mapSeries(dto.series?.emissions),
  };
}
