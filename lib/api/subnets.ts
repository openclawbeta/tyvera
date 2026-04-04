import { mapSubnetDtoToCardModel, mapSubnetDetailDto, mapSubnetHistoryDto } from "@/lib/adapters/subnets";
import { SUBNETS } from "@/lib/mock-data/subnets";

const toLabel = (input: string) => {
  const date = new Date(input);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const buildSeries = (values: number[]) =>
  values.map((value, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (values.length - 1 - index));
    return { label: toLabel(date.toISOString()), value };
  });

export function getSubnets() {
  // TODO: replace stub with real backend call.
  return {
    meta: { total: SUBNETS.length, source: "mock", updatedAt: new Date().toISOString() },
    items: SUBNETS.map(mapSubnetDtoToCardModel),
  };
}

export function getSubnetByNetuid(netuid: number) {
  // TODO: replace stub with real backend call.
  const subnet = SUBNETS.find((item) => item.netuid === netuid);
  if (!subnet) throw new Error(`Subnet ${netuid} not found`);
  return mapSubnetDetailDto(subnet);
}

export function getSubnetHistory(netuid: number, _range = "30d") {
  // TODO: replace stub with real backend call.
  const subnet = SUBNETS.find((item) => item.netuid === netuid);
  if (!subnet) throw new Error(`Subnet ${netuid} not found`);

  const momentum = subnet.momentum;
  const inflowSeries = momentum.map((_, index) => Math.round(subnet.inflow * (0.7 + index / (momentum.length * 3))));
  const liquiditySeries = momentum.map((_, index) => Math.round(subnet.liquidity * (0.94 + index * 0.004)));
  const emissionsSeries = momentum.map((_, index) => Number((subnet.emissions * (0.96 + index * 0.003)).toFixed(2)));

  return mapSubnetHistoryDto({
    series: {
      yield: buildSeries(momentum),
      inflow: buildSeries(inflowSeries),
      liquidity: buildSeries(liquiditySeries),
      emissions: buildSeries(emissionsSeries),
    },
  });
}
