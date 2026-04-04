export type PlanName = "FREE" | "PREMIUM_MONTHLY" | "PREMIUM_QUARTERLY" | "PREMIUM_ANNUAL";

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
    displayName: "Free",
    durationDays: 0,
    priceTao: 0,
    priceUsd: 0,
    features: [
      "View top 5 subnets",
      "Basic portfolio tracking",
      "No recommendations",
      "No reallocation tools",
    ],
  },
  {
    id: "PREMIUM_MONTHLY",
    displayName: "1 Month Premium",
    durationDays: 30,
    priceTao: 0.5,
    priceUsd: 300,
    features: [
      "All 64+ subnets with full analytics",
      "AI-scored recommendations",
      "Assisted reallocation flow",
      "Portfolio optimization tools",
      "Priority support",
      "Data export",
    ],
  },
  {
    id: "PREMIUM_QUARTERLY",
    displayName: "3 Months Premium",
    durationDays: 90,
    priceTao: 1.35,
    priceUsd: 810,
    badge: "Best Value",
    features: [
      "Everything in Monthly",
      "10% discount vs monthly",
      "Early access to new features",
      "Backtesting access (coming soon)",
    ],
  },
  {
    id: "PREMIUM_ANNUAL",
    displayName: "1 Year Premium",
    durationDays: 365,
    priceTao: 4.8,
    priceUsd: 2880,
    features: [
      "Everything in Quarterly",
      "20% discount vs monthly",
      "Advanced portfolio analytics",
      "API access (coming soon)",
      "Dedicated support",
    ],
  },
];

export const BILLING_STATE: BillingState = {
  currentPlan: "PREMIUM_MONTHLY",
  premiumExpiresAt: "2026-05-01T14:23:11Z",
  daysRemaining: 30,
  walletAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  paymentHistory: [
    {
      id: "pay-001",
      date: "2026-04-01T14:23:11Z",
      plan: "1 Month Premium",
      amountTao: 0.5,
      amountUsd: 300,
      txHash: "0x4a2c1e8f3b7d9a0c5e2f1b4d8a3c7e9f2b5d0a8c",
      status: "CONFIRMED",
      entitlementType: "EXTENDED",
    },
    {
      id: "pay-002",
      date: "2026-03-01T10:14:00Z",
      plan: "1 Month Premium",
      amountTao: 0.5,
      amountUsd: 298,
      txHash: "0x9f3b7d1c4a2e8f0b5d2c9a1e4f7b0d3c6a8e2f5b",
      status: "CONFIRMED",
      entitlementType: "EXTENDED",
    },
    {
      id: "pay-003",
      date: "2026-02-01T08:31:00Z",
      plan: "1 Month Premium",
      amountTao: 0.5,
      amountUsd: 310,
      txHash: "0x2e5a1d8c3f7b0e4d9c2a6f1b5d8a0c3e7f4b2d9a",
      status: "CONFIRMED",
      entitlementType: "ACTIVATED",
    },
  ],
};
