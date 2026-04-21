"use client";

import { useState } from "react";
import {
  Code2,
  Key,
  Zap,
  Webhook,
  Shield,
  Clock,
  ChevronRight,
  Copy,
  CheckCircle,
  ExternalLink,
  Lock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";

/* ── Section nav ─────────────────────────────────────────────────── */
const SECTIONS = [
  { id: "auth", label: "Authentication", icon: Key },
  { id: "endpoints", label: "Endpoints", icon: Zap },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "rate-limits", label: "Rate Limits", icon: Clock },
  { id: "tiers", label: "Tier Access", icon: Shield },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/* ── Code block component ────────────────────────────────────────── */
function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-xl border border-white/8 bg-[#0a0d14] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/6">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{language}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 rounded px-1.5 py-0.5"
          aria-label="Copy code"
        >
          {copied ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono text-slate-300">
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
  const methodColor =
    method === "GET" ? "#34d399" :
    method === "POST" ? "#60a5fa" :
    method === "PUT" ? "#fbbf24" :
    "#f87171";

  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <span
        className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-bold font-mono min-w-[52px]"
        style={{ background: `${methodColor}18`, color: methodColor }}
      >
        {method}
      </span>
      <div className="flex-1 min-w-0">
        <code className="text-sm text-white font-mono">{path}</code>
        <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>{description}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {auth && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: "rgba(34,211,238,0.1)", color: "#22d3ee" }}>
            <Lock className="w-2.5 h-2.5" />
            Auth
          </span>
        )}
        {tier && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa" }}>
            {tier}+
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function DevelopersPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("auth");

  return (
    <div className="min-h-screen w-full" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a1f35 100%)" }}>
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
                  className="flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-all lg:w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                  style={{
                    background: isActive ? "rgba(34,211,238,0.08)" : "rgba(255,255,255,0.02)",
                    border: isActive ? "1px solid rgba(34,211,238,0.18)" : "1px solid rgba(255,255,255,0.06)",
                    color: isActive ? "#a5f3fc" : "#64748b",
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
              <>
                <GlassCard padding="lg">
                  <h2 className="text-lg font-semibold text-white mb-4">Authentication</h2>
                  <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
                    Tyvera uses wallet-based authentication. All authenticated requests require two headers derived from your Bittensor wallet signature.
                  </p>

                  <div className="mt-6 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2">Required Headers</h3>
                      <div className="space-y-2">
                        <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                          <code className="text-xs font-mono text-cyan-300 flex-shrink-0">x-wallet-address</code>
                          <span className="text-xs" style={{ color: "#94a3b8" }}>Your SS58-encoded Bittensor wallet address</span>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                          <code className="text-xs font-mono text-cyan-300 flex-shrink-0">x-wallet-signature</code>
                          <span className="text-xs" style={{ color: "#94a3b8" }}>Signature of the current UTC date string (YYYY-MM-DD) signed with your wallet key</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2">Example Request</h3>
                      <CodeBlock
                        language="bash"
                        code={`curl -X GET "https://tyvera.ai/api/subnets" \\
  -H "x-wallet-address: 5FHne..." \\
  -H "x-wallet-signature: 0x1a2b3c..."`}
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2">Error Responses</h3>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3 text-xs">
                          <code className="font-mono text-amber-300">401</code>
                          <span style={{ color: "#94a3b8" }}>Missing or invalid wallet headers</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <code className="font-mono text-amber-300">403</code>
                          <span style={{ color: "#94a3b8" }}>Insufficient tier for requested resource</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <code className="font-mono text-amber-300">429</code>
                          <span style={{ color: "#94a3b8" }}>Rate limit exceeded</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </>
            )}

            {/* ── Endpoints ──────────────────────────────────────── */}
            {activeSection === "endpoints" && (
              <>
                <GlassCard padding="lg">
                  <h2 className="text-lg font-semibold text-white mb-2">API Endpoints</h2>
                  <p className="text-sm mb-6" style={{ color: "#94a3b8" }}>
                    Base URL: <code className="text-cyan-300 font-mono">https://tyvera.ai/api</code>
                  </p>

                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
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

                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="text-base">🔐</span> Authenticated
                  </h3>
                  <div className="mb-6">
                    <EndpointRow method="GET" path="/api/portfolio" description="Your staking portfolio across subnets" auth tier="Explorer" />
                    <EndpointRow method="GET" path="/api/activity" description="Transaction history for your wallet" auth tier="Explorer" />
                    <EndpointRow method="GET" path="/api/entitlement" description="Your current subscription tier and features" auth />
                    <EndpointRow method="GET" path="/api/metagraph?netuid=1" description="Full metagraph data for a subnet" auth tier="Analyst" />
                    <EndpointRow method="GET" path="/api/recommendations" description="AI-powered subnet allocation recommendations" auth tier="Strategist" />
                  </div>

                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="text-base">📤</span> Data Export
                  </h3>
                  <div className="mb-6">
                    <EndpointRow method="GET" path="/api/export?type=subnets&format=csv" description="Export subnet data as CSV or JSON" auth tier="Analyst" />
                    <EndpointRow method="GET" path="/api/export?type=validators&format=json" description="Export validator data" auth tier="Analyst" />
                    <EndpointRow method="GET" path="/api/export?type=holders&format=csv" description="Export holder data" auth tier="Analyst" />
                    <EndpointRow method="GET" path="/api/export?type=portfolio&format=csv" description="Export your portfolio data" auth tier="Analyst" />
                  </div>

                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
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

                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
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
                </GlassCard>
              </>
            )}

            {/* ── Webhooks ───────────────────────────────────────── */}
            {activeSection === "webhooks" && (
              <>
                <GlassCard padding="lg">
                  <h2 className="text-lg font-semibold text-white mb-4">Webhook Integration</h2>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: "#94a3b8" }}>
                    Webhooks deliver real-time event notifications to your server via HTTP POST. Each delivery is signed with HMAC-SHA256 for verification. Available on the Institutional tier.
                  </p>

                  <h3 className="text-sm font-semibold text-white mb-2">Payload Format</h3>
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

                  <h3 className="text-sm font-semibold text-white mt-6 mb-2">Signature Verification</h3>
                  <p className="text-xs mb-3" style={{ color: "#94a3b8" }}>
                    Every webhook delivery includes an <code className="text-cyan-300 font-mono">x-tyvera-signature</code> header containing an HMAC-SHA256 signature of the request body, computed with your webhook&apos;s signing secret.
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

                  <h3 className="text-sm font-semibold text-white mt-6 mb-2">Event Types</h3>
                  <div className="space-y-1.5">
                    {[
                      { event: "alert.triggered", desc: "An alert rule threshold was exceeded" },
                      { event: "subscription.created", desc: "New subscription activated" },
                      { event: "subscription.expired", desc: "Subscription expired or cancelled" },
                      { event: "team.member_added", desc: "A team member was added" },
                      { event: "team.member_removed", desc: "A team member was removed" },
                    ].map((e) => (
                      <div key={e.event} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                        <code className="text-xs font-mono text-cyan-300 flex-shrink-0">{e.event}</code>
                        <span className="text-xs" style={{ color: "#94a3b8" }}>{e.desc}</span>
                      </div>
                    ))}
                  </div>

                  <h3 className="text-sm font-semibold text-white mt-6 mb-2">Retry Policy</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>
                    Failed deliveries (non-2xx response or timeout) increment a failure counter. After 10 consecutive failures, the webhook is automatically paused. You can reactivate it from the Settings page after fixing the receiving endpoint.
                  </p>
                </GlassCard>
              </>
            )}

            {/* ── Rate Limits ────────────────────────────────────── */}
            {activeSection === "rate-limits" && (
              <>
                <GlassCard padding="lg">
                  <h2 className="text-lg font-semibold text-white mb-4">Rate Limits</h2>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: "#94a3b8" }}>
                    API rate limits are enforced per wallet address on a daily rolling window. Limits reset at midnight UTC. Rate-limited requests receive a <code className="text-amber-300 font-mono">429</code> status code.
                  </p>

                  <div className="rounded-xl border border-white/8 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Tier</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400">Daily Limit</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400">AI Queries</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400">Alert Rules</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { tier: "Explorer", limit: "—", ai: "3 / day", alerts: "3" },
                          { tier: "Analyst", limit: "—", ai: "25 / day", alerts: "15" },
                          { tier: "Strategist", limit: "1,000", ai: "Unlimited", alerts: "50" },
                          { tier: "Institutional", limit: "Unlimited", ai: "Unlimited", alerts: "Unlimited" },
                        ].map((row) => (
                          <tr key={row.tier} className="border-t border-white/5">
                            <td className="px-4 py-3 font-medium text-white">{row.tier}</td>
                            <td className="px-4 py-3 text-right tabular-nums" style={{ color: "#94a3b8" }}>{row.limit}</td>
                            <td className="px-4 py-3 text-right tabular-nums" style={{ color: "#94a3b8" }}>{row.ai}</td>
                            <td className="px-4 py-3 text-right tabular-nums" style={{ color: "#94a3b8" }}>{row.alerts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h3 className="text-sm font-semibold text-white mt-6 mb-2">Rate Limit Headers</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <code className="text-xs font-mono text-cyan-300 flex-shrink-0">X-RateLimit-Limit</code>
                      <span className="text-xs" style={{ color: "#94a3b8" }}>Your daily request quota</span>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <code className="text-xs font-mono text-cyan-300 flex-shrink-0">X-RateLimit-Remaining</code>
                      <span className="text-xs" style={{ color: "#94a3b8" }}>Requests remaining in current window</span>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <code className="text-xs font-mono text-cyan-300 flex-shrink-0">X-RateLimit-Reset</code>
                      <span className="text-xs" style={{ color: "#94a3b8" }}>UTC timestamp when the limit resets</span>
                    </div>
                  </div>
                </GlassCard>
              </>
            )}

            {/* ── Tier Access ────────────────────────────────────── */}
            {activeSection === "tiers" && (
              <>
                <GlassCard padding="lg">
                  <h2 className="text-lg font-semibold text-white mb-4">Tier Access Matrix</h2>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: "#94a3b8" }}>
                    Features are unlocked based on your subscription tier. Pay with TAO on the Pricing page.
                  </p>

                  <div className="rounded-xl border border-white/8 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Feature</th>
                          <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400">Explorer</th>
                          <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400">Analyst</th>
                          <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400">Strategist</th>
                          <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400">Institutional</th>
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
                          <tr key={row.feature} className="border-t border-white/5">
                            <td className="px-4 py-2.5 text-xs text-white">{row.feature}</td>
                            {row.tiers.map((has, i) => (
                              <td key={i} className="px-3 py-2.5 text-center">
                                {has ? (
                                  <CheckCircle className="w-4 h-4 mx-auto text-emerald-400" />
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h3 className="text-sm font-semibold text-white mt-6 mb-2">Team Tier Inheritance</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>
                    Team members inherit their owner&apos;s subscription tier. When a wallet connects that is registered as a team member, the system automatically resolves the owner&apos;s tier for feature access. This means an Institutional subscriber can grant their entire team access without individual subscriptions.
                  </p>

                  <h3 className="text-sm font-semibold text-white mt-6 mb-2">Pricing</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    {[
                      { tier: "Explorer", price: "Free" },
                      { tier: "Analyst", price: "19.99 τ/mo" },
                      { tier: "Strategist", price: "49.99 τ/mo" },
                      { tier: "Institutional", price: "99.99 τ/mo" },
                    ].map((t) => (
                      <div key={t.tier} className="rounded-xl border border-white/8 p-3 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <div className="text-xs font-semibold text-white">{t.tier}</div>
                        <div className="text-sm font-bold mt-1" style={{ color: "#22d3ee" }}>{t.price}</div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
