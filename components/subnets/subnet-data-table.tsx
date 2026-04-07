"use client";

import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubnetDetailModel } from "@/lib/types/subnets";

interface SubnetDataTableProps {
  subnets: SubnetDetailModel[];
  onSelect: (netuid: number) => void;
}

type SortKey =
  | "name"
  | "emissions"
  | "alphaPrice"
  | "change1h"
  | "change24h"
  | "change1w"
  | "change1m"
  | "marketCap"
  | "volume24h"
  | "volumeCapRatio"
  | "flow24h"
  | "flow1w"
  | "flow1m"
  | "dailyChainBuys"
  | "incentivePct"
  | "liquidity";

interface SortState {
  key: SortKey;
  direction: "asc" | "desc";
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

function formatPrice(value: number): string {
  return value.toFixed(6);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function getChangeColor(value: number): string {
  if (value >= 0) return "text-green-400";
  return "text-red-400";
}

export function SubnetDataTable({ subnets, onSelect }: SubnetDataTableProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "emissions", direction: "desc" });
  const [includeRoot, setIncludeRoot] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [currency, setCurrency] = useState<"tau" | "usd">("tau");
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(0);

  const filtered = useMemo(() => {
    let list = [...subnets];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          String(s.netuid).includes(q) ||
          s.symbol.toLowerCase().includes(q),
      );
    }

    if (!includeRoot) {
      list = list.filter((s) => s.netuid !== 0);
    }

    if (!includeInactive) {
      list = list.filter((s) => s.age > 7); // basic inactive filter
    }

