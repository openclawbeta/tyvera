"use client";

import { useState, useMemo } from "react";
import { Download, FileText, TrendingUp, Zap, DollarSign, WalletCards } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { StatCard } from "@/components/ui-custom/stat-card";
import { SectionTitle } from "@/components/ui-custom/section-title";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { generateTaxReport, exportTaxCsv, getTaxSummary } from "@/lib/api/tax-report";
import type { TaxEvent, TaxEventType } from "@/lib/types/tax";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [2025, 2026];

const EVENT_TYPE_COLORS: Record<TaxEventType, { bg: string; text: string; border: string }> = {
  STAKING_REWARD: { bg: "rgba(52,211,153,0.1)", text: "#34d399", border: "rgba(52,211,153,0.22)" },
  STAKE: { bg: "rgba(34,211,238,0.1)", text: "#22d3ee", border: "rgba(34,211,238,0.22)" },
  UNSTAKE: { bg: "rgba(251,191,36,0.1)", text: "#fbbf24", border: "rgba(251,191,36,0.22)" },
  MOVE: { bg: "rgba(139,92,246,0.1)", text: "#a78bfa", border: "rgba(139,92,246,0.22)" },
  SUBSCRIPTION: { bg: "rgba(244,63,94,0.1)", text: "#fb7185", border: "rgba(244,63,94,0.22)" },
};

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateHash(hash?: string): string {
  if (!hash) return "—";
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

export default function TaxReportPage() {
  const { address: walletAddress } = useWallet();
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [filterType, setFilterType] = useState<TaxEventType | "ALL">("ALL");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Generate tax events for the selected year
  const allEvents = useMemo(() => generateTaxReport(selectedYear), [selectedYear]);

  // Filter by type
  const filteredEvents = useMemo(() => {
    return filterType === "ALL" ? allEvents : allEvents.filter((e) => e.type === filterType);
  }, [allEvents, filterType]);

  // Sort
  const displayedEvents = useMemo(() => {
    const sorted = [...filteredEvents].sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      return sortOrder === "desc" ? bTime - aTime : aTime - bTime;
    });
    return sorted;
  }, [filteredEvents, sortOrder]);

  const summary = useMemo(() => getTaxSummary(allEvents), [allEvents]);

  const handleExportCsv = () => {
    const csv = exportTaxCsv(filteredEvents);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `tyvera-tax-report-${selectedYear}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Tax Report"
        subtitle="Export your staking activity for tax filing"
      >
        <div className="flex items-center gap-2">
          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.045] border border-white/[0.08] text-slate-200 cursor-pointer"
          >
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          {/* Export button */}
          <button
            onClick={handleExportCsv}
            className="btn-primary text-xs gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </PageHeader>

      {/* Data source disclosure — always shown prominently since data is simulated */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
        style={{
          background: "rgba(251, 191, 36, 0.06)",
          border: "1px solid rgba(251, 191, 36, 0.18)",
        }}
      >
        <WalletCards className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
        <p className="text-amber-200/90 leading-relaxed">
          <span className="font-semibold text-amber-300">Simulated Data — Not Tax Advice.</span>{" "}
          All figures below are illustrative examples generated for demonstration purposes only. They do not reflect your actual staking activity or tax obligations. On-chain transaction indexing is coming in a future update.{" "}
          <span className="text-amber-300/80 font-medium">Always consult a qualified tax professional for your filing.</span>
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Rewards"
          value={`${summary.totalRewardsTao.toFixed(4)} τ`}
          change={8.2}
          accent="emerald"
          icon={<TrendingUp className="w-4 h-4" />}
          index={0}
        />
        <StatCard
          label="Rewards (USD)"
          value={`$${summary.totalRewardsUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          accent="cyan"
          icon={<DollarSign className="w-4 h-4" />}
          index={1}
        />
        <StatCard
          label="Total Fees"
          value={`${summary.totalFeesTao.toFixed(6)} τ`}
          accent="rose"
          icon={<Zap className="w-4 h-4" />}
          index={2}
        />
        <StatCard
          label="Net Income (USD)"
          value={`$${summary.netIncomeUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
          change={5.1}
          accent="violet"
          icon={<FileText className="w-4 h-4" />}
          index={3}
        />
      </div>

      {/* Events table */}
      <FadeIn delay={0.1}>
        <GlassCard>
          <div className="flex items-center justify-between mb-5">
            <SectionTitle
              title="Tax Events"
              subtitle={`${displayedEvents.length} event${displayedEvents.length !== 1 ? "s" : ""}`}
            />

            {/* Filter controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Type filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as TaxEventType | "ALL")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.045] border border-white/[0.08] text-slate-300 cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="STAKING_REWARD">Rewards</option>
                <option value="STAKE">Stakes</option>
                <option value="UNSTAKE">Unstakes</option>
                <option value="MOVE">Moves</option>
                <option value="SUBSCRIPTION">Fees</option>
              </select>

              {/* Sort toggle */}
              <button
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.045] border border-white/[0.08] text-slate-400 hover:text-slate-200 transition-colors"
                title={`Sort by date ${sortOrder === "desc" ? "ascending" : "descending"}`}
              >
                {sortOrder === "desc" ? "↓ Newest" : "↑ Oldest"}
              </button>
            </div>
          </div>

          {/* Table */}
          {displayedEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th text-left">Date</th>
                    <th className="th text-left">Type</th>
                    <th className="th text-left">Subnet</th>
                    <th className="th text-right">Amount (τ)</th>
                    <th className="th text-right">TAO Price (USD)</th>
                    <th className="th text-right">Value (USD)</th>
                    <th className="th text-left">Tx Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedEvents.map((event) => {
                    const colors = EVENT_TYPE_COLORS[event.type];
                    return (
                      <tr key={event.id} className="data-row">
                        <td className="td font-mono text-[11px] text-slate-400">
                          {formatDate(event.date)}
                        </td>
                        <td className="td">
                          <span
                            className="inline-flex items-center rounded-lg text-[10px] font-semibold px-2 py-1"
                            style={{
                              background: colors.bg,
                              color: colors.text,
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            {event.type}
                          </span>
                        </td>
                        <td className="td text-slate-300 font-medium">{event.subnet}</td>
                        <td className="td text-right font-mono text-slate-300">
                          {event.amountTao.toFixed(6)}
                        </td>
                        <td className="td text-right font-mono text-slate-500">
                          ${event.priceUsdAtTime.toFixed(2)}
                        </td>
                        <td className="td text-right font-mono font-semibold text-slate-200">
                          ${event.valueUsd.toFixed(2)}
                        </td>
                        <td className="td font-mono text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
                          {event.txHash ? (
                            <a
                              href={`https://x.taostats.io/extrinsic/${event.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-cyan-400 underline"
                              title={event.txHash}
                            >
                              {truncateHash(event.txHash)}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">No events found for the selected filters.</p>
            </div>
          )}
        </GlassCard>
      </FadeIn>

      {/* Disclaimer */}
      <FadeIn delay={0.15}>
        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4">
          <p className="text-[12px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-400">Disclaimer:</span> This report is for informational
            purposes only. Consult a tax professional for advice regarding tax liabilities and filing requirements.
            Tyvera is not responsible for tax accuracy or compliance.
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
