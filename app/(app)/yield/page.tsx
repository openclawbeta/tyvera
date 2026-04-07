"use client";

import { useState, useMemo, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { StatCard } from "@/components/ui-custom/stat-card";
import { SectionTitle } from "@/components/ui-custom/section-title";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { getSubnets, fetchSubnetsFromApi } from "@/lib/api/subnets";
import { useTaoRate } from "@/lib/hooks/use-tao-rate";
import type { SubnetDetailModel } from "@/lib/types/subnets";

export default function YieldPage() {
  // Load initial subnets from snapshot
  const seedSubnets = getSubnets();
  const [subnets, setSubnets] = useState<SubnetDetailModel[]>(() => seedSubnets);
  const [liveLoaded, setLiveLoaded] = useState(false);

  // Fetch live subnet data
  useEffect(() => {
    let cancelled = false;

    fetchSubnetsFromApi()
      .then((data) => {
        if (cancelled) return;
        setSubnets(data);
        setLiveLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLiveLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Form state
  const [amount, setAmount] = useState(10);
  const [selectedNetuid, setSelectedNetuid] = useState<number | null>(
    seedSubnets.length > 0 ? seedSubnets[0].netuid : null
  );
  const [showResults, setShowResults] = useState(false);

  // TAO rate hook
  const { rate: taoRate } = useTaoRate();

  // Get selected subnet
  const selectedSubnet = useMemo(
    () => subnets.find((s) => s.netuid === selectedNetuid),
    [subnets, selectedNetuid]
  );

  // Calculate earnings
  const calculations = useMemo(() => {
    if (!selectedSubnet || amount <= 0) {
      return null;
    }

    const dailyYield = (amount * selectedSubnet.yield) / 100 / 365;
    const hourlyYield = dailyYield / 24;
    const weeklyYield = dailyYield * 7;
    const monthlyYield = dailyYield * 30;

    const hourlyUsd = hourlyYield * (taoRate || 600);
    const dailyUsd = dailyYield * (taoRate || 600);
    const weeklyUsd = weeklyYield * (taoRate || 600);
    const monthlyUsd = monthlyYield * (taoRate || 600);

    // 30-day projection data
    const projectionData = Array.from({ length: 31 }, (_, i) => ({
      label: `Day ${i}`,
      value: dailyYield * i,
    }));

    return {
      hourly: { tao: hourlyYield, usd: hourlyUsd },
      daily: { tao: dailyYield, usd: dailyUsd },
      weekly: { tao: weeklyYield, usd: weeklyUsd },
      monthly: { tao: monthlyYield, usd: monthlyUsd },
      projectionData,
    };
  }, [selectedSubnet, amount, taoRate]);

  // Sorted subnets for table
  const sortedSubnets = useMemo(
    () => [...subnets].sort((a, b) => b.yield - a.yield),
    [subnets]
  );

  const handleCalculate = () => {
    setShowResults(true);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Yield Calculator"
        subtitle="Estimate your staking earnings across subnets"
      >
        <div className="text-xs text-slate-500">
          {liveLoaded ? (
            <>
              <span className="text-white font-semibold">{subnets.length}</span> subnets available
            </>
          ) : (
            <>Loading subnet data…</>
          )}
        </div>
      </PageHeader>

      {/* Input Section */}
      <FadeIn>
        <GlassCard glow="cyan" padding="lg">
          <SectionTitle
            title="Calculate Yield"
            subtitle="Enter the amount you'd like to stake and select a subnet"
          />
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">
                  Amount to Stake (τ)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors"
                  placeholder="10"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Subnet Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">
                  Select Subnet
                </label>
                <select
                  value={selectedNetuid || ""}
                  onChange={(e) => setSelectedNetuid(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white focus:outline-none focus:border-cyan-400/50 transition-colors"
                >
                  {subnets.map((subnet) => (
                    <option key={subnet.netuid} value={subnet.netuid}>
                      {subnet.name} (#{subnet.netuid}) — {subnet.yield.toFixed(2)}% yield
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Calculate Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleCalculate}
                className="px-6 py-2 rounded-lg font-semibold text-slate-900 transition-all duration-200 flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)",
                  boxShadow: "0 0 0 1px rgba(34,211,238,0.3), 0 4px 12px rgba(34,211,238,0.2)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 0 0 1px rgba(34,211,238,0.5), 0 8px 20px rgba(34,211,238,0.3)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 0 0 1px rgba(34,211,238,0.3), 0 4px 12px rgba(34,211,238,0.2)";
                }}
              >
                <TrendingUp className="w-4 h-4" />
                Calculate
              </button>
            </div>
          </div>
        </GlassCard>
      </FadeIn>

      {/* Results Section */}
      {showResults && calculations && selectedSubnet && (
        <FadeIn delay={0.1}>
          <div className="space-y-6">
            {/* Earnings Cards - TAO */}
            <GlassCard padding="lg" glow="emerald">
              <SectionTitle title="Projected Earnings" />
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label="Hourly"
                  value={`${calculations.hourly.tao.toFixed(4)} τ`}
                  accent="cyan"
                  index={0}
                />
                <StatCard
                  label="Daily"
                  value={`${calculations.daily.tao.toFixed(6)} τ`}
                  accent="cyan"
                  index={1}
                />
                <StatCard
                  label="Weekly"
                  value={`${calculations.weekly.tao.toFixed(5)} τ`}
                  accent="cyan"
                  index={2}
                />
                <StatCard
                  label="Monthly"
                  value={`${calculations.monthly.tao.toFixed(5)} τ`}
                  accent="cyan"
                  index={3}
                />
              </div>
            </GlassCard>

            {/* Earnings Cards - USD */}
            {taoRate && (
              <GlassCard padding="lg" glow="violet">
                <SectionTitle
                  title="USD Equivalent"
                  subtitle={`Based on τ = $${taoRate.toFixed(2)}`}
                />
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard
                    label="Hourly"
                    value={`$${calculations.hourly.usd.toFixed(2)}`}
                    accent="violet"
                    index={0}
                  />
                  <StatCard
                    label="Daily"
                    value={`$${calculations.daily.usd.toFixed(2)}`}
                    accent="violet"
                    index={1}
                  />
                  <StatCard
                    label="Weekly"
                    value={`$${calculations.weekly.usd.toFixed(2)}`}
                    accent="violet"
                    index={2}
                  />
                  <StatCard
                    label="Monthly"
                    value={`$${calculations.monthly.usd.toFixed(2)}`}
                    accent="violet"
                    index={3}
                  />
                </div>
              </GlassCard>
            )}

            {/* 30-Day Projection Chart */}
            <GlassCard padding="lg" glow="amber">
              <SectionTitle title="30-Day Cumulative Projection" />
              <div className="mt-6">
                <SimpleLineChart
                  data={calculations.projectionData}
                  color="#fbbf24"
                  height={240}
                  showGrid={true}
                  suffix=" τ"
                  gradientId="projectionGrad"
                />
              </div>
            </GlassCard>
          </div>
        </FadeIn>
      )}

      {/* Subnets Yield Table */}
      <FadeIn delay={showResults ? 0.2 : 0.1}>
        <GlassCard padding="lg">
          <SectionTitle
            title="All Subnets by Yield"
            subtitle={`Showing ${sortedSubnets.length} subnets sorted by current yield`}
          />
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <th className="px-4 py-3 text-left font-semibold text-slate-400">Rank</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-400">Subnet</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-400">Yield %</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-400">Daily τ</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-400">Monthly τ</th>
                  {taoRate && (
                    <th className="px-4 py-3 text-right font-semibold text-slate-400">
                      Monthly USD
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {sortedSubnets.map((subnet, idx) => {
                  const dailyEarnings = (amount * subnet.yield) / 100 / 365;
                  const monthlyEarnings = dailyEarnings * 30;
                  const monthlyUsd = monthlyEarnings * (taoRate || 600);

                  return (
                    <tr
                      key={subnet.netuid}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-300">
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                          style={{
                            background: "rgba(34,211,238,0.1)",
                            border: "1px solid rgba(34,211,238,0.2)",
                            color: "#22d3ee",
                          }}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{subnet.name}</div>
                        <div className="text-xs text-slate-500">#{subnet.netuid}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                        {subnet.yield.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {dailyEarnings.toFixed(6)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {monthlyEarnings.toFixed(5)}
                      </td>
                      {taoRate && (
                        <td className="px-4 py-3 text-right text-slate-300">
                          ${monthlyUsd.toFixed(2)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </FadeIn>
    </div>
  );
}
