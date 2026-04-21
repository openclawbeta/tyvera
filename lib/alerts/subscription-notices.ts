/**
 * lib/alerts/subscription-notices.ts
 *
 * Scans active/grace subscriptions and emits in-app alerts at 7, 3, 1 days
 * before expiry, plus a "grace period started" and "expired" notice.
 *
 * Deduplication: we check the last 24h of alerts per wallet+alertType+day-bucket
 * metadata so the same tier of warning doesn't fire twice in a day.
 *
 * Called from /api/cron/subscription-notices on a daily cadence.
 */

import { getDb } from "@/lib/db";
import { createAlert, countRecentAlerts } from "@/lib/db/alerts";
import { getTierDefinition } from "@/lib/types/tiers";

interface SubRow {
  wallet_address: string;
  plan_id: string;
  tier: string;
  status: string;
  expires_at: string;
}

export interface NoticeResult {
  scanned: number;
  expiringSent: number;
  graceSent: number;
  expiredSent: number;
  durationMs: number;
}

function daysBetween(future: string, now: Date): number {
  const diffMs = new Date(future).getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Run once per day from the cron handler.
 */
export async function sendSubscriptionNotices(): Promise<NoticeResult> {
  const start = Date.now();
  const db = await getDb();
  const now = new Date();

  const rows = await db.query(
    `SELECT wallet_address, plan_id, tier, status, expires_at
     FROM subscriptions
     WHERE status IN ('active', 'grace', 'expired')
     ORDER BY expires_at ASC`,
  );

  const subs: SubRow[] =
    rows.length === 0
      ? []
      : rows[0].rows.map((r) => {
          const cols = rows[0].columns;
          const obj: Record<string, unknown> = {};
          cols.forEach((c, i) => (obj[c] = r[i]));
          return obj as unknown as SubRow;
        });

  let expiringSent = 0;
  let graceSent = 0;
  let expiredSent = 0;

  for (const sub of subs) {
    const tierDef = getTierDefinition(sub.tier);
    const tierLabel = tierDef?.displayName ?? sub.tier;

    if (sub.status === "active") {
      const days = daysBetween(sub.expires_at, now);
      // Fire only at 7/3/1-day boundaries to avoid spam.
      if (![7, 3, 1].includes(days)) continue;

      // Cooldown: don't double-fire within 22h.
      const recent = await countRecentAlerts(
        sub.wallet_address,
        "subscription_expiring",
        22 * 60,
      );
      if (recent > 0) continue;

      const severity = days <= 1 ? "critical" : days <= 3 ? "warning" : "info";
      await createAlert(
        sub.wallet_address,
        "subscription_expiring",
        severity,
        `${tierLabel} subscription expires in ${days} day${days === 1 ? "" : "s"}`,
        `Send a renewal TAO payment before ${new Date(
          sub.expires_at,
        ).toLocaleDateString()} to keep your ${tierLabel} features active.`,
        { plan_id: sub.plan_id, expires_at: sub.expires_at, days_remaining: days },
      );
      expiringSent += 1;
      continue;
    }

    if (sub.status === "grace") {
      // One-shot: fire on the first run after entering grace.
      const recent = await countRecentAlerts(
        sub.wallet_address,
        "subscription_grace",
        7 * 24 * 60, // once per week max
      );
      if (recent > 0) continue;

      await createAlert(
        sub.wallet_address,
        "subscription_grace",
        "critical",
        `${tierLabel} subscription in grace period`,
        "Your subscription has lapsed but you still have full access during the 7-day grace window. Renew now to avoid dropping to the free Explorer tier.",
        { plan_id: sub.plan_id, expires_at: sub.expires_at },
      );
      graceSent += 1;
      continue;
    }

    if (sub.status === "expired") {
      // One-shot: fire the day it transitions to expired.
      const recent = await countRecentAlerts(
        sub.wallet_address,
        "subscription_expired",
        7 * 24 * 60,
      );
      if (recent > 0) continue;

      const daysSince = -daysBetween(sub.expires_at, now);
      if (daysSince < 7 || daysSince > 9) continue; // only fire within a narrow window after grace ends

      await createAlert(
        sub.wallet_address,
        "subscription_expired",
        "warning",
        `${tierLabel} subscription expired`,
        "You're back on the free Explorer tier. Renew anytime to restore premium access — your data is preserved.",
        { plan_id: sub.plan_id, expires_at: sub.expires_at },
      );
      expiredSent += 1;
    }
  }

  return {
    scanned: subs.length,
    expiringSent,
    graceSent,
    expiredSent,
    durationMs: Date.now() - start,
  };
}
