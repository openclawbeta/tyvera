"use client";

import { useState, useMemo, useEffect } from "react";
import { GitCompare, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SubnetFilterPanel } from "@/components/subnets/subnet-filter-panel";
import { SubnetCard } from "@/components/subnets/subnet-card";
import { SubnetDetailPreview } from "@/components/subnets/subnet-detail-preview";
import { SubnetComparePanel } from "@/components/subnets/subnet-compare-panel";
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
  const [compareNetuids, setCompareNetuids] = useState<number[]>([]);

  function toggleCompare(subnet: SubnetDetailModel) {
    setCompareNetuids((prev) => {
      if (prev.includes(subnet.netuid)) return prev.filter((id) => id !== subnet.netuid);
      if (prev.length >= 4) return [...prev.slice(1), subnet.netuid];
      return [...prev, subnet.netuid];
    });
  }

  const compareSubnets = useMemo(
    () => compareNetuids
      .map((netuid) => subnets.find((subnet) => subnet.netuid === netuid))
      .filter(Boolean) as SubnetDetailModel[],
    [compareNetuids, subnets],
  );

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
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Subnet Explorer"
        subtitle={liveLoaded
          ? `${totalSubnets} subnets · scored, ranked, and filtered`
          : "Scored, ranked, and filtered across the subnet universe"}
      >
        <div className="text-xs text-slate-500">
          {liveLoaded ? (
            <>
              Showing <span className="text-white font-semibold">{filtered.length}</span> of {totalSubnets}
            </>
          ) : (
            <>Loading live subnet totals…</>
          )}
        </div>
      </PageHeader>

      {compareSubnets.length > 0 && compareSubnets.length < 2 && (
        <div className="mb-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.03] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <GitCompare className="w-4 h-4 text-cyan-300" />
              1 subnet selected — choose 1–3 more to compare (up to 4)
            </div>
            <button
              className="btn-ghost text-xs gap-1.5"
              onClick={() => setCompareNetuids([])}
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>
      )}

      {compareSubnets.length >= 2 && (
        <div className="mb-5">
          <SubnetComparePanel
            subnets={compareSubnets}
            onClear={() => setCompareNetuids([])}
          />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-5">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map((subnet, i) => (
                <SubnetCard
                  key={subnet.id}
                  subnet={subnet}
                  selected={selected?.id === subnet.id}
                  onSelect={() => setSelected(subnet)}
                  onCompareToggle={toggleCompare}
                  compareActive={compareNetuids.includes(subnet.netuid)}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right detail preview */}
        <div className="w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
          <SubnetDetailPreview subnet={selected} />
        </div>
      </div>
    </div>
  );
}
