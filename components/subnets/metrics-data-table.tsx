"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { YieldOutlierTag } from "@/components/subnets/subnet-risk-banner";
import type { SubnetDetailModel, RiskLevel } from "@/lib/types/subnets";

interface MetricsDataTableProps {
  subnets: SubnetDetailModel[];
  onSelect: (netuid: number) => void;
}

type SortKey =
  | "name"
  | "score"
  | "yield"
  | "risk"
  | "liquidity"
  | "stakers"
  | "emissions"
  | "flow24h"
  | "flowPct"
  | "yieldDelta7d"
  | "confidence";

interface SortState {
  key: SortKey;
  direction: "asc" | "desc";
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

function formatFlow(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatCompact(value)} τ`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function getFlow24h(subnet: SubnetDetailModel): number {
  if (typeof subnet.flow24h === "number") return subnet.flow24h;
  if (typeof subnet.inflow === "number") return subnet.inflow;
  return 0;
}

function getFlowPct(subnet: SubnetDetailModel): number {
  if (typeof subnet.inflowPct === "number") return subnet.inflowPct;
  if (subnet.liquidity > 0) return (getFlow24h(subnet) / subnet.liquidity) * 100;
  return 0;
}

function getChangeColor(value: number): string {
  return value >= 0 ? "text-green-400" : "text-red-400";
}

function riskOrder(risk: RiskLevel): number {
  if (risk === "LOW") return 1;
  if (risk === "MODERATE") return 2;
  if (risk === "HIGH") return 3;
  return 4;
}

export function MetricsDataTable({ subnets, onSelect }: MetricsDataTableProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "score", direction: "desc" });
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

    list.sort((a, b) => {
      const direction = sort.direction === "asc" ? 1 : -1;

      switch (sort.key) {
        case "name":
          return a.name.localeCompare(b.name) * direction;
        case "score":
          return (a.score - b.score) * direction;
        case "yield":
          return (a.yield - b.yield) * direction;
        case "risk":
          return (riskOrder(a.risk) - riskOrder(b.risk)) * direction;
        case "liquidity":
          return (a.liquidity - b.liquidity) * direction;
        case "stakers":
          return (a.stakers - b.stakers) * direction;
        case "emissions":
          return (a.emissions - b.emissions) * direction;
        case "flow24h":
          return (getFlow24h(a) - getFlow24h(b)) * direction;
        case "flowPct":
          return (getFlowPct(a) - getFlowPct(b)) * direction;
        case "yieldDelta7d":
          return (a.yieldDelta7d - b.yieldDelta7d) * direction;
        case "confidence":
          return ((a.confidence ?? 0) - (b.confidence ?? 0)) * direction;
        default:
          return (a.score - b.score) * direction;
      }
    });

    return list;
  }, [subnets, search, sort]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginatedSubnets = filtered.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage,
  );

  function toggleSort(key: SortKey) {
    if (sort.key === key) {
      setSort({ key, direction: sort.direction === "asc" ? "desc" : "asc" });
    } else {
      setSort({ key, direction: key === "name" || key === "risk" ? "asc" : "desc" });
    }
  }

  const headers: Array<{ key: SortKey | "rank" | "star" | "subnet"; label: string; align?: "left" | "center" | "right" }> = [
    { key: "rank", label: "#", align: "center" },
    { key: "star", label: "Star", align: "center" },
    { key: "subnet", label: "Subnet", align: "left" },
    { key: "yield", label: "Yield", align: "right" },
    { key: "score", label: "Score", align: "right" },
    { key: "risk", label: "Risk", align: "right" },
    { key: "liquidity", label: "Liquidity", align: "right" },
    { key: "stakers", label: "Stakers", align: "right" },
    { key: "emissions", label: "Emission/Day", align: "right" },
    { key: "flow24h", label: "Flow (24H)", align: "right" },
    { key: "flowPct", label: "Flow %", align: "right" },
    { key: "yieldDelta7d", label: "7D", align: "right" },
    { key: "confidence", label: "Conf.", align: "right" },
  ];

  return (
    <div className="flex flex-col gap-4 max-w-full overflow-hidden">
      <div className="glass rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-3 justify-between flex-wrap">
          <div className="flex-1 relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(0);
              }}
              placeholder="Search by subnet or netuid..."
              aria-label="Search metrics subnets by name or netuid"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/[0.1] bg-slate-900/60 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Rows:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(0);
              }}
              aria-label="Metrics rows per page"
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

      <div className="glass rounded-xl overflow-hidden">
        {paginatedSubnets.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
            No subnets match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto" role="region" aria-label="Metrics data table">
            <table className="w-full text-xs" aria-label="Tyvera subnet metrics">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.04]">
                  {headers.map((header) => {
                    const sortable = !["rank", "star", "subnet"].includes(header.key);
                    const active = sortable && sort.key === header.key;
                    return (
                      <th
                        key={header.key}
                        onClick={() => {
                          if (sortable) toggleSort(header.key as SortKey);
                        }}
                        className={cn(
                          "px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wider",
                          header.align === "right" && "text-right",
                          header.align === "center" && "text-center",
                          sortable && "cursor-pointer hover:text-slate-300 transition-colors",
                          active && "text-cyan-300",
                        )}
                      >
                        <div className="flex items-center gap-1 justify-between">
                          <span>{header.label}</span>
                          {active && (
                            <span>
                              {sort.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedSubnets.map((subnet, idx) => {
                  const flow24 = getFlow24h(subnet);
                  const flowPct = getFlowPct(subnet);
                  return (
                    <tr
                      key={subnet.netuid}
                      onClick={() => onSelect(subnet.netuid)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelect(subnet.netuid);
                        }
                      }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-colors h-11"
                    >
                      <td className="px-3 py-2 text-center font-mono text-slate-500">
                        {currentPage * rowsPerPage + idx + 1}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Bookmark subnet ${subnet.name}`}
                          className="text-slate-600 hover:text-yellow-400 transition-colors"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      </td>
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
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white truncate text-xs">{subnet.name}</span>
                              <YieldOutlierTag yield={subnet.yield} />
                            </div>
                            <div className="text-[9px] text-slate-600 font-mono">SN{subnet.netuid}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{subnet.yield.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{subnet.score.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{subnet.risk}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{formatCompact(subnet.liquidity)} τ</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{formatCompact(subnet.stakers)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{subnet.emissions.toFixed(1)} τ</td>
                      <td className={cn("px-3 py-2 text-right font-mono", getChangeColor(flow24))}>{formatFlow(flow24)}</td>
                      <td className={cn("px-3 py-2 text-right font-mono", getChangeColor(flowPct))}>{formatPercent(flowPct)}</td>
                      <td className={cn("px-3 py-2 text-right font-mono", getChangeColor(subnet.yieldDelta7d))}>{formatPercent(subnet.yieldDelta7d)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{subnet.confidence ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {filtered.length === 0 ? 0 : currentPage * rowsPerPage + 1} to {Math.min((currentPage + 1) * rowsPerPage, filtered.length)} of {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-2.5 py-1.5 rounded border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
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
