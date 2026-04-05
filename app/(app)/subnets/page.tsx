"use client";

import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SubnetFilterPanel } from "@/components/subnets/subnet-filter-panel";
import { SubnetCard } from "@/components/subnets/subnet-card";
import { SubnetDetailPreview } from "@/components/subnets/subnet-detail-preview";
import { getSubnets, fetchSubnetsFromApi } from "@/lib/api/subnets";
import type { SubnetDetailModel, RiskLevel } from "@/lib/types/subnets";

export default function SubnetsPage() {
  // Initialise immediately from the static snapshot so the page renders
  // without a loading state. The useEffect below upgrades to live data
  // (full ~128-subnet list) from /api/subnets once the component mounts.
  const seedSubnets = getSubnets();
  const [subnets, setSubnets] = useState<SubnetDetailModel[]>(() => seedSubnets);
  const [totalSubnets, setTotalSubnets] = useState<number>(seedSubnets.length);
  const [liveLoaded, setLiveLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchSubnetsFromApi()
      .then((data) => {
        if (cancelled) return;
        setSubnets(data);
        setTotalSubnets(data.length);
        setLiveLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLiveLoaded(true);
      }); // silent: static snapshot is already displayed

    return () => {
      cancelled = true;
    };
  }, []);

  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("All");
  const [risk, setRisk]         = useState<RiskLevel | "ALL">("ALL");
  const [sortBy, setSortBy]     = useState("score");
  const [selected, setSelected] = useState<SubnetDetailModel | null>(null);

  const filtered = useMemo(() => {
    let list = [...subnets];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || String(s.netuid).includes(q) || s.category.toLowerCase().includes(q),
      );
    }

    if (category !== "All") {
      list = list.filter((s) => s.category === category);
    }

    if (risk !== "ALL") {
      list = list.filter((s) => s.risk === risk);
    }

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
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Subnet Explorer"
        subtitle={`${liveLoaded ? totalSubnets : seedSubnets.length} subnets · scored, ranked, and filtered`}
      >
        <div className="text-xs text-slate-500">
          Showing <span className="text-white font-semibold">{filtered.length}</span> of {liveLoaded ? totalSubnets : seedSubnets.length}
        </div>
      </PageHeader>

      <div className="flex gap-5">
        {/* Left filter rail */}
        <SubnetFilterPanel
          search={search}     onSearch={setSearch}
          category={category} onCategory={setCategory}
          risk={risk}         onRisk={setRisk}
          sortBy={sortBy}     onSort={setSortBy}
        />

        {/* Center subnet grid */}
        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div className="glass flex items-center justify-center h-48 text-slate-500 text-sm">
              No subnets match your filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map((subnet, i) => (
                <SubnetCard
                  key={subnet.id}
                  subnet={subnet}
                  selected={selected?.id === subnet.id}
                  onSelect={() => setSelected(subnet)}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right detail preview */}
        <div className="w-72 flex-shrink-0 sticky top-20 h-[calc(100vh-7rem)]">
          <SubnetDetailPreview subnet={selected} />
        </div>
      </div>
    </div>
  );
}
