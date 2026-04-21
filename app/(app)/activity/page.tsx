"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  ArrowUpRight,
  Lock,
  Unlock,
  ArrowLeftRight,
  Gift,
  Copy,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { StatCard } from "@/components/ui-custom/stat-card";
import { SectionTitle } from "@/components/ui-custom/section-title";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { getActivitySummary } from "@/lib/api/activity";
import { useWallet } from "@/lib/wallet-context";
import { cn, formatDate, truncateAddress } from "@/lib/utils";
import { ActivityType, ActivityEvent } from "@/lib/types/activity";

type FilterType = "ALL" | ActivityType;
type DateRange = "7d" | "30d" | "90d" | "all";

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  TRANSFER: "Transfer",
  STAKE: "Stake",
  UNSTAKE: "Unstake",
  MOVE_STAKE: "Move Stake",
  REGISTER: "Register",
  SET_WEIGHTS: "Set Weights",
  CLAIM: "Claim",
};

const ACTIVITY_TYPE_ICONS: Record<ActivityType, React.ReactNode> = {
  TRANSFER: <ArrowUpRight className="w-4 h-4" />,
  STAKE: <Lock className="w-4 h-4" />,
  UNSTAKE: <Unlock className="w-4 h-4" />,
  MOVE_STAKE: <ArrowLeftRight className="w-4 h-4" />,
  REGISTER: <Gift className="w-4 h-4" />,
  SET_WEIGHTS: <Gift className="w-4 h-4" />,
  CLAIM: <Gift className="w-4 h-4" />,
};

const ACTIVITY_TYPE_COLORS: Record<ActivityType, { bg: string; border: string; text: string }> = {
  TRANSFER: {
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.16)",
    text: "#3b82f6",
  },
  STAKE: {
    bg: "rgba(52,211,153,0.08)",
    border: "rgba(52,211,153,0.16)",
    text: "var(--aurora-up)",
  },
  UNSTAKE: {
    bg: "rgba(244,63,94,0.08)",
    border: "rgba(244,63,94,0.16)",
    text: "#f43f5e",
  },
  MOVE_STAKE: {
    bg: "rgba(34,211,238,0.08)",
    border: "rgba(34,211,238,0.16)",
    text: "#5B4BC9",
  },
  REGISTER: {
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.16)",
    text: "var(--aurora-warn)",
  },
  SET_WEIGHTS: {
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.16)",
    text: "var(--aurora-warn)",
  },
  CLAIM: {
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.16)",
    text: "var(--aurora-warn)",
  },
};

function getDateRangeFilter(range: DateRange, events: ActivityEvent[]): ActivityEvent[] {
  if (range === "all") return events;

  const now = new Date();
  const daysAgo = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

  return events.filter(e => new Date(e.timestamp) >= cutoffDate);
}

interface ExpandedRow {
  id: string;
  visible: boolean;
}

