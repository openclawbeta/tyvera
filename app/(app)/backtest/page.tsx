"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from "recharts";
import {
  Play,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { StatCard } from "@/components/ui-custom/stat-card";
import { getSubnets, fetchSubnetsFromApi } from "@/lib/api/subnets";
import { runBacktest } from "@/lib/api/backtest";
import type { SubnetDetailModel } from "@/lib/types/subnets";
import type {
  BacktestConfig,
  BacktestResult,
  StrategyType,
  BacktestPeriod,
} from "@/lib/types/backtest";

const STRATEGY_DESCRIPTIONS: Record<StrategyType, string> = {
  hold: "Stake in one subnet and hold",
  move: "Start in A, move to B midway",
  split: "Split 50/50 between two subnets",
  top_yield: "Weekly rebalance to top yield",
  diversified: "Top 5 subnets, monthly rebalance",
};

const STRATEGY_COLORS: Record<StrategyType, string> = {
  hold: "#22d3ee",
  move: "#38bdf8",
  split: "#06b6d4",
  top_yield: "#0891b2",
  diversified: "#0e7490",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-3 py-2 text-xs space-y-1">
      <p className="text-slate-400">{payload[0]?.payload?.date}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color }}>
          {entry.name}: {entry.value.toFixed(4)} τ
        </p>
      ))}
    </div>
  );
};

