import type { TaxEvent, TaxSummary, TaxEventType } from "@/lib/types/tax";

// Mock TAO pricing data for realistic tax valuations
const TAO_PRICE_HISTORY: Record<string, number> = {
  "2025-01": 420.5,
  "2025-02": 445.2,
  "2025-03": 465.8,
  "2025-04": 480.3,
  "2025-05": 510.2,
  "2025-06": 525.7,
  "2025-07": 545.1,
  "2025-08": 560.4,
  "2025-09": 580.6,
  "2025-10": 595.2,
  "2025-11": 610.8,
  "2025-12": 635.3,
  "2026-01": 650.5,
  "2026-02": 665.2,
  "2026-03": 680.8,
  "2026-04": 695.4,
};

const SUBNETS = [
  "Text Prompting",
  "Protein Folding",
  "Multi-Modality",
  "Data Scraping",
  "Decentralized Storage",
  "Audio Synthesis",
  "Code Execution",
  "Time Series Prediction",
];

function getPriceForDate(date: Date): number {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const key = `${year}-${month}`;
  return TAO_PRICE_HISTORY[key] || 500;
}

function generateMockTaxEvents(year: number): TaxEvent[] {
  const events: TaxEvent[] = [];
  let idCounter = 1;

  // Generate 12 months of staking rewards (weekly)
  for (let month = 1; month <= 12; month++) {
    const daysInMonth = new Date(year, month, 0).getDate();

    // Weekly rewards
    for (let week = 1; week <= 4; week++) {
      const dayOfMonth = Math.min(week * 7, daysInMonth);
      const date = new Date(year, month - 1, dayOfMonth);
      const priceUsd = getPriceForDate(date);

      const subnet = SUBNETS[Math.floor(Math.random() * SUBNETS.length)];
      const rewardAmount = 0.012 + Math.random() * 0.008; // 0.012 - 0.020 τ
      const txHash = `0x${Math.random().toString(16).slice(2, 66)}`;

      events.push({
        id: `tax-${idCounter++}`,
        date: date.toISOString(),
        type: "STAKING_REWARD",
        subnet,
        amountTao: parseFloat(rewardAmount.toFixed(6)),
        priceUsdAtTime: priceUsd,
        valueUsd: parseFloat((rewardAmount * priceUsd).toFixed(2)),
        txHash,
        notes: `Weekly staking reward from ${subnet}`,
      });
    }
  }

  // Add periodic stakes (3-4 per year)
  const stakeMonths = [2, 5, 8, 11];
  stakeMonths.forEach((month, idx) => {
    const date = new Date(year, month - 1, 15 + idx * 2);
    const priceUsd = getPriceForDate(date);
    const subnet = SUBNETS[idx];
    const stakeAmount = 0.5 + Math.random() * 0.5;
    const txHash = `0x${Math.random().toString(16).slice(2, 66)}`;

    events.push({
      id: `tax-${idCounter++}`,
      date: date.toISOString(),
      type: "STAKE",
      subnet,
      amountTao: parseFloat(stakeAmount.toFixed(2)),
      priceUsdAtTime: priceUsd,
      valueUsd: parseFloat((stakeAmount * priceUsd).toFixed(2)),
      txHash,
      notes: `New stake to ${subnet}`,
    });
  });

  // Add periodic unstakes (2-3 per year)
  const unstakeMonths = [3, 9];
  unstakeMonths.forEach((month, idx) => {
    const date = new Date(year, month - 1, 20 + idx * 3);
    const priceUsd = getPriceForDate(date);
    const subnet = SUBNETS[idx + 2];
    const unstakeAmount = 0.3 + Math.random() * 0.3;
    const txHash = `0x${Math.random().toString(16).slice(2, 66)}`;

    events.push({
      id: `tax-${idCounter++}`,
      date: date.toISOString(),
      type: "UNSTAKE",
      subnet,
      amountTao: parseFloat(unstakeAmount.toFixed(2)),
      priceUsdAtTime: priceUsd,
      valueUsd: parseFloat((unstakeAmount * priceUsd).toFixed(2)),
      txHash,
      notes: `Unstaked from ${subnet}`,
    });
  });

  // Add periodic moves (3 per year)
  const moveMonths = [4, 7, 10];
  moveMonths.forEach((month, idx) => {
    const date = new Date(year, month - 1, 10 + idx * 2);
    const priceUsd = getPriceForDate(date);
    const moveAmount = 0.2 + Math.random() * 0.3;
    const txHash = `0x${Math.random().toString(16).slice(2, 66)}`;
    const fromSubnet = SUBNETS[idx];
    const toSubnet = SUBNETS[(idx + 1) % SUBNETS.length];

    events.push({
      id: `tax-${idCounter++}`,
      date: date.toISOString(),
      type: "MOVE",
      subnet: `${fromSubnet} → ${toSubnet}`,
      amountTao: parseFloat(moveAmount.toFixed(2)),
      priceUsdAtTime: priceUsd,
      valueUsd: parseFloat((moveAmount * priceUsd).toFixed(2)),
      txHash,
      notes: `Reallocation from ${fromSubnet} to ${toSubnet}`,
    });
  });

  // Add monthly subscription fees (if applicable)
  for (let month = 1; month <= 12; month++) {
    // Only add subscriptions for months where it makes sense (sample months)
    if (month % 3 === 0) {
      const date = new Date(year, month - 1, 1);
      const priceUsd = getPriceForDate(date);
      const feeAmount = 0.05; // 0.05 τ monthly fee
      const txHash = `0x${Math.random().toString(16).slice(2, 66)}`;

      events.push({
        id: `tax-${idCounter++}`,
        date: date.toISOString(),
        type: "SUBSCRIPTION",
        subnet: "Premium Tier",
        amountTao: feeAmount,
        priceUsdAtTime: priceUsd,
        valueUsd: parseFloat((feeAmount * priceUsd).toFixed(2)),
        txHash,
        notes: "Monthly premium subscription fee",
      });
    }
  }

  // Sort by date descending
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function generateTaxReport(year?: number): TaxEvent[] {
  const targetYear = year || new Date().getFullYear();
  return generateMockTaxEvents(targetYear);
}

export function exportTaxCsv(events: TaxEvent[]): string {
  const headers = ["Date", "Type", "Subnet", "Amount (TAO)", "TAO Price (USD)", "Value (USD)", "Tx Hash", "Notes"];

  const rows = events.map((event) => [
    new Date(event.date).toLocaleDateString("en-US"),
    event.type,
    event.subnet,
    event.amountTao.toFixed(6),
    event.priceUsdAtTime.toFixed(2),
    event.valueUsd.toFixed(2),
    event.txHash ? `${event.txHash.slice(0, 10)}...${event.txHash.slice(-8)}` : "—",
    event.notes || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape cells containing commas or quotes
          const str = String(cell);
          return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(",")
    ),
  ].join("\n");

  return csvContent;
}

export function getTaxSummary(events: TaxEvent[]): TaxSummary {
  let totalRewardsTao = 0;
  let totalRewardsUsd = 0;
  let totalFeesTao = 0;
  let totalFeesUsd = 0;

  events.forEach((event) => {
    if (event.type === "STAKING_REWARD") {
      totalRewardsTao += event.amountTao;
      totalRewardsUsd += event.valueUsd;
    } else if (event.type === "SUBSCRIPTION") {
      totalFeesTao += event.amountTao;
      totalFeesUsd += event.valueUsd;
    }
  });

  const netIncomeTao = totalRewardsTao - totalFeesTao;
  const netIncomeUsd = totalRewardsUsd - totalFeesUsd;

  const sortedDates = events.map((e) => new Date(e.date)).sort((a, b) => a.getTime() - b.getTime());

  return {
    totalRewardsTao: parseFloat(totalRewardsTao.toFixed(6)),
    totalRewardsUsd: parseFloat(totalRewardsUsd.toFixed(2)),
    totalFeesTao: parseFloat(totalFeesTao.toFixed(6)),
    totalFeesUsd: parseFloat(totalFeesUsd.toFixed(2)),
    netIncomeTao: parseFloat(netIncomeTao.toFixed(6)),
    netIncomeUsd: parseFloat(netIncomeUsd.toFixed(2)),
    eventCount: events.length,
    startDate: sortedDates.length > 0 ? sortedDates[0].toISOString() : new Date().toISOString(),
    endDate: sortedDates.length > 0 ? sortedDates[sortedDates.length - 1].toISOString() : new Date().toISOString(),
  };
}
