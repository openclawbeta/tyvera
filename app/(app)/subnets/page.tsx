"use client";

import { useState, useMemo, useEffect } from "react";
import { GitCompare, X, Layout, Grid3x3, Activity, Bell, Layers3, Radar, Shield } from "lucide-react";
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
import { ExportButton } from "@/components/ui-custom/export-button";
import { getSubnets, fetchSubnetsFromApi } from "@/lib/api/subnets";
import type { SubnetDetailModel, RiskLevel } from "@/lib/types/subnets";
import { useTaoRate } from "@/lib/hooks/use-tao-rate";
import type { CurrencyMode } from "@/lib/currency";

export default function SubnetsPage() {
  const seedSubnets = getSubnets();
  const [subnets, setSubnets] = useState<SubnetDetailModel[]>(() => seedSubnets);
  const [totalSubnets, setTotalSubnets] = useState<number>(seedSubnets.length);
  const [dataSource, setDataSource] = useState<string>("static-snapshot");
  const [snapshotAge, setSnapshotAge] = useState<number | null>(null);
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
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [risk, setRisk] = useState<RiskLevel | "ALL">("ALL");
  const [sortBy, setSortBy] = useState("score");
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
    () =>
      compareNetuids
        .map((netuid) => subnets.find((subnet) => subnet.netuid === netuid))
        .filter(Boolean) as SubnetDetailModel[],
    [compareNetuids, subnets],
  );

  const filtered = useMemo(() => {
    let list = [...subnets];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || String(s.netuid).includes(q) || s.category.toLowerCase().includes(q));
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
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "yield") return b.yield - a.yield;
      if (sortBy === "liquidity") return b.liquidity - a.liquidity;
      if (sortBy === "inflow") return b.inflow - a.inflow;
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
    <div className="mx-auto max-w-full space-y-6 overflow-x-hidden">
      <PageHeader title="Subnet Explorer" subtitle={`${totalSubnets} subnets · scored, ranked, and filtered`}>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <DataSourceBadge source={dataSource} ageSec={snapshotAge} />
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-white">{filtered.length}</span> of {totalSubnets}
          </div>
          <ExportButton exportType="subnets" />
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
              Every subnet, one place
            </div>

            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white md:text-[40px]">
              Find subnets worth
              <span className="block bg-[linear-gradient(135deg,#67e8f9_0%,#4f7cff_55%,#8b5cf6_100%)] bg-clip-text text-transparent">
                a closer look.
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-[15px]">
              Score, yield, liquidity, and risk for every subnet on Bittensor — filter and sort to narrow {totalSubnets.toLocaleString()} candidates down to a shortlist in seconds, then open any row for the full breakdown.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                { label: "Start with", value: "Sort + filter", note: "Narrow by category, risk band, or minimum score", tone: "text-cyan-300" },
                { label: "Data state", value: liveLoaded ? (dataSource === "static-snapshot" ? "Cached" : "Live") : "Loading", note: liveLoaded ? (dataSource === "static-snapshot" ? "Showing latest snapshot — age visible on badge" : "Fresh from chain") : "Fetching current network state", tone: liveLoaded ? (dataSource === "static-snapshot" ? "text-amber-300" : "text-emerald-300") : "text-amber-300" },
                { label: "Then", value: "Compare 2 at a time", note: "Click the compare toggle on any two rows", tone: "text-white" },
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
              label: "Score",
              title: "One number that rolls up yield, liquidity, and risk.",
              detail: "Tyvera's subnet score weighs yield vs. the root baseline, pool depth, and recent volatility so you can rank the network at a glance rather than juggling five columns.",
            },
            {
              label: "Compare",
              title: "Put two subnets side by side before committing capital.",
              detail: "Click the compare toggle on any two rows — Tyvera lines up their yields, flows, and risk bands so you can see which one your thesis actually prefers.",
            },
            {
              label: "Freshness",
              title: "The source badge tells you how old the data is.",
              detail: "Green means live from the Bittensor chain. Amber means a recent snapshot. You'll always see which one you're looking at before making a call.",
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

      {compareSubnets.length > 0 && (
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.03] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <GitCompare className="h-4 w-4 text-cyan-300" />
              {compareSubnets.length === 1 ? `1 subnet selected — choose one more to compare` : `${compareSubnets[0].name} vs ${compareSubnets[1].name}`}
            </div>
            <button className="btn-ghost gap-1.5 text-xs" onClick={() => setCompareNetuids([])}>
              <X className="h-3.5 w-3.5" />
              Clear compare
            </button>
          </div>
        </div>
      )}

      {compareSubnets.length === 2 && (
        <div>
          <SubnetComparePanel subnets={[compareSubnets[0], compareSubnets[1]]} onClear={() => setCompareNetuids([])} />
        </div>
      )}

      {viewMode === "table" && <SubnetSummaryCards subnets={filtered} currency={currency} taoUsdRate={taoUsdRate} />}

      <div className="flex flex-wrap items-center gap-2">
        {["All", "Language", "Multi-Modal", "Finance", "Data", "Developer Tools", "Creative", "Infrastructure", "Science"].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
              category === cat
                ? "border-cyan-400/25 bg-cyan-400/15 text-cyan-300"
                : "border-white/[0.07] bg-white/[0.03] text-slate-500 hover:bg-white/[0.05] hover:text-slate-300",
            )}
          >
            {cat}
            {cat !== "All" && <span className="ml-1.5 text-[10px] text-slate-600">{subnets.filter((s) => s.category === cat).length}</span>}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all",
              viewMode === "table"
                ? "border border-cyan-400/25 bg-cyan-400/15 text-cyan-300"
                : "border border-white/[0.07] bg-white/[0.03] text-slate-500 hover:bg-white/[0.05] hover:text-slate-300",
            )}
          >
            <Layout className="h-3.5 w-3.5" />
            Table
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all",
              viewMode === "cards"
                ? "border border-cyan-400/25 bg-cyan-400/15 text-cyan-300"
                : "border border-white/[0.07] bg-white/[0.03] text-slate-500 hover:bg-white/[0.05] hover:text-slate-300",
            )}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            Cards
          </button>
          <button
            onClick={() => setViewMode("heatmap")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all",
              viewMode === "heatmap"
                ? "border border-cyan-400/25 bg-cyan-400/15 text-cyan-300"
                : "border border-white/[0.07] bg-white/[0.03] text-slate-500 hover:bg-white/[0.05] hover:text-slate-300",
            )}
          >
            <Activity className="h-3.5 w-3.5" />
            Heatmap
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all",
              showAlerts
                ? "border border-orange-400/25 bg-orange-400/15 text-orange-300"
                : "border border-white/[0.07] bg-white/[0.03] text-slate-500 hover:bg-white/[0.05] hover:text-slate-300",
            )}
          >
            <Bell className="h-3.5 w-3.5" />
            Alerts
          </button>

          {viewMode === "cards" && (
            <button
              onClick={() => setFilterCollapsed(!filterCollapsed)}
              className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-500 transition-all hover:bg-white/[0.05] hover:text-slate-300 md:hidden"
            >
              {filterCollapsed ? "Show" : "Hide"} Filters
            </button>
          )}
        </div>
      </div>

      {showAlerts && <SubnetNetworkAlerts subnets={subnets} />}

      {viewMode === "heatmap" && <SubnetHeatmap subnets={filtered} />}

      {viewMode !== "heatmap" && (
        <div className="flex flex-col gap-5 lg:flex-row">
          {viewMode === "cards" && !filterCollapsed && (
            <div className="w-full shrink-0 lg:w-52">
              <SubnetFilterPanel
                search={search}
                onSearch={setSearch}
                category={category}
                onCategory={setCategory}
                risk={risk}
                onRisk={setRisk}
                sortBy={sortBy}
                onSort={setSortBy}
                minScore={minScore}
                onMinScore={setMinScore}
              />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {viewMode === "table" ? (
              <SubnetDataTable subnets={subnets} onSelect={handleSelectSubnet} currency={currency} onCurrencyChange={setCurrency} taoUsdRate={taoUsdRate} />
            ) : filtered.length === 0 ? (
              <div className="glass flex h-48 items-center justify-center rounded-xl text-sm text-slate-500">No subnets match your filters.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

          {(viewMode === "cards" || viewMode === "table") && (
            <div className="w-full shrink-0 lg:w-72 lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
              <SubnetDetailPreview subnet={selected} />
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Reading the table",
            detail: "Each row is one subnet. The score column is Tyvera's rollup; yield is annualized APR; liquidity is pool depth in TAO. The risk band colors tell you how volatile the subnet has been over the last 14 days.",
          },
          {
            title: "Narrowing the field",
            detail: "Category buttons above the table filter by use case. The filter panel on the Cards view adds risk, minimum score, and full-text search so you can screen 128+ candidates down to a shortlist fast.",
          },
          {
            title: "Before you allocate",
            detail: "Click a row to open the detail preview — emissions curve, 14-day yield history, top validators. Compare two candidates side by side before deciding which one earns real TAO.",
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