    // Sort
    list.sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];

      if (aVal === undefined || bVal === undefined) return 0;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sort.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return list;
  }, [subnets, search, includeRoot, includeInactive, sort]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginatedSubnets = filtered.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage,
  );

  function toggleSort(key: SortKey) {
    if (sort.key === key) {
      setSort({
        key,
        direction: sort.direction === "asc" ? "desc" : "asc",
      });
    } else {
      setSort({ key, direction: "desc" });
    }
  }

  const headers: Array<{ key: SortKey; label: string; align?: "left" | "center" | "right" }> = [
    { key: "name", label: "#", align: "center" },
    { key: "name", label: "Star", align: "center" },
    { key: "name", label: "Subnet", align: "left" },
    { key: "emissions", label: "Emission", align: "right" },
    { key: "alphaPrice", label: "Price τ", align: "right" },
    { key: "change1h", label: "1H", align: "right" },
    { key: "change24h", label: "24H", align: "right" },
    { key: "change1w", label: "1W", align: "right" },
    { key: "change1m", label: "1M", align: "right" },
    { key: "marketCap", label: "MCap", align: "right" },
    { key: "volume24h", label: "Vol (24H)", align: "right" },
    { key: "volumeCapRatio", label: "Vol/Cap", align: "right" },
    { key: "flow24h", label: "Flow (24H)", align: "right" },
    { key: "flow1w", label: "Flow (1W)", align: "right" },
    { key: "flow1m", label: "Flow (1M)", align: "right" },
    { key: "dailyChainBuys", label: "Buys", align: "right" },
    { key: "incentivePct", label: "Incentive", align: "right" },
    { key: "liquidity", label: "Liquidity", align: "right" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="glass rounded-xl p-4 space-y-4">
        {/* Search and currency */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(0);
              }}
              placeholder="Search by Subnet or Netuid..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/[0.07] bg-white/[0.03] text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/40 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white/[0.03] rounded-lg p-1 border border-white/[0.07]">
            <button
              onClick={() => setCurrency("tau")}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium transition-all",
                currency === "tau"
                  ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30"
                  : "text-slate-500 hover:text-slate-300",
              )}
            >
              TAO
            </button>
            <button
              onClick={() => setCurrency("usd")}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium transition-all",
                currency === "usd"
                  ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30"
                  : "text-slate-500 hover:text-slate-300",
              )}
            >
              USD
            </button>
          </div>
        </div>

        {/* Toggles and pagination */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={includeRoot}
                onChange={(e) => setIncludeRoot(e.target.checked)}
                className="w-4 h-4 rounded border border-slate-500 accent-cyan-400"
              />
              Include Root
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="w-4 h-4 rounded border border-slate-500 accent-cyan-400"
              />
              Include Inactive
            </label>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Rows:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(0);
              }}
              className="bg-white/[0.05] border border-white/[0.07] rounded px-2 py-1 text-slate-300 text-xs"
            >
              <option>10</option>
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        {paginatedSubnets.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
            No subnets match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.04]">
                  {headers.map((header) => (
                    <th
                      key={header.key}
                      onClick={() => {
                        if (header.key !== "name") {
                          toggleSort(header.key);
                        }
                      }}
                      className={cn(
                        "px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wider",
                        header.align === "right" && "text-right",
                        header.align === "center" && "text-center",
                        header.key !== "name" && "cursor-pointer hover:text-slate-400 transition-colors",
                      )}
                    >
                      <div className="flex items-center gap-1 justify-between">
                        <span>{header.label}</span>
                        {sort.key === header.key && header.key !== "name" && (
                          <span>
                            {sort.direction === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedSubnets.map((subnet, idx) => (
                  <tr
                    key={subnet.netuid}
                    onClick={() => onSelect(subnet.netuid)}
                    className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-colors h-11"
                  >
                    {/* Rank */}
                    <td className="px-3 py-2 text-center font-mono text-slate-500">
                      {currentPage * rowsPerPage + idx + 1}
                    </td>

                    {/* Star */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-600 hover:text-yellow-400 transition-colors"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    </td>

                    {/* Subnet name + netuid */}
                    <td className="px-3 py-2 text-left">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                          style={{
                            background: `linear-gradient(135deg, hsl(${(subnet.netuid * 37) % 360}, 70%, 50%), hsl(${(subnet.netuid * 73) % 360}, 70%, 40%))`,
                          }}
                        >
                          {subnet.netuid}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate text-xs">
                            {subnet.name}
                          </div>
                          <div className="text-[9px] text-slate-600 font-mono">
                            SN{subnet.netuid}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Emission % */}
                    <td className="px-3 py-2 text-right font-mono text-slate-300">
                      {(subnet.emissions * 100).toFixed(1)}%
                    </td>

                    {/* Price τ */}
                    <td className="px-3 py-2 text-right font-mono text-slate-300">
                      {formatPrice(subnet.alphaPrice ?? 0)}
                    </td>

                    {/* 1H change */}
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-mono",
                        getChangeColor(subnet.change1h ?? 0),
                      )}
                    >
                      {formatPercent(subnet.change1h ?? 0)}
                    </td>

                    {/* 24H change */}
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-mono",
                        getChangeColor(subnet.change24h ?? 0),
                      )}
                    >
                      {formatPercent(subnet.change24h ?? 0)}
                    </td>

                    {/* 1W change */}
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-mono",
                        getChangeColor(subnet.change1w ?? 0),
                      )}
                    >
                      {formatPercent(subnet.change1w ?? 0)}
                    </td>

                    {/* 1M change */}
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-mono",
                        getChangeColor(subnet.change1m ?? 0),
                      )}
                    >
                      {formatPercent(subnet.change1m ?? 0)}
                    </td>

                    {/* Market Cap */}
                    <td className="px-3 py-2 text-right font-mono text-slate-300">
                      {formatCompact(subnet.marketCap ?? 0)} τ
                    </td>

                    {/* Volume 24H */}
                    <td className="px-3 py-2 text-right font-mono text-slate-300">
                      {formatCompact(subnet.volume24h ?? 0)} τ
                    </td>

                    {/* Vol/Cap Ratio */}
                    <td className="px-3 py-2 text-right font-mono text-slate-300">
                      {(subnet.volumeCapRatio ?? 0).toFixed(1)}%
                    </td>

                    {/* Flow 24H */}
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-mono",
                        getChangeColor(subnet.flow24h ?? 0),
                      )}
                    >
                      {formatCompact(Math.abs(subnet.flow24h ?? 0))} τ
                    </td>

                    {/* Flow 1W */}
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-mono",
                        getChangeColor(subnet.flow1w ?? 0),
                      )}
                    >
                      {formatCompact(Math.abs(subnet.flow1w ?? 0))} τ
                    </td>

                    {/* Flow 1M */}
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-mono",
                        getChangeColor(subnet.flow1m ?? 0),
                      )}
                    >
                      {formatCompact(Math.abs(subnet.flow1m ?? 0))} τ
                    </td>

                    {/* Daily Chain Buys */}
                    <td className="px-3 py-2 text-right font-mono text-slate-300">
                      {subnet.dailyChainBuys ?? 0}
                    </td>

                    {/* Incentive % */}
                    <td className="px-3 py-2 text-right font-mono text-slate-300">
                      {(subnet.incentivePct ?? 0).toFixed(1)}%
                    </td>

                    {/* Liquidity */}
                    <td className="px-3 py-2 text-right font-mono text-slate-300">
                      {formatCompact(subnet.liquidity)} τ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {filtered.length === 0 ? 0 : currentPage * rowsPerPage + 1} to{" "}
            {Math.min((currentPage + 1) * rowsPerPage, filtered.length)} of {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-2.5 py-1.5 rounded border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={cn(
                    "px-2 py-1 rounded text-xs transition-colors",
                    currentPage === i
                      ? "bg-cyan-400/20 text-cyan-300"
                      : "border border-white/[0.07] bg-white/[0.03] text-slate-400 hover:bg-white/[0.05]",
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-2.5 py-1.5 rounded border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
