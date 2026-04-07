"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetagraphNeuron {
  uid: number;
  hotkey: string;
  type: "validator" | "miner";
  stake: number;
  trust: number;
  consensus: number;
  incentive: number;
  dividends: number;
  emissionPerDay: number;
}

type SortField = "uid" | "hotkey" | "type" | "stake" | "trust" | "consensus" | "incentive" | "dividends" | "emissionPerDay";
type SortOrder = "asc" | "desc";

interface MetagraphTableProps {
  netuid: number;
}

function truncateHotkey(hotkey: string, length = 12): string {
  if (hotkey.length <= length) return hotkey;
  const half = Math.floor(length / 2);
  return `${hotkey.slice(0, half)}...${hotkey.slice(-half)}`;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-10 rounded-lg bg-slate-800/30 animate-pulse"
        />
      ))}
    </div>
  );
}

export function MetagraphTable({ netuid }: MetagraphTableProps) {
  const [neurons, setNeurons] = useState<MetagraphNeuron[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("uid");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<"all" | "validators" | "miners">("all");

  const ITEMS_PER_PAGE = 20;

  // Fetch metagraph data
  useEffect(() => {
    const fetchMetagraph = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/metagraph?netuid=${netuid}`);
        if (!response.ok) throw new Error("Failed to fetch metagraph");
        const data = await response.json();
        setNeurons(Array.isArray(data) ? data : []);
      } catch (error) {
        setNeurons([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMetagraph();
  }, [netuid]);

  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    let filtered = neurons;

    // Apply type filter
    if (typeFilter === "validators") {
      filtered = filtered.filter((n) => n.type === "validator");
    } else if (typeFilter === "miners") {
      filtered = filtered.filter((n) => n.type === "miner");
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((n) => n.hotkey.toLowerCase().includes(term));
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
  }, [neurons, sortField, sortOrder, searchTerm, typeFilter]);

  // Paginate
  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const paginatedData = filteredAndSorted.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const validatorCount = neurons.filter((n) => n.type === "validator").length;
  const minerCount = neurons.filter((n) => n.type === "miner").length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(0);
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
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">
          <span className="text-white font-semibold">{validatorCount}</span> Validators{" "}
          <span className="text-slate-600">|</span>{" "}
          <span className="text-white font-semibold">{minerCount}</span> Miners
        </div>

        {/* Search + filter row */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search hotkey..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0);
            }}
            className="px-3 py-1.5 rounded-lg text-sm bg-slate-900/40 border border-white/[0.08] text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
          />

          {/* Type tabs */}
          <div className="flex items-center gap-1 bg-slate-900/20 rounded-lg p-0.5 border border-white/[0.08]">
            {(["all", "validators", "miners"] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setTypeFilter(type);
                  setCurrentPage(0);
                }}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-all duration-150",
                  typeFilter === type
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-slate-300"
                )}
              >
                {type === "all" ? "All" : type === "validators" ? "Validators" : "Miners"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
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
                {[
                  { field: "uid" as const, label: "UID", width: "w-20" },
                  { field: "hotkey" as const, label: "Hotkey", width: "w-32" },
                  { field: "type" as const, label: "Type", width: "w-24" },
                  { field: "stake" as const, label: "Stake (τ)", width: "w-24" },
                  { field: "trust" as const, label: "Trust", width: "w-20" },
                  { field: "consensus" as const, label: "Consensus", width: "w-24" },
                  { field: "incentive" as const, label: "Incentive", width: "w-20" },
                  { field: "dividends" as const, label: "Dividends", width: "w-20" },
                  { field: "emissionPerDay" as const, label: "Emission/day (τ)", width: "w-28" },
                ].map(({ field, label, width }) => (
                  <th
                    key={field}
                    onClick={() => handleSort(field)}
                    className={cn("px-4 py-3 text-left cursor-pointer hover:bg-slate-800/20 transition-colors", width)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase" style={{ letterSpacing: "0.04em" }}>
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
                    No neurons found
                  </td>
                </tr>
              ) : (
                paginatedData.map((neuron, idx) => (
                  <tr
                    key={`${neuron.uid}-${idx}`}
                    className="border-b border-white/[0.04] hover:bg-slate-800/10 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-white">{neuron.uid}</td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-300" title={neuron.hotkey}>
                      {truncateHotkey(neuron.hotkey)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {neuron.type === "validator" ? (
                          <>
                            <Shield className="w-4 h-4 text-cyan-400" />
                            <span className="text-cyan-300">Validator</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-300">Miner</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white tabular-nums">
                      {neuron.stake.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-white tabular-nums">
                      {(neuron.trust * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-sm text-white tabular-nums">
                      {(neuron.consensus * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-sm text-white tabular-nums">
                      {(neuron.incentive * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-sm text-white tabular-nums">
                      {(neuron.dividends * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-sm text-white tabular-nums">
                      {neuron.emissionPerDay.toFixed(4)} τ
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
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Page {currentPage + 1} of {totalPages} ({filteredAndSorted.length} results)
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
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={cn(
                  "px-2 py-1.5 rounded-lg text-xs font-medium transition-all",
                  currentPage === i
                    ? "bg-cyan-600/30 text-cyan-300 border border-cyan-400/30"
                    : "bg-slate-800/20 text-slate-400 hover:bg-slate-700/30"
                )}
              >
                {i + 1}
              </button>
            ))}
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