export default function ActivityPage() {
  const { walletState, address, openModal } = useWallet();
  const [filterType, setFilterType] = useState<FilterType>("ALL");
  const [dateRange, setDateRange] = useState<DateRange>("90d");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const itemsPerPage = 20;
  const [allEvents, setAllEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch activity from API
  useEffect(() => {
    if (!address) {
      setAllEvents([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/activity?address=${encodeURIComponent(address)}&limit=100`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.events)) {
          setAllEvents(data.events);
        }
      })
      .catch(() => {
        if (!cancelled) setAllEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [address]);

  // Filter by type
  const typeFiltered = useMemo(() => {
    if (filterType === "ALL") return allEvents;
    return allEvents.filter(e => e.type === filterType);
  }, [allEvents, filterType]);

  // Filter by date range
  const filtered = useMemo(() => {
    return getDateRangeFilter(dateRange, typeFiltered);
  }, [typeFiltered, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  // Summary stats
  const summary = useMemo(() => {
    return getActivitySummary(allEvents);
  }, [allEvents]);

  const toggleExpanded = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (walletState === "disconnected") {
    return (
      <div className="max-w-[1400px] mx-auto space-y-6">
        <PageHeader
          title="Activity"
          subtitle="Your on-chain transaction history"
        />
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.018)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: "rgba(34,211,238,0.08)",
              border: "1px solid rgba(34,211,238,0.18)",
            }}
          >
            <Wallet className="w-5 h-5" style={{ color: "#5B4BC9" }} />
          </div>
          <p className="text-[15px] font-semibold text-white mb-2" style={{ letterSpacing: "-0.01em" }}>
            No wallet connected
          </p>
          <p className="text-[13px] text-slate-500 text-center max-w-xs leading-relaxed">
            Connect your wallet to view your activity and transaction history.
          </p>
          <button
            onClick={openModal}
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
            style={{
              background: "rgba(34,211,238,0.12)",
              border: "1px solid rgba(34,211,238,0.22)",
              color: "#5B4BC9",
            }}
          >
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Activity"
        subtitle="Your on-chain transaction history"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Transactions"
          value={summary.totalTransactions.toString()}
          change={0}
          accent="cyan"
          icon={<Wallet className="w-4 h-4" />}
          index={0}
        />
        <StatCard
          label="Total Staked"
          value={`${summary.totalStaked.toFixed(2)} τ`}
          change={0}
          accent="emerald"
          icon={<Lock className="w-4 h-4" />}
          index={1}
        />
        <StatCard
          label="Total Unstaked"
          value={`${summary.totalUnstaked.toFixed(2)} τ`}
          change={0}
          accent="rose"
          icon={<Unlock className="w-4 h-4" />}
          index={2}
        />
        <StatCard
          label="Total Fees"
          value={`${summary.totalFees.toFixed(4)} τ`}
          change={0}
          accent="amber"
          icon={<ArrowUpRight className="w-4 h-4" />}
          index={3}
        />
      </div>

      {/* Filters */}
      <FadeIn delay={0.1}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end justify-between">
          {/* Type Filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Transaction Type
            </label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as FilterType);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-lg text-sm bg-white/[0.05] border border-white/[0.1] text-white focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
            >
              <option value="ALL">All Types</option>
              <option value="TRANSFER">Transfer</option>
              <option value="STAKE">Stake</option>
              <option value="UNSTAKE">Unstake</option>
              <option value="MOVE_STAKE">Move Stake</option>
              <option value="CLAIM">Claim</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Date Range
            </label>
            <div className="flex gap-2">
              {(["7d", "30d", "90d", "all"] as DateRange[]).map(range => (
                <button
                  key={range}
                  onClick={() => {
                    setDateRange(range);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200",
                    dateRange === range
                      ? "bg-cyan-400/20 border border-cyan-400/50 text-cyan-300"
                      : "bg-white/[0.05] border border-white/[0.1] text-slate-400 hover:border-white/[0.15]"
                  )}
                >
                  {range === "7d" ? "7d" : range === "30d" ? "30d" : range === "90d" ? "90d" : "All"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Activity List */}
      <FadeIn delay={0.15}>
        <GlassCard>
          <SectionTitle
            title="Transactions"
            subtitle={`${filtered.length} transactions found`}
          />
          <div className="mt-5 space-y-0">
            {loading ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                <p className="text-slate-500 text-sm">Loading transactions...</p>
              </div>
            ) : paginatedEvents.length > 0 ? (
              paginatedEvents.map((event) => {
                const typeColor = ACTIVITY_TYPE_COLORS[event.type];
                const isExpanded = expandedRows[event.id];

                return (
                  <div key={event.id} className="border-b border-white/[0.04] last:border-0">
                    {/* Main row */}
                    <div
                      onClick={() => toggleExpanded(event.id)}
                      className="flex items-center gap-3 py-4 cursor-pointer group hover:bg-white/[0.015] transition-colors duration-150 px-1"
                    >
                      {/* Icon */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all"
                        style={{
                          background: typeColor.bg,
                          border: `1px solid ${typeColor.border}`,
                          color: typeColor.text,
                        }}
                      >
                        {ACTIVITY_TYPE_ICONS[event.type]}
                      </div>

                      {/* Type & Addresses */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-white">
                            {ACTIVITY_TYPE_LABELS[event.type]}
                          </p>
                          <span
                            className="text-[10px] font-bold px-2 py-1 rounded-md"
                            style={{
                              background: typeColor.bg,
                              border: `1px solid ${typeColor.border}`,
                              color: typeColor.text,
                            }}
                          >
                            {event.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          {event.fromAddress} → {event.toAddress}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="text-right flex-shrink-0 hidden sm:block">
                        <p className="text-sm font-semibold text-white">
                          {event.amountTao.toFixed(2)} τ
                        </p>
                        <p className="text-xs text-slate-500">
                          Fee: {event.fee.toFixed(4)} τ
                        </p>
                      </div>

                      {/* Block & Timestamp */}
                      <div className="text-right flex-shrink-0 hidden lg:block">
                        <p className="text-xs font-mono text-slate-500">
                          #{event.blockNumber.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDate(event.timestamp)}
                        </p>
                      </div>

                      {/* Subnet */}
                      {event.subnet && (
                        <div className="text-right flex-shrink-0 hidden md:block">
                          <p className="text-xs font-semibold text-slate-400">
                            {event.subnet}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div
                        className="px-4 py-4 space-y-3 border-t border-white/[0.04]"
                        style={{
                          background: "rgba(255,255,255,0.008)",
                        }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Full From Address */}
                          <div>
                            <p className="text-slate-500 mb-1">From Address</p>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-slate-300 break-all">
                                {event.fromAddress}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(event.fromAddress);
                                }}
                                className="p-1 hover:bg-white/[0.1] rounded transition-colors"
                                title="Copy"
                              >
                                <Copy className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                              </button>
                            </div>
                          </div>

                          {/* Full To Address */}
                          <div>
                            <p className="text-slate-500 mb-1">To Address</p>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-slate-300 break-all">
                                {event.toAddress}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(event.toAddress);
                                }}
                                className="p-1 hover:bg-white/[0.1] rounded transition-colors"
                                title="Copy"
                              >
                                <Copy className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                              </button>
                            </div>
                          </div>

                          {/* TX Hash */}
                          <div>
                            <p className="text-slate-500 mb-1">Transaction Hash</p>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-slate-300 break-all">
                                {event.txHash}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(event.txHash);
                                }}
                                className="p-1 hover:bg-white/[0.1] rounded transition-colors flex-shrink-0"
                                title="Copy"
                              >
                                <Copy className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                              </button>
                            </div>
                          </div>

                          {/* Block Number */}
                          <div>
                            <p className="text-slate-500 mb-1">Block</p>
                            <p className="font-mono text-slate-300">
                              #{event.blockNumber.toLocaleString()}
                            </p>
                          </div>

                          {/* Amount Details */}
                          <div>
                            <p className="text-slate-500 mb-1">Amount</p>
                            <p className="font-mono text-emerald-300">
                              {event.amountTao.toFixed(6)} τ
                            </p>
                          </div>

                          {/* Fee Details */}
                          <div>
                            <p className="text-slate-500 mb-1">Fee</p>
                            <p className="font-mono text-slate-400">
                              {event.fee.toFixed(6)} τ
                            </p>
                          </div>

                          {/* Subnet */}
                          {event.subnet && (
                            <div>
                              <p className="text-slate-500 mb-1">Subnet</p>
                              <p className="font-mono text-slate-300">{event.subnet}</p>
                            </div>
                          )}

                          {/* Timestamp */}
                          <div>
                            <p className="text-slate-500 mb-1">Timestamp</p>
                            <p className="font-mono text-slate-300">
                              {new Date(event.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Block Explorer Link */}
                        <div className="pt-3 border-t border-white/[0.04]">
                          <a
                            href={`https://x.taostats.io/extrinsic/${event.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            View on TaoStats Explorer →
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center">
                <p className="text-slate-500 text-sm">No transactions found</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.04]">
              <div className="text-xs text-slate-500">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length)}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-white/[0.1] hover:border-white/[0.2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
                <span className="text-xs text-slate-500 font-semibold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-white/[0.1] hover:border-white/[0.2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </FadeIn>
    </div>
  );
}
