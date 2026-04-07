export type BillingStatus =
  | "disconnected"        // no wallet connected
  | "connected_free"      // wallet connected, no active subscription
  | "active"              // paid subscription, within period
  | "grace"               // subscription expired < 7 days ago
  | "expired"             // subscription expired > 7 days ago
  | "payment_pending"     // payment sent, awaiting confirmation
  | "payment_failed";     // payment attempted but failed

export interface WalletBillingState {
  status: BillingStatus;
  currentPlan: string | null;      // null if free/disconnected
  expiresAt: string | null;        // ISO date or null
  daysRemaining: number | null;    // null if no active sub
  walletAddress: string | null;
}
