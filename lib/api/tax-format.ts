/**
 * lib/api/tax-format.ts
 *
 * Pure (client-safe) formatters for tax events: CSV export and summary
 * aggregation. These helpers operate on already-fetched `TaxEvent[]`
 * arrays and don't touch the DB, so they're safe to import from
 * "use client" pages (unlike lib/api/tax-report.ts, which pulls in the
 * server-only chain-events / DB modules).
 */

import type { TaxEvent, TaxSummary } from "@/lib/types/tax";

/* ── CSV export ─────────────────────────────────────────────────────── */

export function exportTaxCsv(events: TaxEvent[]): string {
  const headers = [
    "Date",
    "Type",
    "Subnet",
    "Amount (TAO)",
    "TAO Price (USD)",
    "Value (USD)",
    "Tx Hash",
    "Notes",
  ];

  const rows = events.map((event) => [
    new Date(event.date).toISOString(),
    event.type,
    event.subnet,
    event.amountTao.toFixed(6),
    event.priceUsdAtTime.toFixed(2),
    event.valueUsd.toFixed(2),
    event.txHash ?? "—",
    event.notes ?? "",
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(","),
    ),
  ].join("\n");

  return csv;
}

/* ── Summary aggregation ────────────────────────────────────────────── */

export function getTaxSummary(events: TaxEvent[]): TaxSummary {
  let totalRewardsTao = 0;
  let totalRewardsUsd = 0;
  let totalFeesTao = 0;
  let totalFeesUsd = 0;

  for (const event of events) {
    if (event.type === "STAKING_REWARD") {
      totalRewardsTao += event.amountTao;
      totalRewardsUsd += event.valueUsd;
    } else if (event.type === "SUBSCRIPTION") {
      totalFeesTao += event.amountTao;
      totalFeesUsd += event.valueUsd;
    }
  }

  const netIncomeTao = totalRewardsTao - totalFeesTao;
  const netIncomeUsd = totalRewardsUsd - totalFeesUsd;

  const sortedDates = events
    .map((e) => new Date(e.date))
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    totalRewardsTao: +totalRewardsTao.toFixed(6),
    totalRewardsUsd: +totalRewardsUsd.toFixed(2),
    totalFeesTao: +totalFeesTao.toFixed(6),
    totalFeesUsd: +totalFeesUsd.toFixed(2),
    netIncomeTao: +netIncomeTao.toFixed(6),
    netIncomeUsd: +netIncomeUsd.toFixed(2),
    eventCount: events.length,
    startDate:
      sortedDates.length > 0
        ? sortedDates[0].toISOString()
        : new Date().toISOString(),
    endDate:
      sortedDates.length > 0
        ? sortedDates[sortedDates.length - 1].toISOString()
        : new Date().toISOString(),
  };
}
