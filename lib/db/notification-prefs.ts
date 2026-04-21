/**
 * lib/db/notification-prefs.ts
 *
 * CRUD for notification_preferences table.
 */

import { getDb } from "./index";

export interface NotificationPrefs {
  wallet_address: string;
  email: string | null;
  telegram_chat_id: string | null;
  email_enabled: boolean;
  telegram_enabled: boolean;
  min_severity: "info" | "warning" | "critical";
}

function rowToObject(columns: string[], values: unknown[]): Record<string, unknown> {
  return Object.fromEntries(columns.map((c, i) => [c, values[i]]));
}

export async function getNotificationPrefs(walletAddress: string): Promise<NotificationPrefs | null> {
  const db = await getDb();

  const rows = await db.query(
    "SELECT * FROM notification_preferences WHERE wallet_address = ? LIMIT 1",
    [walletAddress],
  );

  if (!rows.length || !rows[0].rows.length) return null;

  const obj = rowToObject(rows[0].columns, rows[0].rows[0]);
  return {
    wallet_address: obj.wallet_address as string,
    email: (obj.email as string) || null,
    telegram_chat_id: (obj.telegram_chat_id as string) || null,
    email_enabled: Boolean(obj.email_enabled),
    telegram_enabled: Boolean(obj.telegram_enabled),
    min_severity: (obj.min_severity as NotificationPrefs["min_severity"]) || "warning",
  };
}

export async function upsertNotificationPrefs(
  walletAddress: string,
  updates: Partial<Omit<NotificationPrefs, "wallet_address">>,
): Promise<void> {
  const db = await getDb();

  const existing = await getNotificationPrefs(walletAddress);

  if (existing) {
    const sets: string[] = [];
    const vals: unknown[] = [];

    if (updates.email !== undefined) { sets.push("email = ?"); vals.push(updates.email); }
    if (updates.telegram_chat_id !== undefined) { sets.push("telegram_chat_id = ?"); vals.push(updates.telegram_chat_id); }
    if (updates.email_enabled !== undefined) { sets.push("email_enabled = ?"); vals.push(updates.email_enabled ? 1 : 0); }
    if (updates.telegram_enabled !== undefined) { sets.push("telegram_enabled = ?"); vals.push(updates.telegram_enabled ? 1 : 0); }
    if (updates.min_severity !== undefined) { sets.push("min_severity = ?"); vals.push(updates.min_severity); }

    if (sets.length === 0) return;

    sets.push("updated_at = datetime('now')");
    vals.push(walletAddress);

    await db.execute(
      `UPDATE notification_preferences SET ${sets.join(", ")} WHERE wallet_address = ?`,
      vals,
    );
  } else {
    await db.execute(
      `INSERT INTO notification_preferences (wallet_address, email, telegram_chat_id, email_enabled, telegram_enabled, min_severity)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        walletAddress,
        updates.email ?? null,
        updates.telegram_chat_id ?? null,
        updates.email_enabled ? 1 : 0,
        updates.telegram_enabled ? 1 : 0,
        updates.min_severity ?? "warning",
      ],
    );
  }
}
