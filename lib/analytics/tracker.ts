/**
 * lib/analytics/tracker.ts
 *
 * Lightweight client-side analytics tracker. Sends events to /api/analytics
 * asynchronously using navigator.sendBeacon for reliability.
 *
 * Tracks: page views, feature usage, subscription funnel events.
 * Privacy-first: no PII, no cookies, no third-party scripts.
 */

export type AnalyticsEvent =
  | "page_view"
  | "wallet_connect"
  | "wallet_disconnect"
  | "subscription_start"
  | "subscription_complete"
  | "subscription_cancel"
  | "export_data"
  | "alert_rule_created"
  | "alert_preset_applied"
  | "chat_query"
  | "recommendation_viewed"
  | "webhook_created"
  | "team_member_added"
  | "pricing_viewed"
  | "plan_selected"
  | "developer_docs_viewed";

interface TrackPayload {
  event: AnalyticsEvent;
  properties?: Record<string, string | number | boolean>;
}

/**
 * Fire-and-forget event tracking. Uses sendBeacon for page-unload safety.
 */
export function track(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>): void {
  if (typeof window === "undefined") return;

  const payload: TrackPayload = { event, properties };

  try {
    const data = JSON.stringify({
      ...payload,
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
      referrer: document.referrer || null,
    });

    // Prefer sendBeacon — survives page unloads
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", data);
    } else {
      fetch("/api/analytics", {
        method: "POST",
        body: data,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Analytics should never break the app
  }
}

/**
 * Track a page view. Call from useEffect in layout/page components.
 */
export function trackPageView(pageName?: string): void {
  track("page_view", pageName ? { page: pageName } : undefined);
}
