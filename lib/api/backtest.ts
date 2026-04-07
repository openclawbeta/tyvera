/**
 * lib/api/backtest.ts
 *
 * Backtesting engine for subnet staking strategies.
 * Generates deterministic historical yield data and simulates portfolio performance.
 */

import type { SubnetDetailModel } from "@/lib/types/subnets";
import type {
  BacktestConfig,
  BacktestPeriod,
  BacktestResult,
  DailySnapshot,
  StrategyType,
} from "@/lib/types/backtest";

/**
 * Generate historical daily yield data working backwards from current yield.
 *
 * Uses subnet's momentum array (14 points) as seed and extrapolates via
 * mean-reverting random walk. Deterministic based on netuid + day offset.
 *
 * @param subnet The subnet to generate history for
 * @param days   Number of days of history to generate
 */
export function generateHistoricalYields(
  subnet: SubnetDetailModel,
  days: number,
): number[] {
  const yields: number[] = [];
  const baseYield = subnet.yield;
  const momentum = subnet.momentum || [];

  // Seeded deterministic random walk based on netuid
  const seed = subnet.netuid * 12345;
  let state = seed;

  const pseudoRandom = () => {
    state = (state * 1103515245 + 12345) % (2 ** 31);
    return (state / (2 ** 31)) * 2 - 1; // -1 to 1
  };

  for (let i = 0; i < days; i++) {
    // Weight towards current yield with slight momentum influence
    const momentumWeight = i < momentum.length ? momentum[i] : baseYield;
    const mean = (baseYield * 0.7 + momentumWeight * 0.3);

    // Mean-reverting random walk: tend back towards mean
    const noise = pseudoRandom() * (baseYield * 0.01); // ±1% of yield
    const meanReversion = (mean - yields[i - 1] || mean) * 0.1; // 10% reversion

    const dailyYield = Math.max(0, yields[i - 1] || mean + meanReversion + noise);
    yields.push(dailyYield);
  }

  return yields;
}

/**
 * Get the number of days in a backtest period.
 */
function getDaysInPeriod(period: BacktestPeriod): number {
  const days: Record<BacktestPeriod, number> = {
    "30d": 30,
    "90d": 90,
    "180d": 180,
    "1y": 365,
  };
  return days[period];
}

/**
 * Simulate a single strategy run and compute snapshots.
 */
function simulateStrategy(
  config: BacktestConfig,
  subnetA: SubnetDetailModel,
  subnetB: SubnetDetailModel | undefined,
  subnets: SubnetDetailModel[],
): DailySnapshot[] {
  const days = getDaysInPeriod(config.period);
  const dailySnapshots: DailySnapshot[] = [];

  // Generate historical yields for all required subnets
  const yieldsA = generateHistoricalYields(subnetA, days);
  const yieldsB = subnetB ? generateHistoricalYields(subnetB, days) : [];

  // For diversified strategy, get top 5 subnets
  const topSubnets = [...subnets]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const topYields = topSubnets.map((s) => generateHistoricalYields(s, days));

  let value = config.initialAmount;
  let allocation: Record<number, number> = {};

  // Initialize allocation based on strategy
  switch (config.strategy) {
    case "hold":
      allocation[subnetA.netuid] = 1.0;
      break;
    case "move":
      allocation[subnetA.netuid] = 1.0;
      break;
    case "split":
      allocation[subnetA.netuid] = 0.5;
      allocation[subnetB!.netuid] = 0.5;
      break;
    case "top_yield":
      allocation[subnetA.netuid] = 1.0;
      break;
    case "diversified":
      topSubnets.forEach((s) => {
        allocation[s.netuid] = 1.0 / topSubnets.length;
      });
      break;
  }

  let peakValue = value;
  let bestDay = { date: "", returnPct: -Infinity };
  let worstDay = { date: "", returnPct: Infinity };

  const today = new Date();

  for (let day = 0; day < days; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (days - day));
    const dateStr = date.toISOString().split("T")[0];

    let dailyYield = 0;

    // Rebalance if needed
    const shouldRebalance =
      config.strategy === "top_yield" && day > 0 && day % 7 === 0;
    if (shouldRebalance) {
      // Weekly rebalance to highest yield
      let maxYield = -Infinity;
      let maxNetuid = subnetA.netuid;
      const activeSubnets = [subnetA, subnetB].filter(Boolean) as SubnetDetailModel[];
      activeSubnets.forEach((s, idx) => {
        const y = idx === 0 ? yieldsA[day] : yieldsB[day];
        if (y > maxYield) {
          maxYield = y;
          maxNetuid = s.netuid;
        }
      });
      allocation = { [maxNetuid]: 1.0 };
    }

    const shouldRebalanceDiversified =
      config.strategy === "diversified" && day > 0 && day % 30 === 0;
    if (shouldRebalanceDiversified) {
      topSubnets.forEach((s) => {
        allocation[s.netuid] = 1.0 / topSubnets.length;
      });
    }

    const shouldRebalanceMove =
      config.strategy === "move" && day === Math.floor(days / 2);
    if (shouldRebalanceMove) {
      allocation = { [subnetB!.netuid]: 1.0 };
    }

    // Compute weighted daily yield
    if (config.strategy === "hold") {
      dailyYield = yieldsA[day];
    } else if (config.strategy === "move") {
      if (day < Math.floor(days / 2)) {
        dailyYield = yieldsA[day];
      } else {
        dailyYield = yieldsB ? yieldsB[day] : 0;
      }
    } else if (config.strategy === "split") {
      dailyYield = yieldsA[day] * 0.5 + (yieldsB ? yieldsB[day] * 0.5 : 0);
    } else if (config.strategy === "top_yield") {
      const maxYield = Math.max(yieldsA[day], yieldsB ? yieldsB[day] : -Infinity);
      dailyYield = maxYield;
    } else if (config.strategy === "diversified") {
      dailyYield = topYields.reduce((sum, yields, idx) => {
        return sum + (yields[day] * (1.0 / topSubnets.length));
      }, 0);
    }

    // Convert annual yield % to daily rate and apply
    const dailyRate = dailyYield / 100 / 365;
    const previousValue = value;
    value = value * (1 + dailyRate);

    // Track peak for max drawdown calculation
    peakValue = Math.max(peakValue, value);

    // Track best/worst day
    const dayReturn = ((value - previousValue) / previousValue) * 100;
    if (dayReturn > bestDay.returnPct) {
      bestDay = { date: dateStr, returnPct: dayReturn };
    }
    if (dayReturn < worstDay.returnPct) {
      worstDay = { date: dateStr, returnPct: dayReturn };
    }

    const cumulativeReturn = ((value - config.initialAmount) / config.initialAmount) * 100;

    dailySnapshots.push({
      date: dateStr,
      value: value,
      yield: dailyYield,
      cumulativeReturn: cumulativeReturn,
    });
  }

  return dailySnapshots;
}

