/**
 * lib/api/tax-report.ts
 *
 * Tax report generator — sources events from the persisted chain_events DB
 * and resolves historical TAO/USD prices via the price-engine rolling buffer.
 *
 * Data source priority:
 *   1. chain_events table (populated by transfer-scanner cron)   → real events
 *   2. Empty result                                               → no events for this wallet yet
 *
 * Price resolution:
 *   1. Nearest-day match from price-engine rolling buffer
 *   2. Latest known TAO/USD price (fallback)
 *   3. 0 (when price-engine is cold — user must wait for first cron tick)
 */

import type { TaxEvent, TaxSummary, TaxEventType } from "@/lib/types/tax";
import type { ChainEvent, ActivityType } from "@/lib/chain/transfer-scanner";
import { queryChainEvents } from "@/lib/db/chain-events";
import { getTaoPriceHistory, getLatestTaoPrice } from "@/lib/chain/price-engine";

/* ── Chain → tax event type mapping ─────────────────────────────────── */

const TAX_TYPE_BY_CHAIN: Partial<Record<ActivityType, TaxEventType>> = {
  STAKE: "STAKE",
  UNSTAKE: "UNSTAKE",
  MOVE_STAKE: "MOVE",
  CLAIM: "STAKING_REWARD",
};

/* ── Historical price lookup ────────────────────────────────────────── */

/**
 * Build a date → price lookup table from the price-engine buffer.
 * Keyed by YYYY-MM-DD (first observation per day wins).
 */
function buildDailyPriceIndex(): Map<string, number> {
  const index = new Map<string, number>();
  const history = getTaoPriceHistory();
  for (const point of history) {
    const day = point.timestamp.split("T")[0];
    if (!index.has(day)) index.set(day, point.taoUsd);
  }
  return index;
}

/**
 * Resolve a USD/TAO price for a given ISO timestamp.
 *
 * Order of preference:
 *   1. Exact day match in the price-engine buffer
 *   2. Nearest prior day (walk back up to 14d)
 *   3. Latest known price (buffer tail)
 *   4. 0 — caller should treat this as "not yet available"
 */
function resolvePriceForTimestamp(
  isoTimestamp: string,
  dailyIndex: Map<string, number>,
  latestFallback: number,
): number {
  const day = isoTimestamp.split("T")[0];
  const exact = dailyIndex.get(day);
  if (exact != null) return exact;

  // Walk back up to 14 days looking for the nearest prior quote.
  const [yStr, mStr, dStr] = day.split("-");
  if (yStr && mStr && dStr) {
    const ref = new Date(Date.UTC(Number(yStr), Number(mStr) - 1, Number(dStr)));
    for (let i = 1; i <= 14; i++) {
      const prior = new Date(ref.getTime() - i * 86_400_000);
      const priorKey = prior.toISOString().split("T")[0];
      const match = dailyIndex.get(priorKey);
      if (match != null) return match;
    }
  }

  return latestFallback;
}

/* ── Chain event → tax event conversion ─────────────────────────────── */

function chainEventToTaxEvent(
  event: ChainEvent,
  walletAddress: string,
  dailyIndex: Map<string, number>,
  latestFallback: number,
): TaxEvent | null {
  const taxType = TAX_TYPE_BY_CHAIN[event.type];
  if (!taxType) return null;

  // For STAKE, we only record events where this wallet is the SENDER of TAO
  // (outbound). For UNSTAKE, this wallet is the RECEIVER. Skip rows where
  // the direction doesn't match the wallet's role — happens when events are
  // indexed from both counterparties' perspective.
  const isOutbound = event.fromAddress === walletAddress;
  const isInbound = event.toAddress === walletAddress;
  if (!isOutbound && !isInbound) return null;

  const priceUsd = resolvePriceForTimestamp(event.timestamp, dailyIndex, latestFallback);
  const amountTao = Math.abs(event.amountTao);
  const valueUsd = +(amountTao * priceUsd).toFixed(2);

  const subnetLabel = event.subnet ?? (event.type === "MOVE_STAKE" ? "Move stake" : "—");

  const notesParts: string[] = [];
  if (event.memo) notesParts.push(event.memo);
  if (event.fee > 0) notesParts.push(`Fee: ${event.fee.toFixed(6)} τ`);

  return {
    id: event.id,
    date: event.timestamp,
    type: taxType,
    subnet: subnetLabel,
    amountTao: +amountTao.toFixed(6),
    priceUsdAtTime: +priceUsd.toFixed(2),
    valueUsd,
    txHash: event.txHash,
    notes: notesParts.join(" · ") || undefined,
  };
}

/* ── Public API ─────────────────────────────────────────────────────── */

/**
 * Build a tax report for the given wallet and calendar year from real
 * chain_events. Returns an empty array when the wallet has no events yet
 * (or when the transfer-scanner cron hasn't indexed any blocks).
 *
 * @param address      SS58 wallet address
 * @param year         Calendar year (defaults to current year)
 * @param maxEvents    Maximum number of events to include (default 1000)
 */
export async function generateTaxReport(
  address: string | null | undefined,
  year?: number,
  maxEvents = 1000,
): Promise<TaxEvent[]> {
  if (!address) return [];

  const targetYear = year ?? new Date().getUTCFullYear();
  const yearStart = new Date(Date.UTC(targetYear, 0, 1)).toISOString();
  const yearEnd = new Date(Date.UTC(targetYear + 1, 0, 1)).toISOString();

  // Pull all candidate events from year start. The DB query accepts a
  // single cutoffDate — we'll post-filter the upper bound in JS.
  let chainEvents: ChainEvent[] = [];
  try {
    const result = await queryChainEvents(address, 1, maxEvents, yearStart);
    chainEvents = result.events.filter((e) => e.timestamp < yearEnd);
  } catch (err) {
    console.warn("[tax-report] queryChainEvents failed:", err);
    return [];
  }

  if (chainEvents.length === 0) return [];

  const dailyIndex = buildDailyPriceIndex();
  const latest = getLatestTaoPrice();
  const latestFallback = latest?.taoUsd ?? 0;

  const taxEvents: TaxEvent[] = [];
  for (const ce of chainEvents) {
    const mapped = chainEventToTaxEvent(ce, address, dailyIndex, latestFallback);
    if (mapped) taxEvents.push(mapped);
  }

  // Sort descending by date (newest first) — matches table default.
  return taxEvents.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

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
