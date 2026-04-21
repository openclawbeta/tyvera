/**
 * lib/db/payment-history.ts
 *
 * Payment history queries for the billing page.
 */

import { getDb } from "./index";

export interface PaymentRecord {
  id: number;
  wallet_address: string;
  plan_id: string;
  amount_tao: number;
  tx_hash: string | null;
  billing_cycle: string;
  status: string;
  paid_at: string;
}

function rowToObject(columns: string[], values: unknown[]): Record<string, unknown> {
  return Object.fromEntries(columns.map((c, i) => [c, values[i]]));
}

/**
 * Get payment history for a wallet, most recent first.
 */
export async function getPaymentHistory(
  walletAddress: string,
  limit = 20,
): Promise<PaymentRecord[]> {
  const db = await getDb();

  // Pull from subscriptions table (confirmed payments) + payment_history table
  const rows = await db.query(
    `SELECT id, wallet_address, plan_id, amount_tao, tx_hash,
            'monthly' as billing_cycle, status, activated_at as paid_at
     FROM subscriptions
     WHERE wallet_address = ? AND status IN ('active', 'expired', 'grace', 'cancelled')
     ORDER BY activated_at DESC
     LIMIT ?`,
    [walletAddress, limit],
  );

  if (!rows.length || !rows[0].rows.length) return [];

  return rows[0].rows.map((row: unknown[]) =>
    rowToObject(rows[0].columns, row) as unknown as PaymentRecord,
  );
}
