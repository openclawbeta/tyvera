"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SubnetFilterPanel } from "@/components/subnets/subnet-filter-panel";
import { SubnetCard } from "@/components/subnets/subnet-card";
import { getSubnets } from "@/lib/api/subnets";
import type { RiskLevel } from "@/lib/types/subnets";
import { Network } from "lucide-react";

export default function SubnetsPage() {
  const { items: subnets, meta } = getSubnets();
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("All");
  const [risk,     setRisk]     = useState<RiskLevel | "ALL">("ALL");
  const [sortBy,   setSortBy]   = useState("score");

  const filtered = useMemo(() => {
    let list = [...subnets];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          String(s.netuid).includes(q) ||
          s.category.toLowerCase().includes(q),
      );
    }

    if (category !== "All") list = list.filter((s) => s.category === category);
    if (risk !== "ALL")     list = list.filter((s) => s.risk === risk);

    list.sort((a, b) => {
      if (sortBy === "score")     return b.score - a.score;
      if (sortBy === "yield")     return b.yield - a.yield;
      if (sortBy === "liquidity") return b.liquidity - a.liquidity;
      if (sortBy === "inflow")    return b.inflow - a.inflow;
      return 0;
    });

    return list;
  }, [subnets, search, category, risk, sortBy]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <PageHeader
          title="Subnet Explorer"
          subtitle={`${meta?.total ?? subnets.length} subnets · scored, ranked, and filtered`}
        />
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 mt-0.5"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <Network className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-[11px] text-slate-500">
            Showing{" "}
            <span className="font-bold text-white tabular-nums">{filtered.length}</span>
            {" "}of{" "}
            <span className="tabular-nums">{meta?.total ?? subnets.length}</span>
          </span>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Filter rail */}
        <SubnetFilterPanel
          search={search}     onSearch={setSearch}
          category={category} onCategory={setCategory}
          risk={risk}         onRisk={setRisk}
          sortBy={sortBy}     onSort={setSortBy}
        />

        {/* Grid */}
        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-48 rounded-2xl gap-3"
              style={{
                background: "rgba(255,255,255,0.018)",
                border: "1px solid rgba(255,255,255,0.065)",
              }}
            >
              <Network className="w-8 h-8" style={{ color: "#1e293b" }} />
              <p className="text-[13px] text-slate-500">No subnets match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map((subnet, i) => (
                <SubnetCard
                  key={subnet.id}
                  subnet={subnet}
                  index={i}
                  linkOnClick={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
