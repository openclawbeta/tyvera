"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Shield,
  Search,
  Copy,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { StatCard } from "@/components/ui-custom/stat-card";
import { ValidatorInfo, ValidatorSummary } from "@/lib/types/validators";
import { getValidators, getValidatorSummary } from "@/lib/api/validators";

type SortField =
  | "rank"
  | "name"
  | "dominance"
  | "nominators"
  | "activeSubnets"
  | "totalWeight"
  | "weightChange24h"
  | "rootStake"
  | "alphaStake";
type SortOrder = "asc" | "desc";
type ViewMode = "list" | "grid";

function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-12 rounded-lg bg-slate-800/30 animate-pulse"
        />
      ))}
    </div>
  );
}

export default function ValidatorsPage() {
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [summary, setSummary] = useState<ValidatorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("totalWeight");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  const ITEMS_PER_PAGE = 25;

  // Load validators on mount
  useEffect(() => {
    const loadValidators = () => {
      try {
        setLoading(true);
        const data = getValidators();
        setValidators(data);
        setSummary(getValidatorSummary(data));
      } catch (error) {
        /* validator data load failed */
        setValidators([]);
      } finally {
        setLoading(false);
      }
    };

    loadValidators();
  }, []);

  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    let filtered = validators;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.name.toLowerCase().includes(term) ||
          v.address.toLowerCase().includes(term)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        const cmp = aVal.localeCompare(bVal);
        return sortOrder === "asc" ? cmp : -cmp;
      }

      return 0;
    });

    return sorted;
  }, [validators, sortField, sortOrder, searchTerm]);

  // Paginate
  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const paginatedData = filteredAndSorted.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(0);
  };

  const toggleFavorite = (rank: number) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(rank)) {
      newFavorites.delete(rank);
    } else {
      newFavorites.add(rank);
    }
    setFavorites(newFavorites);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <div className="w-4 h-4" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4 text-cyan-400" />
    ) : (
      <ChevronDown className="w-4 h-4 text-cyan-400" />
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Validators"
          subtitle="Top validators on the Bittensor network"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-slate-800/30 animate-pulse"
            />
          ))}
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Validators"
        subtitle="Top validators on the Bittensor network"
      >
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Filter by Validator"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
              }}
              className="pl-9 pr-4 py-2 rounded-lg text-sm bg-slate-900/40 border border-white/[0.08] text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-all"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-slate-900/20 rounded-lg p-0.5 border border-white/[0.08]">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3 py-2 rounded-md text-xs font-medium transition-all duration-150",
                viewMode === "list"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-300"
              )}
              title="List view"
            >
              ≡
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "px-3 py-2 rounded-md text-xs font-medium transition-all duration-150",
                viewMode === "grid"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-300"
              )}
              title="Grid view"
            >
              ⊞
            </button>
          </div>
        </div>
      </PageHeader>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Validators"
            value={summary.totalValidators.toString()}
            accent="cyan"
            icon={<Users className="w-4 h-4" />}
            index={0}
          />
          <StatCard
            label="Total Staked"
            value={`${(summary.totalStake / 1_000_000).toFixed(1)}M τ`}
            accent="emerald"
            index={1}
          />
          <StatCard
            label="Total Nominators"
            value={`${(summary.totalNominators / 1_000_000).toFixed(1)}M`}
            accent="violet"
            index={2}
          />
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <GlassCard padding="none">
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.018)",
              border: "1px solid rgba(255,255,255,0.065)",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="px-4 py-3 text-left w-10">
                      <div className="w-4 h-4" />
                    </th>
                    {[
                      { field: "rank" as const, label: "#", width: "w-12" },
                      {
                        field: "name" as const,
                        label: "Validator",
                        width: "w-48",
                      },
                      {
                        field: "dominance" as const,
                        label: "Dominance",
                        width: "w-24",
                      },
                      {
                        field: "nominators" as const,
                        label: "Nominators",
                        width: "w-28",
                      },
                      {
                        field: "activeSubnets" as const,
                        label: "Subnets",
                        width: "w-20",
                      },
                      {
                        field: "totalWeight" as const,
                        label: "Total Weight",
                        width: "w-28",
                      },
                      {
                        field: "weightChange24h" as const,
                        label: "Weight 24h",
                        width: "w-28",
                      },
                      {
                        field: "rootStake" as const,
                        label: "Root Stake",
                        width: "w-28",
                      },
                      {
                        field: "alphaStake" as const,
                        label: "Alpha Stake",
                        width: "w-28",
                      },
                    ].map(({ field, label, width }) => (
                      <th
                        key={field}
                        onClick={() => handleSort(field)}
                        className={cn(
                          "px-4 py-3 text-left cursor-pointer hover:bg-slate-800/20 transition-colors",
                          width
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-semibold text-slate-400 uppercase"
                            style={{ letterSpacing: "0.04em" }}
                          >
                            {label}
                          </span>
                          <SortIcon field={field} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                        No validators found
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((validator) => (
                      <tr
                        key={validator.rank}
                        className="border-b border-white/[0.04] hover:bg-slate-800/10 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleFavorite(validator.rank)}
                            className="transition-colors hover:text-amber-300"
                          >
                            <Star
                              className={cn(
                                "w-4 h-4",
                                favorites.has(validator.rank)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-600"
                              )}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-white">
                          {validator.rank}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          <div className="flex items-center gap-2">
                            {validator.verified && (
                              <Shield className="w-4 h-4 text-emerald-400" />
                            )}
                            <div>
                              <div className="text-white font-medium">
                                {validator.name}
                              </div>
                              {validator.verified && (
                                <div className="text-xs text-emerald-400 font-semibold">
                                  ✓ Verified
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-white tabular-nums">
                          {validator.dominance.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-white tabular-nums">
                          <div className="flex items-center gap-2">
                            <span>
                              {(validator.nominators / 1000).toFixed(1)}K
                            </span>
                            {validator.change24h !== 0 && (
                              <span
                                className={cn(
                                  "text-xs font-semibold",
                                  validator.change24h > 0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                )}
                              >
                                {validator.change24h > 0 ? "▲" : "▼"}{" "}
                                {Math.abs(validator.change24h).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-white tabular-nums">
                          {validator.activeSubnets}
                        </td>
                        <td className="px-4 py-3 text-sm text-white tabular-nums">
                          {(validator.totalWeight / 1000).toFixed(1)}K
                        </td>
                        <td className="px-4 py-3 text-sm tabular-nums">
                          <span
                            className={cn(
                              "font-semibold",
                              validator.weightChange24h > 0
                                ? "text-emerald-400"
                                : validator.weightChange24h < 0
                                  ? "text-rose-400"
                                  : "text-slate-400"
                            )}
                          >
                            {validator.weightChange24h > 0 ? "+" : ""}
                            {(validator.weightChange24h / 1000).toFixed(1)}K τ
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-white tabular-nums">
                          {(validator.rootStake / 1000).toFixed(1)}K τ
                        </td>
                        <td className="px-4 py-3 text-sm text-white tabular-nums">
                          {(validator.alphaStake / 1000).toFixed(1)}K τ
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-4 border-t border-white/[0.04] flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Page {currentPage + 1} of {totalPages} (
                {filteredAndSorted.length} results)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    currentPage === 0
                      ? "bg-slate-900/20 text-slate-600 cursor-not-allowed"
                      : "bg-slate-800/40 text-slate-300 hover:bg-slate-700/40"
                  )}
                >
                  Previous
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum =
                    currentPage < 3
                      ? i
                      : currentPage > totalPages - 3
                        ? totalPages - 5 + i
                        : currentPage - 2 + i;
                  if (pageNum < 0 || pageNum >= totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "px-2 py-1.5 rounded-lg text-xs font-medium transition-all",
                        currentPage === pageNum
                          ? "bg-cyan-600/30 text-cyan-300 border border-cyan-400/30"
                          : "bg-slate-800/20 text-slate-400 hover:bg-slate-700/30"
                      )}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    currentPage === totalPages - 1
                      ? "bg-slate-900/20 text-slate-600 cursor-not-allowed"
                      : "bg-slate-800/40 text-slate-300 hover:bg-slate-700/40"
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedData.map((validator) => (
            <GlassCard
              key={validator.rank}
              className="space-y-3 hover:border-white/10 cursor-pointer transition-all"
              hover
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {validator.verified && (
                      <Shield className="w-4 h-4 text-emerald-400" />
                    )}
                    <div className="text-sm font-semibold text-white">
                      #{validator.rank}
                    </div>
                  </div>
                  <div className="text-[13px] text-slate-400">
                    {validator.name}
                  </div>
                </div>
                <button
                  onClick={() => toggleFavorite(validator.rank)}
                  className="transition-colors"
                >
                  <Star
                    className={cn(
                      "w-5 h-5",
                      favorites.has(validator.rank)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-600 hover:text-amber-300"
                    )}
                  />
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Dominance</span>
                  <span className="text-white font-semibold">
                    {validator.dominance.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Nominators</span>
                  <span className="text-white font-semibold">
                    {(validator.nominators / 1000).toFixed(1)}K
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Active Subnets</span>
                  <span className="text-white font-semibold">
                    {validator.activeSubnets}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total Weight</span>
                  <span className="text-white font-semibold">
                    {(validator.totalWeight / 1000).toFixed(1)}K
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Root Stake</span>
                  <span className="text-white font-semibold">
                    {(validator.rootStake / 1000).toFixed(1)}K τ
                  </span>
                </div>
              </div>

              {/* Copy address button */}
              <button
                onClick={() => copyToClipboard(validator.address)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs bg-slate-800/40 border border-white/[0.08] text-slate-400 hover:bg-slate-700/40 hover:text-slate-300 transition-all mt-2"
                title={validator.address}
              >
                <Copy className="w-3 h-3" />
                {truncateAddress(validator.address)}
              </button>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Grid pagination */}
      {viewMode === "grid" && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Page {currentPage + 1} of {totalPages} (
            {filteredAndSorted.length} results)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                currentPage === 0
                  ? "bg-slate-900/20 text-slate-600 cursor-not-allowed"
                  : "bg-slate-800/40 text-slate-300 hover:bg-slate-700/40"
              )}
            >
              Previous
            </button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum =
                currentPage < 3
                  ? i
                  : currentPage > totalPages - 3
                    ? totalPages - 5 + i
                    : currentPage - 2 + i;
              if (pageNum < 0 || pageNum >= totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "px-2 py-1.5 rounded-lg text-xs font-medium transition-all",
                    currentPage === pageNum
                      ? "bg-cyan-600/30 text-cyan-300 border border-cyan-400/30"
                      : "bg-slate-800/20 text-slate-400 hover:bg-slate-700/30"
                  )}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                currentPage === totalPages - 1
                  ? "bg-slate-900/20 text-slate-600 cursor-not-allowed"
                  : "bg-slate-800/40 text-slate-300 hover:bg-slate-700/40"
              )}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
