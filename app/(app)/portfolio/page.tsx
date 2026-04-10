"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Wallet, TrendingUp, Info, Loader2, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { StatCard } from "@/components/ui-custom/stat-card";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { DataSourceBadge } from "@/components/ui-custom/data-source-badge";
import { useWallet } from "@/lib/wallet-context";

/* ─────────────────────────────────────────────────────────────────── */
/* Types                                                                  */
/* ─────────────────────────────────────────────────────────────────── */

interface Position {
  netuid: number;
  subnetName: string;
  symbol: string;
  stakedTao: number;
  yieldPercent: number;
  risk: string;
  category: string;
  percentOfPortfolio?: number;
}

interface PortfolioData {
  positions: Position[];
  stats: {
    totalStakedTao: number;
    totalValueUsd: number;
    positionCount: number;
    weightedYield: number;
  };
  source: string;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Main component                                                        */
/* ─────────────────────────────────────────────────────────────────── */

export default function PortfolioPage() {
  const { address, openModal } = useWallet();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch real portfolio data from API when address changes
  useEffect(() => {
    if (!address) {
      setPortfolio(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/portfolio?address=${encodeURIComponent(address)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch portfolio");
        return res.json();
      })
      .then((data: PortfolioData) => {
        // Compute allocation percentages
        const total = data.stats.totalStakedTao || 1;
        data.positions = data.positions.map((p) => ({
          ...p,
          percentOfPortfolio: (p.stakedTao / total) * 100,
        }));
        setPortfolio(data);
      })
      .catch((err) => {
        console.error("[portfolio] Fetch error:", err);
        setError("Unable to load portfolio data. Please try again.");
        setPortfolio({
          positions: [],
          stats: { totalStakedTao: 0, totalValueUsd: 0, positionCount: 0, weightedYield: 0 },
          source: "error",
        });
      })
      .finally(() => setLoading(false));
  }, [address]);

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

  // Loading state
  if (loading && !portfolio) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-7">
        <PageHeader
          title="Portfolio"
          subtitle="Your staked TAO positions and performance"
        />
        <FadeIn>
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-400">
              Querying your on-chain positions...
            </p>
          </div>
        </FadeIn>
      </div>
    );
  }

  const positions = portfolio?.positions || [];
  const stats = portfolio?.stats || {
    totalStakedTao: 0,
    totalValueUsd: 0,
    positionCount: 0,
    weightedYield: 0,
  };
  const source = portfolio?.source || "empty";
  const hasPositions = positions.length > 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-7">
      <PageHeader
        title="Portfolio"
        subtitle="Your staked TAO positions and performance"
      />