/**
 * Run a full backtest simulation.
 */
export function runBacktest(
  config: BacktestConfig,
  subnets: SubnetDetailModel[],
): BacktestResult {
  const subnetA = subnets.find((s) => s.netuid === config.subnetA);
  const subnetB = config.subnetB
    ? subnets.find((s) => s.netuid === config.subnetB)
    : undefined;

  if (!subnetA) {
    throw new Error(`Subnet ${config.subnetA} not found`);
  }

  // Simulate the strategy
  const dailyValues = simulateStrategy(config, subnetA, subnetB, subnets);

  // Calculate final metrics
  const finalValue = dailyValues[dailyValues.length - 1]?.value || config.initialAmount;
  const totalReturn = finalValue - config.initialAmount;
  const totalReturnPct = (totalReturn / config.initialAmount) * 100;

  // Max drawdown
  let peak = config.initialAmount;
  let maxDD = 0;
  dailyValues.forEach((snap) => {
    peak = Math.max(peak, snap.value);
    const dd = ((peak - snap.value) / peak) * 100;
    maxDD = Math.max(maxDD, dd);
  });

  // Sharpe ratio
  const returns = dailyValues.map((snap, idx) => {
    if (idx === 0) return 0;
    const prev = dailyValues[idx - 1].value;
    return (snap.value - prev) / prev;
  });
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);
  const sharpeRatio = volatility > 0 ? (avgReturn * 365) / volatility : 0;

  // Best/worst day
  let bestDay = { date: "", returnPct: -Infinity };
  let worstDay = { date: "", returnPct: Infinity };
  dailyValues.forEach((snap, idx) => {
    if (idx === 0) return;
    const prev = dailyValues[idx - 1].value;
    const dayReturn = ((snap.value - prev) / prev) * 100;
    if (dayReturn > bestDay.returnPct) {
      bestDay = { date: snap.date, returnPct: dayReturn };
    }
    if (dayReturn < worstDay.returnPct) {
      worstDay = { date: snap.date, returnPct: dayReturn };
    }
  });

  // Comparison baseline: root/SN0 at ~18% APR
  const days = getDaysInPeriod(config.period);
  const baselineYield = 18; // APR %
  const dailyBaselineRate = baselineYield / 100 / 365;
  let baselineValue = config.initialAmount;
  for (let i = 0; i < days; i++) {
    baselineValue *= 1 + dailyBaselineRate;
  }

  return {
    config,
    dailyValues,
    finalValue: parseFloat(finalValue.toFixed(4)),
    totalReturn: parseFloat(totalReturn.toFixed(4)),
    totalReturnPct: parseFloat(totalReturnPct.toFixed(2)),
    maxDrawdown: parseFloat(maxDD.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(3)),
    bestDay,
    worstDay,
    comparisonBaseline: parseFloat(baselineValue.toFixed(4)),
  };
}
