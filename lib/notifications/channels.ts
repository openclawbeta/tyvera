/**
 * lib/notifications/channels.ts
 *
 * Notification delivery abstraction. Supports email (Resend) and
 * Telegram bot channels. Falls back gracefully when credentials
 * are not configured — never blocks alert creation.
 *
 * Env vars:
 *   RESEND_API_KEY       — Resend API key for email delivery
 *   RESEND_FROM_EMAIL    — Sender address (e.g. alerts@tyvera.ai)
 *   TELEGRAM_BOT_TOKEN   — Telegram bot API token
 */

export type NotificationChannel = "email" | "telegram" | "webhook";

export interface NotificationPayload {
  /** Recipient wallet address (used to look up channel preferences) */
  walletAddress: string;
  /** Alert title */
  title: string;
  /** Alert body */
  message: string;
  /** Alert severity */
  severity: "info" | "warning" | "critical";
  /** Alert type (e.g. whale_inflow, yield_drop) */
  alertType: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/* ── Email via Resend ────────────────────────────────────────────── */

async function sendEmail(
  to: string,
  payload: NotificationPayload,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "alerts@tyvera.ai";

  if (!apiKey) {
    console.log("[notify] Resend not configured — skipping email");
    return false;
  }

  const severityEmoji =
    payload.severity === "critical" ? "🔴" :
    payload.severity === "warning" ? "🟡" : "🔵";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `Tyvera Alerts <${fromEmail}>`,
        to: [to],
        subject: `${severityEmoji} ${payload.title}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0a0d14; color: #e2e8f0; border-radius: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
              <span style="font-size: 20px; font-weight: 700; color: #22d3ee;">τ</span>
              <span style="font-size: 14px; font-weight: 600; color: #94a3b8;">Tyvera Alert</span>
            </div>
            <div style="padding: 20px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <span style="font-size: 18px;">${severityEmoji}</span>
                <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #f8fafc;">${payload.title}</h2>
              </div>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">${payload.message}</p>
              <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06);">
                <span style="font-size: 11px; color: #64748b;">Alert type: ${payload.alertType} · Severity: ${payload.severity}</span>
              </div>
            </div>
            <div style="margin-top: 20px; text-align: center;">
              <a href="https://tyvera.ai/alerts" style="display: inline-block; padding: 10px 24px; background: rgba(34,211,238,0.12); border: 1px solid rgba(34,211,238,0.22); border-radius: 10px; color: #22d3ee; font-size: 13px; font-weight: 600; text-decoration: none;">View in Tyvera</a>
            </div>
            <p style="margin-top: 20px; font-size: 11px; color: #475569; text-align: center;">
              You're receiving this because you enabled email alerts on Tyvera.
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      console.error("[notify] Resend error:", res.status, await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("[notify] Email send failed:", err);
    return false;
  }
}

/* ── Telegram ────────────────────────────────────────────────────── */

async function sendTelegram(
  chatId: string,
  payload: NotificationPayload,
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.log("[notify] Telegram not configured — skipping");
    return false;
  }

  const severityEmoji =
    payload.severity === "critical" ? "🔴" :
    payload.severity === "warning" ? "🟡" : "🔵";

  const text = [
    `${severityEmoji} *${escapeMarkdown(payload.title)}*`,
    ``,
    escapeMarkdown(payload.message),
    ``,
    `_${payload.alertType} · ${payload.severity}_`,
    `[View in Tyvera](https://tyvera.ai/alerts)`,
  ].join("\n");

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "MarkdownV2",
          disable_web_page_preview: true,
        }),
      },
    );

    if (!res.ok) {
      console.error("[notify] Telegram error:", res.status, await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("[notify] Telegram send failed:", err);
    return false;
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

/* ── Dispatch ────────────────────────────────────────────────────── */

export interface NotificationPreferences {
  email?: string | null;
  telegramChatId?: string | null;
}

/**
 * Deliver a notification across all configured channels for a wallet.
 * Never throws — logs failures and returns delivery results.
 */
export async function deliverNotification(
  prefs: NotificationPreferences,
  payload: NotificationPayload,
): Promise<{ email: boolean; telegram: boolean }> {
  const results = { email: false, telegram: false };

  const promises: Promise<void>[] = [];

  if (prefs.email) {
    promises.push(
      sendEmail(prefs.email, payload).then((ok) => {
        results.email = ok;
      }),
    );
  }

  if (prefs.telegramChatId) {
    promises.push(
      sendTelegram(prefs.telegramChatId, payload).then((ok) => {
        results.telegram = ok;
      }),
    );
  }

  await Promise.allSettled(promises);

  return results;
}