export default function BacktestPage() {
  const [subnets, setSubnets] = useState<SubnetDetailModel[]>(() => getSubnets());
  const [config, setConfig] = useState<BacktestConfig>({
    initialAmount: 10,
    strategy: "hold",
    subnetA: 1,
    subnetB: 2,
    period: "90d",
  });
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch live data on mount
  useEffect(() => {
    fetchSubnetsFromApi()
      .then((result) => setSubnets(result.subnets))
      .catch(() => {
        /* Backtest can fall back to snapshot data */
      });
  }, []);

  const handleRunBacktest = () => {
    setIsLoading(true);
    try {
      const backtest = runBacktest(config, subnets);
      setResult(backtest);
    } catch (error) {
      /* backtest computation failed */
    } finally {
      setIsLoading(false);
    }
  };

  const subnetA = useMemo(
    () => subnets.find((s) => s.netuid === config.subnetA),
    [subnets, config.subnetA],
  );
  const subnetB = useMemo(
    () => subnets.find((s) => s.netuid === config.subnetB),
    [subnets, config.subnetB],
  );

  const chartData = useMemo(() => {
    if (!result) return [];
    // Resample to ~100 points for cleaner chart
    const interval = Math.max(1, Math.floor(result.dailyValues.length / 100));
    const sampled = result.dailyValues.filter((_, i) => i % interval === 0);
    return sampled.map((snap) => ({
      date: snap.date,
      strategy: result.config.strategy,
      value: snap.value,
      baseline:
        result.config.initialAmount *
        Math.pow(1 + 0.18 / 365, snap.date === result.dailyValues[0].date ? 1 : result.dailyValues.findIndex((d) => d.date === snap.date)),
    }));
  }, [result]);

  const baselineMultiplier = result
    ? result.comparisonBaseline / result.config.initialAmount
    : 1;
  const strategyMultiplier = result
    ? result.finalValue / result.config.initialAmount
    : 1;
  const alpha = ((strategyMultiplier - baselineMultiplier) / baselineMultiplier) * 100;

  return (
    <div className="min-h-screen pb-12">
      <PageHeader
        title="Strategy Backtester"
        subtitle="Test staking strategies against modeled yield scenarios"
      />

      <div className="max-w-7xl mx-auto px-4 lg:px-0 space-y-6">
        {/* Configuration Panel */}
        <GlassCard padding="lg" glow="cyan">
          <div className="space-y-5">
            {/* Initial Amount */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Initial Amount (τ)
              </label>
              <input
                type="number"
                value={config.initialAmount}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    initialAmount: Math.max(0.1, parseFloat(e.target.value) || 0),
                  })
                }
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition"
              />
            </div>

            {/* Strategy Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Strategy
              </label>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                {(["hold", "move", "split", "top_yield", "diversified"] as StrategyType[]).map(
                  (strat) => (
                    <button
                      key={strat}
                      onClick={() => setConfig({ ...config, strategy: strat })}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        config.strategy === strat
                          ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300 shadow-lg shadow-cyan-500/20"
                          : "border-slate-700/30 bg-transparent text-slate-400 hover:border-slate-600/50"
                      }`}
                      title={STRATEGY_DESCRIPTIONS[strat]}
                    >
                      {strat === "hold"
                        ? "Hold"
                        : strat === "move"
                          ? "Move"
                          : strat === "split"
                            ? "50/50 Split"
                            : strat === "top_yield"
                              ? "Yield Chase"
                              : "Diversified"}
                    </button>
                  ),
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {STRATEGY_DESCRIPTIONS[config.strategy]}
              </p>
            </div>

            {/* Subnet Selectors */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Subnet A
                </label>
                <select
                  value={config.subnetA}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      subnetA: parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 transition"
                >
                  {subnets.map((s) => (
                    <option key={s.netuid} value={s.netuid}>
                      {s.name} ({s.symbol}) - {s.yield.toFixed(2)}% APR
                    </option>
                  ))}
                </select>
              </div>

              {["move", "split"].includes(config.strategy) && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Subnet B
                  </label>
                  <select
                    value={config.subnetB || 2}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        subnetB: parseInt(e.target.value),
                      })
                    }
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 transition"
                  >
                    {subnets.map((s) => (
                      <option key={s.netuid} value={s.netuid}>
                        {s.name} ({s.symbol}) - {s.yield.toFixed(2)}% APR
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Period Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Period
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["30d", "90d", "180d", "1y"] as BacktestPeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setConfig({ ...config, period })}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      config.period === period
                        ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                        : "border-slate-700/30 text-slate-400 hover:border-slate-600/50"
                    }`}
                  >
                    {period.replace("d", "D").replace("y", "Y")}
                  </button>
                ))}
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunBacktest}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-semibold py-3 rounded-lg hover:from-cyan-400 hover:to-cyan-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              <Play className="w-4 h-4 group-hover:scale-110 transition" />
              {isLoading ? "Running..." : "Run Backtest"}
            </button>
          </div>
        </GlassCard>

        {/* Results Section */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Final Value"
                value={`${result.finalValue.toFixed(4)} τ`}
                change={result.totalReturnPct}
                accent="cyan"
                index={0}
              />
              <StatCard
                label="Total Return"
                value={`${result.totalReturnPct.toFixed(2)}%`}
                change={result.totalReturnPct}
                accent="emerald"
                index={1}
              />
              <StatCard
                label="Max Drawdown"
                value={`${result.maxDrawdown.toFixed(2)}%`}
                change={-result.maxDrawdown}
                accent="rose"
                index={2}
              />
              <StatCard
                label="Sharpe Ratio"
                value={result.sharpeRatio.toFixed(3)}
                change={result.sharpeRatio > 1 ? result.sharpeRatio * 10 : -5}
                accent="violet"
                index={3}
              />
            </div>

            {/* Main Chart */}
            <GlassCard padding="lg" glow="cyan">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white">
                  Portfolio Value Over Time
                </h3>
                <div className="h-80 -mx-6 px-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <defs>
                        <linearGradient id="stratGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#475569", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: "#475569", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v.toFixed(1)} τ`}
                      />
                      <Tooltip content={(props) => <CustomTooltip {...props} />} />
                      <Legend
                        wrapperStyle={{ paddingTop: "20px" }}
                        iconType="line"
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#22d3ee"
                        strokeWidth={2}
                        fill="url(#stratGrad)"
                        dot={false}
                        name="Your Strategy"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </GlassCard>

            {/* Secondary Metrics */}
            <GlassCard padding="lg">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white mb-4">
                  Performance Breakdown
                </h3>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Best/Worst Days */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Best Day
                      </span>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                        <span className="text-sm font-semibold text-emerald-300">
                          {result.bestDay.returnPct.toFixed(3)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {result.bestDay.date}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Worst Day
                      </span>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-3 h-3 text-rose-400" />
                        <span className="text-sm font-semibold text-rose-300">
                          {result.worstDay.returnPct.toFixed(3)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {result.worstDay.date}
                    </div>
                  </div>

                  {/* Baseline Comparison */}
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      vs Root Staking (~18% APR)
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Your Strategy:</span>
                        <span className="font-semibold text-cyan-300">
                          +{result.totalReturnPct.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Root Baseline:</span>
                        <span className="font-semibold text-slate-300">
                          +{(baselineMultiplier * 100 - 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="h-px bg-slate-700/30 my-2" />
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Alpha:</span>
                        <span
                          className={`font-semibold ${
                            alpha > 0 ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {alpha > 0 ? "+" : ""}{alpha.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Annualized Projection */}
                <div className="h-px bg-slate-700/30" />
                <div className="pt-2">
                  <p className="text-xs text-slate-500">
                    Projected annualized return:{" "}
                    <span className="text-cyan-300 font-semibold">
                      {((result.totalReturnPct / parseInt(config.period)) * 365).toFixed(1)}%
                    </span>
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Disclaimer */}
            <div
              className="px-4 py-3 rounded-lg border border-amber-900/30"
              style={{
                background: "rgba(251, 146, 60, 0.05)",
              }}
            >
              <p className="text-xs text-amber-700 leading-relaxed">
                Simulated results based on modeled yield scenarios — not actual historical returns.
                Past performance does not guarantee future results. Use for strategy comparison only.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
