"use client";

import { useState, useMemo, useEffect } from "react";
import { GitCompare, X, Layout, Grid3x3, Activity, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { SubnetFilterPanel } from "@/components/subnets/subnet-filter-panel";
import { SubnetCard } from "@/components/subnets/subnet-card";
import { SubnetDetailPreview } from "@/components/subnets/subnet-detail-preview";
import { SubnetComparePanel } from "@/components/subnets/subnet-compare-panel";
import { SubnetDataTable } from "@/components/subnets/subnet-data-table";
import { SubnetSummaryCards } from "@/components/subnets/subnet-summary-cards";
import { SubnetHeatmap } from "@/components/subnets/subnet-heatmap";
import { SubnetNetworkAlerts } from "@/components/subnets/subnet-network-alerts";
import { DataSourceBadge } from "@/components/ui-custom/data-source-badge";
import { getSubnets, fetchSubnetsFromApi } from "@/lib/api/subnets";
import type { SubnetDetailModel, RiskLevel } from "@/lib/types/subnets";
import { useTaoRate } from "@/lib/hooks/use-tao-rate";
import type { CurrencyMode } from "@/lib/currency";

export default function SubnetsPage() {
  // Initialise immediately from the static snapshot so the page renders
  // without a loading state. The useEffect below upgrades to live data
  // (full ~128-subnet list) from /api/subnets once the component mounts.
  const seedSubnets = getSubnets();
  const [subnets, setSubnets] = useState<SubnetDetailModel[]>(() => seedSubnets);
  const [totalSubnets, setTotalSubnets] = useState<number>(seedSubnets.length);
  const [dataSource, setDataSource] = useState<string>("static-snapshot");
  const [snapshotAge, setSnapshotAge] = useState<number | null>(null);
  const [taoUsd, setTaoUsd] = useState(600);
  const [liveLoaded, setLiveLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchSubnetsFromApi()
      .then((result) => {
        if (cancelled) return;
        setSubnets(result.subnets);
        setTotalSubnets(result.subnets.length);
        setDataSource(result.dataSource);
        setSnapshotAge(result.snapshotAgeSec);
        setLiveLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLiveLoaded(true);
      }); // silent: static snapshot is already displayed

    fetch('/api/tao-rate')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && typeof data?.taoUsd === 'number' && data.taoUsd > 0) {
          setTaoUsd(data.taoUsd);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("All");
  const [risk, setRisk]         = useState<RiskLevel | "ALL">("ALL");
  const [sortBy, setSortBy]     = useState("score");
  const [minScore, setMinScore] = useState(0);
  const [selected, setSelected] = useState<SubnetDetailModel | null>(null);
  const [compareNetuids, setCompareNetuids] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "cards" | "heatmap">("table");
  const [filterCollapsed, setFilterCollapsed] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [currency, setCurrency] = useState<CurrencyMode>("tau");
  const { rate: taoUsdRate } = useTaoRate();

  function toggleCompare(subnet: SubnetDetailModel) {
    setCompareNetuids((prev) => {
      if (prev.includes(subnet.netuid)) return prev.filter((id) => id !== subnet.netuid);
      if (prev.length >= 2) return [prev[1], subnet.netuid];
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

    if (minScore > 0) {
      list = list.filter((s) => s.score >= minScore);
    }

    list.sort((a, b) => {
      if (sortBy === "score")     return b.score - a.score;
      if (sortBy === "yield")     return b.yield - a.yield;
      if (sortBy === "liquidity") return b.liquidity - a.liquidity;
      if (sortBy === "inflow")    return b.inflow - a.inflow;
      return 0;
    });

    return list;
  }, [subnets, search, category, risk, sortBy, minScore]);

  const handleSelectSubnet = (netuid: number) => {
    const subnet = subnets.find((s) => s.netuid === netuid);
    if (subnet) {
      setSelected(subnet);
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-6 overflow-x-hidden">
      <PageHeader
        title="Subnet Explorer"
        subtitle={`${totalSubnets} subnets · scored, ranked, and filtered`}
      >
        <div className="flex items-center gap-3">
          <DataSourceBadge source={dataSource} ageSec={snapshotAge} />
          <div className="text-xs text-slate-500">
            Showing <span className="text-white font-semibold">{filtered.length}</span> of {totalSubnets}
          </div>
        </div>
      </PageHeader>

      {compareSubnets.length > 0 && (
        <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.03] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <GitCompare className="w-4 h-4 text-cyan-300" />
              {compareSubnets.length === 1
                ? `1 subnet selected — choose one more to compare`
                : `${compareSubnets[0].name} vs ${compareSubnets[1].name}`}
            </div>
            <button
              className="btn-ghost text-xs gap-1.5"
              onClick={() => setCompareNetuids([])}
            >
              <X className="w-3.5 h-3.5" />
              Clear compare
            </button>
          </div>
        </div>
      )}

      {compareSubnets.length === 2 && (
        <div>
          <SubnetComparePanel
            subnets={[compareSubnets[0], compareSubnets[1]]}
            onClear={() => setCompareNetuids([])}
          />
        </div>
      )}

      <div className="border-b border-white/6 pb-6 mb-8" />

      {/* Summary cards */}
      {viewMode === "table" && <SubnetSummaryCards subnets={filtered} currency={currency} taoUsdRate={taoUsdRate} />}

      {/* Category quick-filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {["All", "Language", "Multi-Modal", "Finance", "Data", "Developer Tools", "Creative", "Infrastructure", "Science"].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
              category === cat
                ? "bg-cyan-400/15 text-cyan-300 border-cyan-400/25"
                : "bg-white/[0.03] text-slate-500 border-white/[0.07] hover:text-slate-300 hover:bg-white/[0.05]",
            )}
          >
            {cat}
            {cat !== "All" && (
              <span className="ml-1.5 text-[10px] text-slate-600">
                {subnets.filter((s) => s.category === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode("table")}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
            viewMode === "table"
              ? "bg-cyan-400/15 text-cyan-300 border border-cyan-400/25"
              : "bg-white/[0.03] text-slate-500 border border-white/[0.07] hover:text-slate-300 hover:bg-white/[0.05]",
          )}
        >
          <Layout className="w-3.5 h-3.5" />
          Table
        </button>
        <button
          onClick={() => setViewMode("cards")}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
            viewMode === "cards"
              ? "bg-cyan-400/15 text-cyan-300 border border-cyan-400/25"
              : "bg-white/[0.03] text-slate-500 border border-white/[0.07] hover:text-slate-300 hover:bg-white/[0.05]",
          )}
        >
          <Grid3x3 className="w-3.5 h-3.5" />
          Cards
        </button>
        <button
          onClick={() => setViewMode("heatmap")}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
            viewMode === "heatmap"
              ? "bg-cyan-400/15 text-cyan-300 border border-cyan-400/25"
              : "bg-white/[0.03] text-slate-500 border border-white/[0.07] hover:text-slate-300 hover:bg-white/[0.05]",
          )}
        >
          <Activity className="w-3.5 h-3.5" />
          Heatmap
        </button>

        {/* Alerts toggle */}
        <button
          onClick={() => setShowAlerts(!showAlerts)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ml-auto",
            showAlerts
              ? "bg-orange-400/15 text-orange-300 border border-orange-400/25"
              : "bg-white/[0.03] text-slate-500 border border-white/[0.07] hover:text-slate-300 hover:bg-white/[0.05]",
          )}
        >
          <Bell className="w-3.5 h-3.5" />
          Alerts
        </button>

        {/* Filter toggle on mobile — only in cards view */}
        {viewMode === "cards" && (
          <button
            onClick={() => setFilterCollapsed(!filterCollapsed)}
            className="md:hidden px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.03] text-slate-500 border border-white/[0.07] hover:text-slate-300 hover:bg-white/[0.05] transition-all"
          >
            {filterCollapsed ? "Show" : "Hide"} Filters
          </button>
        )}
      </div>

      {/* Network Alerts Panel */}
      {showAlerts && (
        <SubnetNetworkAlerts subnets={subnets} />
      )}

      {/* Heatmap view — full width, no sidebars */}
      {viewMode === "heatmap" && (
        <SubnetHeatmap subnets={filtered} />
      )}

      {/* Table & Cards views */}
      {viewMode !== "heatmap" && (
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Left filter rail — only shown in cards view */}
          {viewMode === "cards" && !filterCollapsed && (
            <div className="w-full lg:w-52 flex-shrink-0">
              <SubnetFilterPanel
                search={search}     onSearch={setSearch}
                category={category} onCategory={setCategory}
                risk={risk}         onRisk={setRisk}
                sortBy={sortBy}     onSort={setSortBy}
                minScore={minScore} onMinScore={setMinScore}
              />
            </div>
          )}

          {/* Center content */}
          <div className="flex-1 min-w-0">
            {viewMode === "table" ? (
              <SubnetDataTable
                subnets={subnets}
                onSelect={handleSelectSubnet}
                currency={currency}
                onCurrencyChange={setCurrency}
                taoUsdRate={taoUsdRate}
              />
            ) : filtered.length === 0 ? (
              <div className="glass flex items-center justify-center h-48 text-slate-500 text-sm rounded-xl">
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
                    currency={currency}
                    taoUsdRate={taoUsdRate}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right detail preview — available in both cards and table view */}
          {(viewMode === "cards" || viewMode === "table") && (
            <div className="w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
              <SubnetDetailPreview subnet={selected} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
