export interface Allocation {
  netuid: number;
  name: string;
  symbol: string;
  amountTao: number;
  fraction: number;
  yield: number;
  yieldDelta7d: number;
  value: number;           // USD equivalent (mock)
  earnings7d: number;      // TAO earned past 7 days
  color: string;           // for charts
}

export interface PortfolioStats {
  totalStakedTao: number;
  totalValueUsd: number;
  weightedYield: number;   // portfolio-weighted average yield
  earnings7d: number;
  earnings30d: number;     // estimated
  topSubnet: string;
  diversificationScore: number; // 0–100
}

export interface RecentChange {
  id: string;
  type: "MOVE" | "ADD" | "REMOVE";
  fromSubnet?: string;
  toSubnet?: string;
  subnet?: string;
  amount: number;
  timestamp: string;
  txHash: string;
  status: "CONFIRMED" | "PENDING";
}

export interface WatchlistItem {
  netuid: number;
  name: string;
  yield: number;
  yieldDelta7d: number;
  score: number;
  alert?: string;
}

export const PORTFOLIO_STATS: PortfolioStats = {
  totalStakedTao: 8.24,
  totalValueUsd: 4948,
  weightedYield: 22.8,
  earnings7d: 0.0361,
  earnings30d: 0.1548,
  topSubnet: "Protein Folding",
  diversificationScore: 74,
};

export const ALLOCATIONS: Allocation[] = [
  {
    netuid: 1,
    name: "Text Prompting",
    symbol: "τ1",
    amountTao: 3.20,
    fraction: 0.388,
    yield: 24.3,
    yieldDelta7d: 1.2,
    value: 1921,
    earnings7d: 0.0149,
    color: "#22d3ee",
  },
  {
    netuid: 49,
    name: "Protein Folding",
    symbol: "τ49",
    amountTao: 2.40,
    fraction: 0.291,
    yield: 26.7,
    yieldDelta7d: 0.4,
    value: 1441,
    earnings7d: 0.0123,
    color: "#8b5cf6",
  },
  {
    netuid: 4,
    name: "Multi-Modality",
    symbol: "τ4",
    amountTao: 1.20,
    fraction: 0.146,
    yield: 21.7,
    yieldDelta7d: 0.8,
    value: 721,
    earnings7d: 0.0050,
    color: "#10b981",
  },
  {
    netuid: 3,
    name: "Data Scraping",
    symbol: "τ3",
    amountTao: 0.82,
    fraction: 0.100,
    yield: 15.0,
    yieldDelta7d: -2.1,
    value: 492,
    earnings7d: 0.0024,
    color: "#f59e0b",
  },
  {
    netuid: 11,
    name: "Decentralized Storage",
    symbol: "τ11",
    amountTao: 0.38,
    fraction: 0.046,
    yield: 13.2,
    yieldDelta7d: -0.4,
    value: 228,
    earnings7d: 0.0009,
    color: "#64748b",
  },
  {
    netuid: 32,
    name: "Audio Synthesis",
    symbol: "τ32",
    amountTao: 0.24,
    fraction: 0.029,
    yield: 17.8,
    yieldDelta7d: -1.0,
    value: 144,
    earnings7d: 0.0006,
    color: "#f43f5e",
  },
];

// 14-day portfolio value history for chart
export const PORTFOLIO_HISTORY = Array.from({ length: 14 }, (_, i) => ({
  day: `Apr ${i + 1 > 14 ? i - 13 : i + 19}`,
  value: 4600 + Math.sin(i * 0.4) * 120 + i * 24,
  yield: 21.8 + Math.sin(i * 0.3) * 1.2,
}));

export const RECENT_CHANGES: RecentChange[] = [
  {
    id: "rc-001",
    type: "MOVE",
    fromSubnet: "Decentralized Storage",
    toSubnet: "Protein Folding",
    amount: 0.22,
    timestamp: "2026-03-28T10:14:00Z",
    txHash: "4821003-2",
    status: "CONFIRMED",
  },
  {
    id: "rc-002",
    type: "ADD",
    subnet: "Text Prompting",
    amount: 0.50,
    timestamp: "2026-03-20T15:42:00Z",
    txHash: "4798221-5",
    status: "CONFIRMED",
  },
  {
    id: "rc-003",
    type: "MOVE",
    fromSubnet: "Audio Synthesis",
    toSubnet: "Multi-Modality",
    amount: 0.18,
    timestamp: "2026-03-12T08:31:00Z",
    txHash: "4762018-1",
    status: "CONFIRMED",
  },
];

export const WATCHLIST: WatchlistItem[] = [
  { netuid: 25, name: "Code Execution", yield: 22.1, yieldDelta7d: 1.5, score: 80 },
  { netuid: 8,  name: "Time Series Pred.", yield: 19.4, yieldDelta7d: 2.6, score: 72, alert: "Rapid inflow" },
  { netuid: 19, name: "Video Generation", yield: 28.4, yieldDelta7d: -3.2, score: 65, alert: "High risk" },
  { netuid: 21, name: "Embedding & Search", yield: 18.6, yieldDelta7d: 0.3, score: 70 },
];
