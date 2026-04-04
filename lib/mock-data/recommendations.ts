import type { RiskLevel } from "./subnets";

export interface Recommendation {
  id: string;
  fromSubnet: { netuid: number; name: string; yield: number };
  toSubnet: { netuid: number; name: string; yield: number };
  amount: number;               // TAO
  fraction: number;             // fraction of source stake
  projectedEdge: number;        // expected APR improvement
  projectedEdgeRao: number;     // estimated rao gain per day
  fees: { move: number; chain: number; total: number }; // in TAO
  breakeven: number;            // days
  confidence: number;           // 0–100
  confidenceLabel: "HIGH" | "GOOD" | "FAIR" | "WEAK";
  riskLevel: RiskLevel;
  band: "STRONG" | "MODERATE" | "MILD";
  score: number;                // 0–1 final score
  rationale: string;
  factorBullets: Array<{ label: string; direction: "POSITIVE" | "NEGATIVE" | "NEUTRAL"; sentence: string }>;
  riskBullets: string[];
  status: "ACTIVE" | "ACCEPTED" | "DISMISSED" | "EXPIRED";
  expiresAt: string;
  generatedAt: string;
  postMoveConcentration: number;
}

export const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "rec-001",
    fromSubnet: { netuid: 3, name: "Data Scraping", yield: 15.0 },
    toSubnet: { netuid: 18, name: "Image Generation", yield: 23.0 },
    amount: 0.48,
    fraction: 0.10,
    projectedEdge: 8.0,
    projectedEdgeRao: 320,
    fees: { move: 0.00024, chain: 0.00001, total: 0.00025 },
    breakeven: 23,
    confidence: 78,
    confidenceLabel: "GOOD",
    riskLevel: "MODERATE",
    band: "MODERATE",
    score: 0.24,
    rationale:
      "Image Generation (SN18) has consistently outperformed Data Scraping (SN3) over the past 30 days on a risk-adjusted basis. At current rates, moving 0.48 τ covers its move fee in roughly 23 days.",
    factorBullets: [
      {
        label: "Yield Advantage",
        direction: "POSITIVE",
        sentence: "SN18 produces ~53% more daily emissions per TAO staked than SN3 — a gap consistent over the past month.",
      },
      {
        label: "Rising Emissions",
        direction: "POSITIVE",
        sentence: "SN18's emission rate has been gradually rising over two weeks, not falling — the advantage isn't purely historical.",
      },
      {
        label: "New Staker Activity",
        direction: "NEGATIVE",
        sentence: "Above-average staker inflow on SN18 may compress the yield gap over the coming weeks.",
      },
    ],
    riskBullets: [
      "New stakers are joining SN18 at an above-average rate. The yield advantage may narrow.",
      "26 days of clean data available — slightly short of the 30-day ideal, modestly reducing confidence.",
    ],
    status: "ACTIVE",
    expiresAt: "2026-04-02T14:23:11Z",
    generatedAt: "2026-04-01T14:23:11Z",
    postMoveConcentration: 0.26,
  },
  {
    id: "rec-002",
    fromSubnet: { netuid: 11, name: "Decentralized Storage", yield: 13.2 },
    toSubnet: { netuid: 49, name: "Protein Folding", yield: 26.7 },
    amount: 0.22,
    fraction: 0.05,
    projectedEdge: 13.5,
    projectedEdgeRao: 810,
    fees: { move: 0.00011, chain: 0.00001, total: 0.00012 },
    breakeven: 7,
    confidence: 91,
    confidenceLabel: "HIGH",
    riskLevel: "LOW",
    band: "STRONG",
    score: 0.38,
    rationale:
      "Protein Folding (SN49) is the strongest signal in the current snapshot. Deep liquidity, 390-day track record, and a 14.5pp yield advantage over Decentralized Storage make this a high-conviction move.",
    factorBullets: [
      {
        label: "Yield Advantage",
        direction: "POSITIVE",
        sentence: "SN49 produces 102% more daily emissions per TAO staked than SN11 — the largest gap in today's snapshot.",
      },
      {
        label: "Exceptional Liquidity",
        direction: "POSITIVE",
        sentence: "13,800 τ staked across 1,124 stakers. Deep enough that this move has negligible dilution impact.",
      },
      {
        label: "Low Validator Take",
        direction: "POSITIVE",
        sentence: "SN49's 10% take rate is among the lowest on the network, maximizing the staker's share of emissions.",
      },
    ],
    riskBullets: [],
    status: "ACTIVE",
    expiresAt: "2026-04-02T14:23:11Z",
    generatedAt: "2026-04-01T14:23:11Z",
    postMoveConcentration: 0.08,
  },
  {
    id: "rec-003",
    fromSubnet: { netuid: 32, name: "Audio Synthesis", yield: 17.8 },
    toSubnet: { netuid: 25, name: "Code Execution", yield: 22.1 },
    amount: 0.10,
    fraction: 0.05,
    projectedEdge: 4.3,
    projectedEdgeRao: 118,
    fees: { move: 0.00005, chain: 0.00001, total: 0.00006 },
    breakeven: 30,
    confidence: 64,
    confidenceLabel: "FAIR",
    riskLevel: "MODERATE",
    band: "MILD",
    score: 0.17,
    rationale:
      "Code Execution (SN25) carries a modest yield advantage and a rising trend. Lower confidence due to data gaps limits our conviction. A small exploratory move makes sense; a large one does not.",
    factorBullets: [
      {
        label: "Yield Advantage",
        direction: "POSITIVE",
        sentence: "SN25 is earning ~24% more per TAO staked than SN32 over the past 30 days.",
      },
      {
        label: "Rising Trend",
        direction: "POSITIVE",
        sentence: "SN25 emission rate has risen steadily for 14 days, suggesting the gap is expanding, not contracting.",
      },
      {
        label: "Data Coverage",
        direction: "NEGATIVE",
        sentence: "Only 21 days of complete data available for SN25 in this window. Confidence is fair, not high.",
      },
    ],
    riskBullets: [
      "Data coverage for SN25 has some gaps. The estimates are reasonable but less precise than usual.",
      "At current rates, the move fee takes 30 days to recover — factor this in if you plan to reallocate again soon.",
    ],
    status: "ACTIVE",
    expiresAt: "2026-04-02T14:23:11Z",
    generatedAt: "2026-04-01T14:23:11Z",
    postMoveConcentration: 0.14,
  },
  {
    id: "rec-004",
    fromSubnet: { netuid: 1, name: "Text Prompting", yield: 24.3 },
    toSubnet: { netuid: 8, name: "Time Series Pred.", yield: 19.4 },
    amount: 0,
    fraction: 0,
    projectedEdge: -4.9,
    projectedEdgeRao: 0,
    fees: { move: 0, chain: 0, total: 0 },
    breakeven: Infinity,
    confidence: 82,
    confidenceLabel: "GOOD",
    riskLevel: "HIGH",
    band: "MILD",
    score: 0.0,
    rationale: "Suppressed: Destination yield does not exceed source yield. No gross advantage before fees.",
    factorBullets: [],
    riskBullets: [],
    status: "EXPIRED",
    expiresAt: "2026-03-31T14:23:11Z",
    generatedAt: "2026-03-30T14:23:11Z",
    postMoveConcentration: 0,
  },
];

export const ACTIVE_RECOMMENDATIONS = RECOMMENDATIONS.filter((r) => r.status === "ACTIVE");