      {/* Data source banner */}
      <FadeIn delay={0.05}>
        <div
          className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
          style={{
            background: source === "chain" ? "rgba(34,211,238,0.04)" : "rgba(251,191,36,0.04)",
            border: `1px solid ${source === "chain" ? "rgba(34,211,238,0.12)" : "rgba(251,191,36,0.12)"}`,
          }}
        >
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{
            color: source === "chain" ? "#22d3ee" : "#fbbf24"
          }} />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-slate-300">
              {source === "chain" ? (
                <>
                  <span className="font-semibold text-cyan-300">Live on-chain data.</span>{" "}
                  Positions queried directly from Subtensor.
                </>
              ) : (
                <>
                  <span className="font-semibold text-amber-300">
                    {hasPositions ? "On-chain data" : "No positions found."}
                  </span>{" "}
                  {hasPositions
                    ? "Showing your current staked positions."
                    : "You don't have any staked positions yet. Visit the Subnets page to explore staking opportunities."}
                </>
              )}
            </p>
            <div className="mt-2">
              <DataSourceBadge source={source === "chain" ? "subtensor-rpc" : "api"} ageSec={null} />
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Stats grid */}
      <FadeIn delay={0.08}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Staked"
            value={`${stats.totalStakedTao.toFixed(2)} τ`}
            accent="cyan"
            index={0}
          />
          <StatCard
            label="Value (USD)"
            value={stats.totalValueUsd > 0 ? `$${stats.totalValueUsd.toLocaleString()}` : "—"}
            accent="emerald"
            index={1}
          />
          <StatCard
            label="Weighted Yield"
            value={stats.weightedYield > 0 ? `${stats.weightedYield.toFixed(1)}%` : "—"}
            accent="violet"
            index={2}
          />
          <StatCard
            label="Active Subnets"
            value={`${stats.positionCount}`}
            accent="amber"
            index={3}
          />
        </div>
      </FadeIn>

      {/* Positions table or empty state */}
      {hasPositions ? (
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
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.02)",
                  }}>
                    {["Subnet", "Staked", "Allocation", "APY", "Risk"].map((col, i) => (
                      <th
                        key={col}
                        style={{
                          padding: "12px 16px",
                          textAlign: i === 0 || i === 4 ? "left" : "right",
                          fontWeight: 600,
                          color: "#cbd5e1",
                          fontSize: "11px",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos, idx) => {
                    const riskColors: Record<string, string> = {
                      LOW: "#34d399", MODERATE: "#f59e0b", HIGH: "#ef4444", SPECULATIVE: "#ec4899",
                    };
                    return (
                      <tr
                        key={`${pos.netuid}-${idx}`}
                        style={{
                          borderBottom: idx < positions.length - 1
                            ? "1px solid rgba(255,255,255,0.03)" : "none",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <div className="flex items-center gap-2">
                            <div style={{
                              width: "28px", height: "28px", borderRadius: "8px",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontWeight: "bold", fontSize: "11px", color: "white",
                              background: `linear-gradient(135deg, hsl(${pos.netuid * 23}, 70%, 50%), hsl(${(pos.netuid * 23 + 60) % 360}, 70%, 45%))`,
                            }}>
                              {pos.netuid}
                            </div>
                            <div>
                              <div style={{ color: "#e2e8f0", fontWeight: 500 }}>{pos.subnetName}</div>
                              <div style={{ color: "#94a3b8", fontSize: "10px" }}>{pos.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#cbd5e1", fontWeight: 500 }}>
                          {pos.stakedTao.toFixed(3)} τ
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#94a3b8", fontSize: "12px" }}>
                          {(pos.percentOfPortfolio ?? 0).toFixed(1)}%
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#34d399", fontWeight: 500 }}>
                          {pos.yieldPercent.toFixed(1)}%
                        </td>
                        <td style={{
                          padding: "12px 16px",
                          color: riskColors[pos.risk] || "#94a3b8",
                          fontSize: "12px", fontWeight: 500,
                        }}>
                          {pos.risk}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </FadeIn>
      ) : (
        <FadeIn delay={0.11}>
          <GlassCard padding="lg">
            <div className="text-center py-12">
              <Wallet className="w-10 h-10 mx-auto mb-4" style={{ color: "#475569" }} />
              <h3 className="text-base font-semibold text-slate-300 mb-2">
                No Staked Positions
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                You don&apos;t have any TAO staked on subnets yet.
                Explore subnet analytics to find the best staking opportunities.
              </p>
              <Link href="/subnets" className="inline-flex mt-5">
                <button
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
                  style={{
                    background: "rgba(34,211,238,0.12)",
                    border: "1px solid rgba(34,211,238,0.22)",
                    color: "#22d3ee",
                  }}
                >
                  Explore Subnets
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </GlassCard>
        </FadeIn>
      )}

      {/* Distribution breakdown — only when positions exist */}
      {hasPositions && (
        <FadeIn delay={0.14}>
          <GlassCard padding="lg">
            <div className="mb-5">
              <h3
                className="text-sm font-semibold text-white"
                style={{ fontSize: "15px", letterSpacing: "-0.01em" }}
              >
                Portfolio Distribution
              </h3>
              <p className="text-[11px] text-slate-600 mt-1">
                Allocation across {positions.length} subnet{positions.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="space-y-3">
              {positions.slice(0, 8).map((pos) => (
                <div key={`dist-${pos.netuid}`} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ color: "#cbd5e1", fontSize: "12px" }}>{pos.subnetName}</span>
                      <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 500 }}>
                        {(pos.percentOfPortfolio ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${pos.percentOfPortfolio ?? 0}%`,
                        background: `linear-gradient(90deg, hsl(${pos.netuid * 23}, 70%, 50%), hsl(${(pos.netuid * 23 + 60) % 360}, 70%, 45%))`,
                        transition: "width 0.3s ease",
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </FadeIn>
      )}
    </div>
  );
}
