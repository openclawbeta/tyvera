"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { SUBNET_CATEGORIES } from "@/lib/constants/subnets";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types/subnets";

interface SubnetFilterPanelProps {
  search: string;
  onSearch: (v: string) => void;
  category: string;
  onCategory: (v: string) => void;
  risk: RiskLevel | "ALL";
  onRisk: (v: RiskLevel | "ALL") => void;
  sortBy: string;
  onSort: (v: string) => void;
}

const RISK_OPTIONS: Array<{ value: RiskLevel | "ALL"; label: string }> = [
  { value: "ALL",         label: "All" },
  { value: "LOW",         label: "Low" },
  { value: "MODERATE",   label: "Moderate" },
  { value: "HIGH",       label: "High" },
  { value: "SPECULATIVE",label: "Speculative" },
];

const SORT_OPTIONS = [
  { value: "score",     label: "Score" },
  { value: "yield",     label: "Yield" },
  { value: "liquidity", label: "Liquidity" },
  { value: "inflow",    label: "Inflow" },
];

export function SubnetFilterPanel({
  search, onSearch,
  category, onCategory,
  risk, onRisk,
  sortBy, onSort,
}: SubnetFilterPanelProps) {
  return (
    <div className="w-full lg:w-52 flex-shrink-0 space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search subnetsâ¦"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/40 transition-colors"
        />
      </div>

      {/* Sort */}
      <div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Sort by</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSort(opt.value)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                sortBy === opt.value
                  ? "bg-cyan-400/15 text-cyan-300 border border-cyan-400/25"
                  : "bg-white/[0.03] text-slate-500 border border-white/[0.05] hover:text-slate-300 hover:bg-white/[0.05]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Category</p>
        <div className="space-y-1">
          {SUBNET_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategory(cat)}
              className={cn(
                "w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                category === cat
                  ? "bg-cyan-400/10 text-cyan-300 border border-cyan-400/20"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Risk */}
      <div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Risk Level</p>
        <div className="space-y-1">
          {RISK_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onRisk(opt.value)}
              className={cn(
                "w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                risk === opt.value
                  ? "bg-cyan-400/10 text-cyan-300 border border-cyan-400/20"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Min score */}
      <div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Minimum Score</p>
        <input
          type="range"
          min={0}
          max={100}
          defaultValue={0}
          className="w-full accent-cyan-400 h-1"
        />
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>0</span><span>100</span>
        </div>
      </div>
    </div>
  );
}
