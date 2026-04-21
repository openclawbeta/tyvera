"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Shield, Search, Copy, Star, Users, Radar, Layers3 } from "lucide-react";
import { ExportButton } from "@/components/ui-custom/export-button";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { StatCard } from "@/components/ui-custom/stat-card";
import { ValidatorInfo, ValidatorSummary } from "@/lib/types/validators";
import { getValidators, getValidatorSummary } from "@/lib/api/validators";

interface ValidatorApiResponse {
  validators: ValidatorInfo[];
  summary: ValidatorSummary;
  _meta?: {
    source?: string;
    fallbackUsed?: boolean;
    stale?: boolean;
    servedAt?: string;
    note?: string;
  };
}

type SortField = "rank" | "name" | "dominance" | "nominators" | "activeSubnets" | "totalWeight" | "weightChange24h" | "rootStake" | "alphaStake";
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
        <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-800/30" />
      ))}
    </div>
  );
}

export default function ValidatorsPage() {
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [summary, setSummary] = useState<ValidatorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceMeta, setSourceMeta] = useState<ValidatorApiResponse["_meta"] | null>(null);
  const [sortField, setSortField] = useState<SortField>("totalWeight");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  const ITEMS_PER_PAGE = 25;

  useEffect(() => {
    const fallback = getValidators();
    setValidators(fallback);
    setSummary(getValidatorSummary(fallback));

    fetch("/api/validators", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: ValidatorApiResponse) => {
        setValidators(data.validators);
        setSummary(data.summary);
        setSourceMeta(data._meta ?? null);
      })
      .catch(() => {
        /* keep fallback data */
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredAndSorted = useMemo(() => {
    let filtered = validators;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((v) => v.name.toLowerCase().includes(term) || v.address.toLowerCase().includes(term));
    }

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

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const paginatedData = filteredAndSorted.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

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
    const next = new Set(favorites);
    if (next.has(rank)) next.delete(rank);
    else next.add(rank);
    setFavorites(next);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <div className="h-4 w-4" />;
    return sortOrder === "asc" ? <ChevronUp className="h-4 w-4 text-cyan-400" /> : <ChevronDown className="h-4 w-4 text-cyan-400" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Validator Sets" subtitle="Validator-oriented network coverage with explicit source and fallback handling" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-800/30" />
          ))}
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Validator Sets" subtitle="Top validator-oriented network sets with source-aware fallback handling">
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="inline-flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Operator shortlist surface
          </div>
          {sourceMeta && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-200">Source:</span>
              <span>{sourceMeta.source ?? "unknown"}</span>
              {sourceMeta.fallbackUsed ? <span className="text-amber-300">fallback</span> : <span className="text-emerald-300">primary</span>}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter by validator"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
              }}
              className="rounded-lg border border-white/[0.08] bg-slate-900/40 py-2 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 transition-all focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-slate-900/20 p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={cn("rounded-md px-3 py-2 text-xs font-medium transition-all duration-150", viewMode === "list" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-300")}
              title="List view"
            >
              ≡
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn("rounded-md px-3 py-2 text-xs font-medium transition-all duration-150", viewMode === "grid" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-300")}
              title="Grid view"
            >
              ⊞
            </button>
          </div>
          <ExportButton exportType="validators" />
        </div>
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <div
          className="relative overflow-hidden rounded-[28px] border border-white/8 p-6 md:p-7"
          style={{
            background:
              "linear-gradient(160deg, rgba(34,211,238,0.08) 0%, rgba(79,124,255,0.045) 28%, rgba(255,255,255,0.018) 62%, rgba(255,255,255,0.012) 100%)",
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 40px rgba(34,211,238,0.04)",
          }}
        >
          <div className="absolute right-0 top-0 h-40 w-56 pointer-events-none" style={{ background: "radial-gradient(circle at top right, rgba(34,211,238,0.16), transparent 68%)" }} />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              <Radar className="h-3 w-3" />
              validator shortlist engine
            </div>

            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white md:text-[40px]">
              Rank the operators
              <span className="block bg-[linear-gradient(135deg,#67e8f9_0%,#4f7cff_55%,#8b5cf6_100%)] bg-clip-text text-transparent">
                that deserve attention.
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-[15px]">
              Validator Sets is a shortlist and comparison surface: search, rank, favorite, and switch views to identify which validator-oriented sets matter operationally.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                { label: "Selection mode", value: "Shortlist-first", note: "Search, rank, and favorite quickly", tone: "text-cyan-300" },
                { label: "Source posture", value: sourceMeta?.fallbackUsed ? "Fallback-aware" : "Primary-aware", note: sourceMeta?.source ?? "Validator feed status", tone: sourceMeta?.fallbackUsed ? "text-amber-300" : "text-white" },
                { label: "Trust model", value: "Source-aware", note: "Provider state remains visible while browsing", tone: "text-emerald-300" },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</div>
                  <div className={cn("mt-2 text-base font-semibold tracking-tight", card.tone)}>{card.value}</div>
                  <div className="mt-1 text-xs text-slate-500">{card.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {[
            {
              label: "Coverage surface",
              title: "Compare validator-oriented sets across the network.",
              detail: "This page is for finding who matters, who dominates, and which validator sets deserve operational attention.",
            },
            {
              label: "Source discipline",
              title: "Fallback state is visible by design.",
              detail: "Primary vs fallback provider state stays surfaced so the table remains useful without pretending certainty.",
            },
            {
              label: "Operator workflow",
              title: "Search, rank, and shortlist quickly.",
              detail: "Favorites, search, sort, and grid/list mode should support shortlisting validators, not just browsing them.",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 shadow-[0_14px_50px_rgba(0,0,0,0.24)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
              <div className="mt-3 text-lg font-semibold tracking-tight text-white">{item.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Validator selection workflow
      </div>

      {sourceMeta?.note && (
        <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.03] px-4 py-3 text-[12px] text-slate-300">
          <span className="font-semibold text-amber-300">Source note:</span> {sourceMeta.note}
          {sourceMeta.source === "validator-tao-app" && <div className="mt-2 text-[11px] text-slate-400">Powered by TAO.app API</div>}
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Validator market overview
      </div>

      {summary && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label="Total Validators" value={summary.totalValidators.toString()} accent="cyan" icon={<Users className="h-4 w-4" />} index={0} />
          <StatCard label="Total Staked" value={`${(summary.totalStake / 1_000_000).toFixed(1)}M τ`} accent="emerald" index={1} />
          <StatCard label="Total Nominators" value={`${(summary.totalNominators / 1_000_000).toFixed(1)}M`} accent="violet" index={2} />
        </div>
      )}

      {viewMode === "list" && (
        <GlassCard padding="none">
          <div className="overflow-hidden rounded-xl" style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.065)" }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="w-10 px-4 py-3"><div className="h-4 w-4" /></th>
                    {[
                      { field: "rank" as const, label: "#", width: "w-12" },
                      { field: "name" as const, label: "Validator", width: "w-48" },
                      { field: "dominance" as const, label: "Dominance", width: "w-24" },
                      { field: "nominators" as const, label: "Nominators", width: "w-28" },
                      { field: "activeSubnets" as const, label: "Subnets", width: "w-20" },
                      { field: "totalWeight" as const, label: "Total Weight", width: "w-28" },
                      { field: "weightChange24h" as const, label: "Weight 24h", width: "w-28" },
                      { field: "rootStake" as const, label: "Root Stake", width: "w-28" },
                      { field: "alphaStake" as const, label: "Alpha Stake", width: "w-28" },
                    ].map(({ field, label, width }) => (
                      <th key={field} onClick={() => handleSort(field)} className={cn("cursor-pointer px-4 py-3 text-left transition-colors hover:bg-slate-800/20", width)}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase text-slate-400" style={{ letterSpacing: "0.04em" }}>{label}</span>
                          <SortIcon field={field} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">No validators found</td>
                    </tr>
                  ) : (
                    paginatedData.map((validator) => (
                      <tr key={validator.rank} className="border-b border-white/[0.04] transition-colors hover:bg-slate-800/10">
                        <td className="px-4 py-3">
                          <button onClick={() => toggleFavorite(validator.rank)} className="transition-colors hover:text-amber-300">
                            <Star className={cn("h-4 w-4", favorites.has(validator.rank) ? "fill-amber-400 text-amber-400" : "text-slate-600")} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">{validator.rank}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-white">{validator.name}</div>
                              <div className="font-mono text-[11px] text-slate-500">{truncateAddress(validator.address)}</div>
                            </div>
                            <button onClick={() => copyToClipboard(validator.address)} className="text-slate-500 hover:text-slate-300">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">{validator.dominance.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{validator.nominators.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{validator.activeSubnets}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{validator.totalWeight.toFixed(2)}</td>
                        <td className={cn("px-4 py-3 text-sm", validator.weightChange24h >= 0 ? "text-emerald-300" : "text-rose-300")}>
                          {validator.weightChange24h >= 0 ? "+" : ""}
                          {validator.weightChange24h.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">{validator.rootStake.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{validator.alphaStake.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </GlassCard>
      )}

      {viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {paginatedData.map((validator) => (
            <GlassCard key={validator.rank} padding="lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">{validator.name}</div>
                  <div className="mt-1 font-mono text-[11px] text-slate-500">{truncateAddress(validator.address)}</div>
                </div>
                <button onClick={() => toggleFavorite(validator.rank)} className="transition-colors hover:text-amber-300">
                  <Star className={cn("h-4 w-4", favorites.has(validator.rank) ? "fill-amber-400 text-amber-400" : "text-slate-600")} />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-[11px] text-slate-500">Rank</div><div className="font-semibold text-slate-200">#{validator.rank}</div></div>
                <div><div className="text-[11px] text-slate-500">Dominance</div><div className="font-semibold text-slate-200">{validator.dominance.toFixed(2)}%</div></div>
                <div><div className="text-[11px] text-slate-500">Nominators</div><div className="font-semibold text-slate-200">{validator.nominators.toLocaleString()}</div></div>
                <div><div className="text-[11px] text-slate-500">Subnets</div><div className="font-semibold text-slate-200">{validator.activeSubnets}</div></div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-slate-400"><Shield className="h-3.5 w-3.5" /> Root {validator.rootStake.toLocaleString()}</span>
                <span className={validator.weightChange24h >= 0 ? "text-emerald-300" : "text-rose-300"}>{validator.weightChange24h >= 0 ? "+" : ""}{validator.weightChange24h.toFixed(2)}%</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-slate-500">Page {currentPage + 1} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-slate-300 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-slate-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "What this page should do",
            detail: "Help users determine which validator-oriented sets deserve attention, follow-up, or operational monitoring.",
          },
          {
            title: "Why the source state matters",
            detail: "Validator rankings are only trustworthy when the page keeps provider and fallback posture visible while you browse.",
          },
          {
            title: "Best follow-on action",
            detail: "Use search, sort, and favorites to build a shortlist, then switch views to compare operators from different angles.",
          },
        ].map((card) => (
          <div key={card.title} className="rounded-2xl border border-white/8 bg-white/[0.022] p-5">
            <div className="text-sm font-semibold tracking-tight text-white">{card.title}</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
