export type PlanName = "FREE" | "PRO_SILVER" | "PRO_GOLD" | "PRO_PLATINUM";

export interface Plan {
  id: PlanName;
  displayName: string;
  durationDays: number;
  priceTao: number;
  priceUsd: number;
  features: string[];
  badge?: string;
}

export interface PaymentRecord {
  id: string;
  date: string;
  plan: string;
  amountTao: number;
  amountUsd: number;
  txHash: string;
  status: "CONFIRMED" | "PENDING" | "FAILED";
  entitlementType: "ACTIVATED" | "EXTENDED" | "REACTIVATED";
}

export interface BillingState {
  currentPlan: PlanName;
  premiumExpiresAt: string | null;
  daysRemaining: number | null;
  walletAddress: string;
  paymentHistory: PaymentRecord[];
}

export const PLANS: Plan[] = [
  {
    id: "FREE",
    displayName: "Basic",
    durationDays: 0,
    priceTao: 0,
    priceUsd: 0,
    features: [
      "Browse all 128+ subnets with live chain data",
      "Subnet detail pages with scores and risk bands",
      "Basic portfolio overview (read-only)",
      "Market ticker with live TAO/USD price",
    ],
  },
  {
    id: "PRO_SILVER",
    displayName: "Pro Silver",
    durationDays: 30,
    priceTao: 0.05,
    priceUsd: 29.99,
    features: [
      "Side-by-side subnet comparison (up to 4)",
      "AI-scored subnet recommendations with reasoning",
      "30-day yield & emission history charts",
      "Portfolio performance tracking",
      "CSV data export",
      "Email support",
    ],
  },
  {
    id: "PRO_GOLD",
    displayName: "Pro Gold",
    durationDays: 30,
    priceTao: 0.083,
    priceUsd: 49.99,
    badge: "Most Popular",
    features: [
      "Everything in Silver, plus:",
      "Reallocation simulator (\"what-if\" scenarios)",
      "Real-time alerts (yield drops, emission changes)",
      "90-day historical analytics with trend lines",
      "Custom watchlists with notifications",
      "Priority support",
    ],
  },
  {
    id: "PRO_PLATINUM",
    displayName: "Pro Platinum",
    durationDays: 30,
    priceTao: 0.167,
    priceUsd: 99.99,
    features: [
      "Everything in Gold, plus:",
      "REST API access for programmatic data",
      "365-day full historical analytics",
      "Tax-ready transaction export",
      "Backtesting engine for allocation strategies",
      "Dedicated account manager",
    ],
  },
];

export const BILLING_STATE: BillingState = {
  currentPlan: "PRO_GOLD",
  premiumExpiresAt: "2026-05-01T14:23:11Z",
  daysRemaining: 24,
  walletAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  paymentHistory: [
    {
      id: "pay-001",
      date: "2026-04-01T14:23:11Z",
      plan: "Pro Gold",
      amountTao: 0.083,
      amountUsd: 49.99,
      txHash: "0x4a2c1e8f3b7d9a0c5e2f1b4d8a3c7e9f2b5d0a8c",
      status: "CONFIRMED",
      entitlementType: "EXTENDED",
    },
    {
      id: "pay-002",
      date: "2026-03-01T10:14:00Z",
      plan: "Pro Silver",
      amountTao: 0.051,
      amountUsd: 29.99,
      txHash: "0x9f3b7d1c4a2e8f0b5d2c9a1e4f7b0d3c6a8e2f5b",
      status: "CONFIRMED",
      entitlementType: "EXTENDED",
    },
    {
      id: "pay-003",
      date: "2026-02-01T08:31:00Z",
      plan: "Pro Silver",
      amountTao: 0.049,
      amountUsd: 29.99,
      txHash: "0x2e5a1d8c3f7b0e4d9c2a6f1b5d8a0c3e7f4b2d9a",
      status: "CONFIRMED",
      entitlementType: "ACTIVATED",
    },
  ],
};
