/* ─────────────────────────────────────────────────────────────────── */
/* Phase 2D — Payment intent types                                     */
/* ─────────────────────────────────────────────────────────────────── */

export type PaymentIntentStatus =
  | "idle"            // no payment in progress
  | "generating"      // generating deposit address
  | "awaiting_payment" // address generated, waiting for user to send TAO
  | "confirming"      // payment detected, waiting for block confirmations
  | "confirmed"       // payment confirmed, subscription activated
  | "failed"          // payment failed or timed out
  | "expired";        // payment window expired (24h)

export interface PaymentIntent {
  id: string;
  planId: string;
  planName: string;
  amountTao: number;
  amountUsd: number;
  depositAddress: string;
  memo: string;
  status: PaymentIntentStatus;
  createdAt: string;
  expiresAt: string;       // 24h from creation
  txHash: string | null;    // set once payment is detected
  confirmations: number;    // block confirmations (0 until detected)
  requiredConfirmations: number; // typically 6
}
