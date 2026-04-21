"use client";

import { useState } from "react";
import {
  Key,
  Zap,
  Webhook,
  Shield,
  Clock,
  Copy,
  CheckCircle,
  Lock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

/* ── Aurora palette (CSS vars so dark mode switches automatically) ── */
const INK = "var(--aurora-ink)";
const SUB = "var(--aurora-sub)";
const HAIR = "var(--aurora-hair)";
const CHIP = "var(--surface-3)";
const SOFT = "var(--surface-2)";
const PANEL_BG = "var(--surface-1)";
const CANVAS = "var(--aurora-cream)";
const NAV_ACTIVE_FG = "var(--aurora-cream)"; // inverted fg on active pill

/* ── Section nav ─────────────────────────────────────────────────── */
const SECTIONS = [
  { id: "auth", label: "Authentication", icon: Key },
  { id: "endpoints", label: "Endpoints", icon: Zap },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "rate-limits", label: "Rate Limits", icon: Clock },
  { id: "tiers", label: "Tier Access", icon: Shield },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/* ── Aurora surface card ─────────────────────────────────────────── */
function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border p-6 sm:p-8 ${className}`}
      style={{
        background: PANEL_BG,
        borderColor: HAIR,
        boxShadow: "0 1px 2px rgba(15,15,18,0.04)",
      }}
    >
      {children}
    </div>
  );
}

/* ── Code block (stays dark on purpose — standard dev-doc pattern) ─ */
function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{ background: "#111214", border: `1px solid ${HAIR}` }}
    >
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span
          className="text-[10px] font-mono uppercase tracking-wider"
          style={{ color: "#8a877f" }}
        >
          {language}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[11px] transition-colors rounded px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2"
          style={{ color: "#d6d3cc" }}
          aria-label="Copy code"
        >
          {copied ? (
            <CheckCircle className="w-3 h-3" style={{ color: "#A7F0D2" }} />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono"
        style={{ color: "#e8e5dd" }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ── Endpoint row ────────────────────────────────────────────────── */
function EndpointRow({
  method,
  path,
  description,
  auth,
  tier,
}: {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  auth: boolean;
  tier?: string;
}) {
  // Aurora-friendly HTTP method colors (warm, desaturated)
  const methodStyle =
    method === "GET"   ? { bg: "#E5F7EE", fg: "#0B8F5A" } :
    method === "POST"  ? { bg: "#E4DBFF", fg: "#5B4BC9" } :
    method === "PUT"   ? { bg: "#FFF6DC", fg: "#8B6914" } :
                         { bg: "#FFE1DD", fg: "#B33A2A" };

  return (
    <div
      className="flex items-start gap-3 py-3 last:border-0"
      style={{ borderBottom: `1px solid ${HAIR}` }}
    >
      <span
        className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-bold font-mono min-w-[52px]"
        style={{ background: methodStyle.bg, color: methodStyle.fg }}
      >
        {method}
      </span>
      <div className="flex-1 min-w-0">
        <code className="text-sm font-mono" style={{ color: INK }}>{path}</code>
        <p className="text-xs mt-1" style={{ color: SUB }}>{description}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {auth && (
          <span
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{ background: CHIP, color: INK }}
          >
            <Lock className="w-2.5 h-2.5" />
            Auth
          </span>
        )}
        {tier && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{ background: "#E4DBFF", color: "#5B4BC9" }}
          >
            {tier}+
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Inline code helper (warm chip) ──────────────────────────────── */
function IC({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="font-mono text-[0.85em] px-1 py-0.5 rounded"
      style={{ background: CHIP, color: INK }}
    >
      {children}
    </code>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function DevelopersPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("auth");

  return (
    <div className="min-h-screen w-full" style={{ background: CANVAS, color: INK }}>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <PageHeader
          title="Developer Documentation"
          subtitle="Integrate Tyvera's Bittensor analytics into your applications"
        />

        <div className="mt-8 flex flex-col lg:flex-row gap-6">
          {/* Sidebar nav */}
          <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible lg:w-52 flex-shrink-0">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className="flex shrink-0 items-center gap-2.5 rounded-full px-3.5 py-2 text-left text-sm transition-all lg:w-full focus-visible:outline-none focus-visible:ring-2"
                  style={{
                    background: isActive ? INK : "transparent",
                    border: `1px solid ${isActive ? INK : HAIR}`,
                    color: isActive ? NAV_ACTIVE_FG : SUB,
                    fontWeight: isActive ? 600 : 500,
                  }}
                  aria-label={`${s.label} documentation`}
                  aria-pressed={isActive}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* ── Authentication ─────────────────────────────────── */}
            {activeSection === "auth" && (
              <Panel>
                <h2 className="text-lg font-semibold mb-4" style={{ color: INK }}>Authentication</h2>
                <p className="text-sm leading-relaxed" style={{ color: SUB }}>
                  Tyvera uses wallet-based authentication. All authenticated requests require two headers derived from your Bittensor wallet signature.
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: INK }}>Required Headers</h3>
                    <div className="space-y-2">
                      <div
                        className="flex items-start gap-3 p-3 rounded-lg"
                        style={{ background: SOFT, border: `1px solid ${HAIR}` }}
                      >
                        <IC>x-wallet-address</IC>
                        <span className="text-xs" style={{ color: SUB }}>Your SS58-encoded Bittensor wallet address</span>
                      </div>
                      <div
                        className="flex items-start gap-3 p-3 rounded-lg"
                        style={{ background: SOFT, border: `1px solid ${HAIR}` }}
                      >
                        <IC>x-wallet-signature</IC>
                        <span className="text-xs" style={{ color: SUB }}>Signature of the current UTC date string (YYYY-MM-DD) signed with your wallet key</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: INK }}>Example Request</h3>
                    <CodeBlock
                      language="bash"
                      code={`curl -X GET "https://tyvera.ai/api/subnets" \\
  -H "x-wallet-address: 5FHne..." \\
  -H "x-wallet-signature: 0x1a2b3c..."`}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: INK }}>Error Responses</h3>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3 text-xs">
                        <code className="font-mono font-semibold" style={{ color: "var(--aurora-warn)" }}>401</code>
                        <span style={{ color: SUB }}>Missing or invalid wallet headers</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <code className="font-mono font-semibold" style={{ color: "var(--aurora-warn)" }}>403</code>
                        <span style={{ color: SUB }}>Insufficient tier for requested resource</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <code className="font-mono font-semibold" style={{ color: "var(--aurora-warn)" }}>429</code>
                        <span style={{ color: SUB }}>Rate limit exceeded</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>
            )}

            {/* ── Endpoints ──────────────────────────────────────── */}
            {activeSection === "endpoints" && (
              <Panel>
                <h2 className="text-lg font-semibold mb-2" style={{ color: INK }}>API Endpoints</h2>
                <p className="text-sm mb-6" style={{ color: SUB }}>
                  Base URL: <IC>https://tyvera.ai/api</IC>
                </p>

                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: INK }}>
                  <span className="text-base">📊</span> Public Data
                </h3>
                <div className="mb-6">
                  <EndpointRow method="GET" path="/api/subnets" description="List all subnets with yields, emissions, and risk scores" auth={false} />
                  <EndpointRow method="GET" path="/api/subnets?netuid=1" description="Get detailed data for a specific subnet" auth={false} />
                  <EndpointRow method="GET" path="/api/validators" description="List all validators with stake and performance metrics" auth={false} />
                  <EndpointRow method="GET" path="/api/holders" description="Top TAO holders with balance and concentration data" auth={false} />
                  <EndpointRow method="GET" path="/api/tao-rate" description="Current TAO/USD exchange rate" auth={false} />
                  <EndpointRow method="GET" path="/api/tao-price-history" description="Historical TAO price data" auth={false} />
                  <EndpointRow method="GET" path="/api/health" description="System health check — DB, cron status, data freshness" auth={false} />
                </div>

                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: INK }}>
                  <span className="text-base">🔐</span> Authenticated
                </h3>
                <div className="mb-6">
                  <EndpointRow method="GET" path="/api/portfolio" description="Your staking portfolio across subnets" auth tier="Explorer" />
                  <EndpointRow method="GET" path="/api/activity" description="Transaction history for your wallet" auth tier="Explorer" />
                  <EndpointRow method="GET" path="/api/entitlement" description="Your current subscription tier and features" auth />
                  <EndpointRow method="GET" path="/api/metagraph?netuid=1" description="Full metagraph data for a subnet" auth tier="Analyst" />
                  <EndpointRow method="GET" path="/api/recommendations" description="AI-powered subnet allocation recommendations" auth tier="Strategist" />
                </div>

                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: INK }}>
                  <span className="text-base">📤</span> Data Export
                </h3>
                <div className="mb-6">
                  <EndpointRow method="GET" path="/api/export?type=subnets&format=csv" description="Export subnet data as CSV or JSON" auth tier="Analyst" />
                  <EndpointRow method="GET" path="/api/export?type=validators&format=json" description="Export validator data" auth tier="Analyst" />
                  <EndpointRow method="GET" path="/api/export?type=holders&format=csv" description="Export holder data" auth tier="Analyst" />
                  <EndpointRow method="GET" path="/api/export?type=portfolio&format=csv" description="Export your portfolio data" auth tier="Analyst" />
                </div>

                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: INK }}>
                  <span className="text-base">🔔</span> Alerts
                </h3>
                <div className="mb-6">
                  <EndpointRow method="GET" path="/api/alerts?address=...&limit=50" description="Your alert feed" auth />
                  <EndpointRow method="POST" path="/api/alerts" description="Mark all alerts as read" auth />
                  <EndpointRow method="GET" path="/api/alert-rules?address=..." description="List your alert rules" auth />
                  <EndpointRow method="POST" path="/api/alert-rules" description="Create or update an alert rule" auth />
                  <EndpointRow method="DELETE" path="/api/alert-rules" description="Delete an alert rule" auth />
                  <EndpointRow method="PUT" path="/api/alert-rules" description="Initialize default alert rules" auth />
                  <EndpointRow method="GET" path="/api/alert-presets" description="List available alert preset templates" auth={false} />
                  <EndpointRow method="POST" path="/api/alert-presets" description="Apply a preset (creates multiple rules)" auth tier="Strategist" />
                </div>

                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: INK }}>
                  <span className="text-base">👥</span> Team & Webhooks
                </h3>
                <div>
                  <EndpointRow method="GET" path="/api/team" description="List team members" auth tier="Institutional" />
                  <EndpointRow method="POST" path="/api/team" description="Add a team member" auth tier="Institutional" />
                  <EndpointRow method="DELETE" path="/api/team" description="Remove a team member" auth tier="Institutional" />
                  <EndpointRow method="GET" path="/api/webhooks" description="List registered webhooks" auth tier="Institutional" />
                  <EndpointRow method="POST" path="/api/webhooks" description="Register a new webhook" auth tier="Institutional" />
                  <EndpointRow method="DELETE" path="/api/webhooks" description="Delete a webhook" auth tier="Institutional" />
                  <EndpointRow method="GET" path="/api/whitelabel" description="Get whitelabel branding config" auth tier="Institutional" />
                  <EndpointRow method="PUT" path="/api/whitelabel" description="Update whitelabel branding" auth tier="Institutional" />
                </div>
              </Panel>
            )}

            {/* ── Webhooks ───────────────────────────────────────── */}
            {activeSection === "webhooks" && (
              <Panel>
                <h2 className="text-lg font-semibold mb-4" style={{ color: INK }}>Webhook Integration</h2>
                <p className="text-sm leading-relaxed mb-6" style={{ color: SUB }}>
                  Webhooks deliver real-time event notifications to your server via HTTP POST. Each delivery is signed with HMAC-SHA256 for verification. Available on the Institutional tier.
                </p>

                <h3 className="text-sm font-semibold mb-2" style={{ color: INK }}>Payload Format</h3>
                <CodeBlock
                  language="json"
                  code={`{
  "event": "alert.triggered",
  "timestamp": "2026-04-21T14:30:00.000Z",
  "data": {
    "alert_type": "whale_inflow",
    "severity": "high",
    "title": "Large TAO inflow detected",
    "message": "500+ TAO moved into subnet 1",
    "subnet_id": 1,
    "value": 1250.5
  }
}`}
                />

                <h3 className="text-sm font-semibold mt-6 mb-2" style={{ color: INK }}>Signature Verification</h3>
                <p className="text-xs mb-3" style={{ color: SUB }}>
                  Every webhook delivery includes an <IC>x-tyvera-signature</IC> header containing an HMAC-SHA256 signature of the request body, computed with your webhook&apos;s signing secret.
                </p>
                <CodeBlock
                  language="javascript"
                  code={`const crypto = require("crypto");

function verifySignature(body, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}
                />

                <h3 className="text-sm font-semibold mt-6 mb-2" style={{ color: INK }}>Event Types</h3>
                <div className="space-y-1.5">
                  {[
                    { event: "alert.triggered", desc: "An alert rule threshold was exceeded" },
                    { event: "subscription.created", desc: "New subscription activated" },
                    { event: "subscription.expired", desc: "Subscription expired or cancelled" },
                    { event: "team.member_added", desc: "A team member was added" },
                    { event: "team.member_removed", desc: "A team member was removed" },
                  ].map((e) => (
                    <div
                      key={e.event}
                      className="flex items-start gap-3 py-2 last:border-0"
                      style={{ borderBottom: `1px solid ${HAIR}` }}
                    >
                      <IC>{e.event}</IC>
                      <span className="text-xs" style={{ color: SUB }}>{e.desc}</span>
                    </div>
                  ))}
                </div>

                <h3 className="text-sm font-semibold mt-6 mb-2" style={{ color: INK }}>Retry Policy</h3>
                <p className="text-xs leading-relaxed" style={{ color: SUB }}>
                  Failed deliveries (non-2xx response or timeout) increment a failure counter. After 10 consecutive failures, the webhook is automatically paused. You can reactivate it from the Settings page after fixing the receiving endpoint.
                </p>
              </Panel>
            )}

            {/* ── Rate Limits ────────────────────────────────────── */}
            {activeSection === "rate-limits" && (
              <Panel>
                <h2 className="text-lg font-semibold mb-4" style={{ color: INK }}>Rate Limits</h2>
                <p className="text-sm leading-relaxed mb-6" style={{ color: SUB }}>
                  API rate limits are enforced per wallet address on a daily rolling window. Limits reset at midnight UTC. Rate-limited requests receive a <IC>429</IC> status code.
                </p>

                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${HAIR}` }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: SOFT }}>
                        <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: SUB }}>Tier</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: SUB }}>Daily Limit</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: SUB }}>AI Queries</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: SUB }}>Alert Rules</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { tier: "Explorer", limit: "—", ai: "3 / day", alerts: "3" },
                        { tier: "Analyst", limit: "—", ai: "25 / day", alerts: "15" },
                        { tier: "Strategist", limit: "1,000", ai: "Unlimited", alerts: "50" },
                        { tier: "Institutional", limit: "Unlimited", ai: "Unlimited", alerts: "Unlimited" },
                      ].map((row) => (
                        <tr key={row.tier} style={{ borderTop: `1px solid ${HAIR}` }}>
                          <td className="px-4 py-3 font-medium" style={{ color: INK }}>{row.tier}</td>
                          <td className="px-4 py-3 text-right tabular-nums" style={{ color: SUB }}>{row.limit}</td>
                          <td className="px-4 py-3 text-right tabular-nums" style={{ color: SUB }}>{row.ai}</td>
                          <td className="px-4 py-3 text-right tabular-nums" style={{ color: SUB }}>{row.alerts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h3 className="text-sm font-semibold mt-6 mb-2" style={{ color: INK }}>Rate Limit Headers</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: SOFT, border: `1px solid ${HAIR}` }}>
                    <IC>X-RateLimit-Limit</IC>
                    <span className="text-xs" style={{ color: SUB }}>Your daily request quota</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: SOFT, border: `1px solid ${HAIR}` }}>
                    <IC>X-RateLimit-Remaining</IC>
                    <span className="text-xs" style={{ color: SUB }}>Requests remaining in current window</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: SOFT, border: `1px solid ${HAIR}` }}>
                    <IC>X-RateLimit-Reset</IC>
                    <span className="text-xs" style={{ color: SUB }}>UTC timestamp when the limit resets</span>
                  </div>
                </div>
              </Panel>
            )}

            {/* ── Tier Access ────────────────────────────────────── */}
            {activeSection === "tiers" && (
              <Panel>
                <h2 className="text-lg font-semibold mb-4" style={{ color: INK }}>Tier Access Matrix</h2>
                <p className="text-sm leading-relaxed mb-6" style={{ color: SUB }}>
                  Features are unlocked based on your subscription tier. Pay with TAO on the Pricing page.
                </p>

                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${HAIR}` }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: SOFT }}>
                        <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: SUB }}>Feature</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: SUB }}>Explorer</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: SUB }}>Analyst</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: SUB }}>Strategist</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold" style={{ color: SUB }}>Institutional</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { feature: "Subnet analytics", tiers: [true, true, true, true] },
                        { feature: "Full validator data", tiers: [false, true, true, true] },
                        { feature: "Data export (CSV/JSON)", tiers: [false, true, true, true] },
                        { feature: "30-day history", tiers: [false, true, true, true] },
                        { feature: "Full history", tiers: [false, false, true, true] },
                        { feature: "AI intelligence (25/day)", tiers: [false, true, true, true] },
                        { feature: "AI intelligence (unlimited)", tiers: [false, false, true, true] },
                        { feature: "Recommendations", tiers: [false, false, true, true] },
                        { feature: "Alert presets", tiers: [false, false, true, true] },
                        { feature: "API access", tiers: [false, false, true, true] },
                        { feature: "Webhooks", tiers: [false, false, false, true] },
                        { feature: "Team access", tiers: [false, false, false, true] },
                        { feature: "Whitelabel", tiers: [false, false, false, true] },
                        { feature: "Priority support", tiers: [false, false, false, true] },
                      ].map((row) => (
                        <tr key={row.feature} style={{ borderTop: `1px solid ${HAIR}` }}>
                          <td className="px-4 py-2.5 text-xs" style={{ color: INK }}>{row.feature}</td>
                          {row.tiers.map((has, i) => (
                            <td key={i} className="px-3 py-2.5 text-center">
                              {has ? (
                                <CheckCircle className="w-4 h-4 mx-auto" style={{ color: "var(--aurora-up)" }} />
                              ) : (
                                <span style={{ color: "var(--aurora-sub)", opacity: 0.5 }}>—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h3 className="text-sm font-semibold mt-6 mb-2" style={{ color: INK }}>Team Tier Inheritance</h3>
                <p className="text-xs leading-relaxed" style={{ color: SUB }}>
                  Team members inherit their owner&apos;s subscription tier. When a wallet connects that is registered as a team member, the system automatically resolves the owner&apos;s tier for feature access. This means an Institutional subscriber can grant their entire team access without individual subscriptions.
                </p>

                <h3 className="text-sm font-semibold mt-6 mb-2" style={{ color: INK }}>Pricing</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  {[
                    { tier: "Explorer", price: "Free" },
                    { tier: "Analyst", price: "19.99 τ/mo" },
                    { tier: "Strategist", price: "49.99 τ/mo" },
                    { tier: "Institutional", price: "99.99 τ/mo" },
                  ].map((t) => (
                    <div
                      key={t.tier}
                      className="rounded-xl p-3 text-center"
                      style={{ background: SOFT, border: `1px solid ${HAIR}` }}
                    >
                      <div className="text-xs font-semibold" style={{ color: INK }}>{t.tier}</div>
                      <div className="text-sm font-bold mt-1" style={{ color: INK }}>{t.price}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
