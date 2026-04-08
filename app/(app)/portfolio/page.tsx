"use client";

import { useState, useEffect } from "react";
import { Wallet, TrendingUp, AlertCircle, Info } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { StatCard } from "@/components/ui-custom/stat-card";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { DataSourceBadge } from "@/components/ui-custom/data-source-badge";
import { useWallet } from "@/lib/wallet-context";
import { getSubnets, fetchSubnetsFromApi } from "@/lib/api/subnets";
import type { SubnetDetailModel } from "@/lib/types/subnets";

/* ─────────────────────────────────────────────────────────────────── */
/* Deterministic position generation                                     */
/* ─────────────────────────────────────────────────────────────────── */

interface Position {
  subnet: SubnetDetailModel;
  stakedTao: number;
  value: number;
  percentOfPortfolio: number;
  returns7d: number;
}

/**
 * Simple hash function to deterministically select subnets based on address.
 * Uses the address as a seed to pick which subnets this wallet "owns".
 */
function hashAddress(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    const char = address.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate deterministic positions for a wallet address.
 * Uses address hash to seed:
 *   - Number of positions (3-8)
 *   - Which subnets to include
 *   - Staked amount per subnet
 */
function generatePositions(
  address: string,
  allSubnets: SubnetDetailModel[]
): Position[] {
  if (allSubnets.length === 0) return [];

  const hash = hashAddress(address);
  const numPositions = 3 + (hash % 6); // 3-8 positions
  const positionIndices = new Set<number>();

  // Deterministically pick subnet indices
  let seed = hash;
  while (positionIndices.size < numPositions && positionIndices.size < allSubnets.length) {
    seed = (seed * 73856093) ^ (seed >> 13);
    const idx = Math.abs(seed) % allSubnets.length;
    positionIndices.add(idx);
  }

  // Base portfolio size: use address hash to vary between 500-2000 TAO
  const baseTao = 500 + (hash % 1500);

  // Create positions with weighted allocation
  const positions: Position[] = [];
  const indices = Array.from(positionIndices).sort();

  for (let i = 0; i < indices.length; i++) {
    const subnet = allSubnets[indices[i]];
    // Vary staked amount: primary positions get 30-40%, others 5-15%
    const weightSeed = (hash + i * 1000) % 100;
    const stakedTao = i === 0
      ? baseTao * (0.3 + (weightSeed % 10) / 100)
      : baseTao * (0.05 + ((weightSeed + 50) % 10) / 100);

    const returns7d = (subnet.yieldDelta7d || 0) * (0.8 + Math.random() * 0.4);
    const value = stakedTao;

    positions.push({
      subnet,
      stakedTao,
      value,
      percentOfPortfolio: 0, // Calculate after sum
      returns7d,
    });
  }

  // Normalize to actual portfolio percentages
  const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
  positions.forEach((p) => {
    p.percentOfPortfolio = (p.value / totalValue) * 100;
  });

  return positions.sort((a, b) => b.value - a.value);
}

/* ─────────────────────────────────────────────────────────────────── */
/* Main component                                                        */
/* ─────────────────────────────────────────────────────────────────── */

export default function PortfolioPage() {
  const { address, openModal } = useWallet();
  const [subnets, setSubnets] = useState<SubnetDetailModel[]>(() => getSubnets());
  const [dataSource, setDataSource] = useState<string>("static-snapshot");
  const [snapshotAge, setSnapshotAge] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch live subnet data on mount
  useEffect(() => {
    setLoading(true);
    fetchSubnetsFromApi().then((result) => {
      setSubnets(result.subnets);
      setDataSource(result.dataSource);
      setSnapshotAge(result.snapshotAgeSec);
      setLoading(false);
    });
  }, []);

  if (!address) {
    return (
      <div className="max-w-3xl mx-auto space-y-7">
        <PageHeader
          title="Portfolio"
          subtitle="Your staked TAO positions and performance"
        />

        {/* Disconnected state */}
        <FadeIn>
          <div
            className="rounded-2xl relative overflow-hidden text-center py-16 px-8"
            style={{
              background:
                "linear-gradient(145deg, rgba(34,211,238,0.04) 0%, rgba(6,182,212,0.02) 60%, rgba(255,255,255,0.012) 100%)",
              border: "1px solid rgba(34,211,238,0.12)",
              boxShadow:
                "0 0 48px rgba(34,211,238,0.03), inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.25)",
            }}
          >
            {/* Icon */}
            <div
              className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(34,211,238,0.1), rgba(6,182,212,0.05))",
                border: "1px solid rgba(34,211,238,0.18)",
              }}
            >
              <Wallet className="w-6 h-6" style={{ color: "#22d3ee" }} />
            </div>

            <h2 className="text-xl font-semibold text-white mb-2">
              Connect Your Wallet
            </h2>

            <p
              className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed mb-6"
              style={{ fontSize: "14px" }}
            >
              See your staked positions, earnings, allocation across subnets,
              and performance metrics.
            </p>

            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl transition-all hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(6,182,212,0.06))",
                border: "1px solid rgba(34,211,238,0.2)",
                color: "#22d3ee",
              }}
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          </div>
        </FadeIn>
      </div>
    );
  }

  // Generate positions for connected wallet
  const positions = generatePositions(address, subnets);
  const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
  const avgYield =
    positions.length > 0
      ? positions.reduce((sum, p) => sum + p.subnet.yield, 0) / positions.length
      : 0;
  const totalReturns7d = positions.reduce((sum, p) => sum + p.returns7d, 0);
  const activeSubnets = positions.length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-7">
      {/* Header */}
      <PageHeader
        title="Portfolio"
        subtitle="Your staked TAO positions and performance"
      />

      {/* Info banner: data source notice */}
      <FadeIn delay={0.05}>
        <div
          className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
          style={{
            background: "rgba(34,211,238,0.04)",
            border: "1px solid rgba(34,211,238,0.12)",
          }}
        >
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-slate-300">
              <span className="font-semibold text-cyan-300">
                Simulated portfolio.
              </span>{" "}
              Portfolio data is derived from subnet snapshots. On-chain position
              tracking via Bittensor RPC is in development.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <DataSourceBadge source={dataSource} ageSec={snapshotAge} />
              {loading && (
                <span className="text-[10px] text-slate-600">Refreshing...</span>
              )}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Primary stats grid */}
      <FadeIn delay={0.08}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Staked"
            value={`${totalValue.toFixed(2)} τ`}
            accent="cyan"
            index={0}
          />
          <StatCard
            label="Weighted Yield"
            value={`${avgYield.toFixed(1)}%`}
            accent="violet"
            index={1}
          />
          <StatCard
            label="7-Day Returns"
            value={`${totalReturns7d.toFixed(4)} τ`}
            change={totalReturns7d > 0 ? 5.2 : totalReturns7d < 0 ? -3.1 : 0}
            accent="emerald"
            index={2}
          />
          <StatCard
            label="Active Subnets"
            value={`${activeSubnets}`}
            accent="amber"
            index={3}
          />
        </div>
      </FadeIn>

      {/* Positions table */}
      <FadeIn delay={0.11}>
        <GlassCard padding="lg">
          <div className="mb-5">
            <h3
              className="text-sm font-semibold text-white"
              style={{ fontSize: "15px", letterSpacing: "-0.01em" }}
            >
              Your Positions
            </h3>
            <p className="text-[11px] text-slate-600 mt-1">
              {positions.length} active staking position{positions.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div
            className="overflow-x-auto"
            style={{
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#cbd5e1",
                      fontSize: "11px",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Subnet
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "#cbd5e1",
                      fontSize: "11px",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Staked
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "#cbd5e1",
                      fontSize: "11px",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Allocation
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "#cbd5e1",
                      fontSize: "11px",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    APY
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#cbd5e1",
                      fontSize: "11px",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Risk
                  </th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position, idx) => {
                  const { subnet, stakedTao, percentOfPortfolio } = position;
                  const riskColors: Record<string, string> = {
                    LOW: "#34d399",
                    MODERATE: "#f59e0b",
                    HIGH: "#ef4444",
                    SPECULATIVE: "#ec4899",
                  };

                  return (
                    <tr
                      key={`${subnet.netuid}-${idx}`}
                      style={{
                        borderBottom:
                          idx < positions.length - 1
                            ? "1px solid rgba(255,255,255,0.03)"
                            : "none",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "rgba(255,255,255,0.02)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div className="flex items-center gap-2">
                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "8px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "bold",
                              fontSize: "11px",
                              color: "white",
                              background: `linear-gradient(135deg, hsl(${
                                subnet.netuid * 23
                              }, 70%, 50%), hsl(${(subnet.netuid * 23 + 60) % 360}, 70%, 45%))`,
                            }}
                          >
                            {subnet.netuid}
                          </div>
                          <div>
                            <div style={{ color: "#e2e8f0", fontWeight: 500 }}>
                              {subnet.name}
                            </div>
                            <div style={{ color: "#94a3b8", fontSize: "10px" }}>
                              {subnet.symbol}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          color: "#cbd5e1",
                          fontWeight: 500,
                        }}
                      >
                        {stakedTao.toFixed(2)} τ
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          color: "#94a3b8",
                          fontSize: "12px",
                        }}
                      >
                        {percentOfPortfolio.toFixed(1)}%
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          color: "#34d399",
                          fontWeight: 500,
                        }}
                      >
                        {subnet.yield.toFixed(1)}%
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: riskColors[subnet.risk] || "#94a3b8",
                          fontSize: "12px",
                          fontWeight: 500,
                        }}
                      >
                        {subnet.risk}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </FadeIn>

      {/* Distribution breakdown */}
      <FadeIn delay={0.14}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Subnet Distribution */}
          <GlassCard padding="lg">
            <div className="mb-5">
              <h3
                className="text-sm font-semibold text-white"
                style={{ fontSize: "15px", letterSpacing: "-0.01em" }}
              >
                Portfolio Distribution
              </h3>
              <p className="text-[11px] text-slate-600 mt-1">
                Allocation across {activeSubnets} subnet{activeSubnets !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="space-y-3">
              {positions.slice(0, 5).map((position) => (
                <div
                  key={`dist-${position.subnet.netuid}`}
                  className="flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ color: "#cbd5e1", fontSize: "12px" }}>
                        {position.subnet.name}
                      </span>
                      <span
                        style={{
                          color: "#94a3b8",
                          fontSize: "11px",
                          fontWeight: 500,
                        }}
                      >
                        {position.percentOfPortfolio.toFixed(1)}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: "6px",
                        borderRadius: "3px",
                        background: "rgba(255,255,255,0.06)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${position.percentOfPortfolio}%`,
                          background: `linear-gradient(90deg, hsl(${
                            position.subnet.netuid * 23
                          }, 70%, 50%), hsl(${
                            (position.subnet.netuid * 23 + 60) % 360
                          }, 70%, 45%))`,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {positions.length > 5 && (
                <div style={{ color: "#64748b", fontSize: "11px", marginTop: "8px" }}>
                  + {positions.length - 5} more position{positions.length - 5 !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Top Performers */}
          <GlassCard padding="lg">
            <div className="mb-5">
              <h3
                className="text-sm font-semibold text-white"
                style={{ fontSize: "15px", letterSpacing: "-0.01em" }}
              >
                Top Performers
              </h3>
              <p className="text-[11px] text-slate-600 mt-1">
                Best 7-day returns
              </p>
            </div>
            <div className="space-y-3">
              {positions
                .sort((a, b) => b.returns7d - a.returns7d)
                .slice(0, 5)
                .map((position) => (
                  <div
                    key={`perf-${position.subnet.netuid}`}
                    className="flex items-center justify-between p-3"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" style={{ color: "#34d399" }} />
                      <div>
                        <div style={{ color: "#cbd5e1", fontSize: "12px" }}>
                          {position.subnet.name}
                        </div>
                        <div
                          style={{ color: "#94a3b8", fontSize: "10px", marginTop: "2px" }}
                        >
                          {position.subnet.symbol}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        color: position.returns7d > 0 ? "#34d399" : "#f43f5e",
                        fontWeight: 600,
                        fontSize: "12px",
                      }}
                    >
                      {position.returns7d > 0 ? "+" : ""}
                      {position.returns7d.toFixed(4)} τ
                    </div>
                  </div>
                ))}
            </div>
          </GlassCard>
        </div>
      </FadeIn>
    </div>
  );
}
