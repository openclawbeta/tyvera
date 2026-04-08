"use client";

import { useState, useEffect } from "react";
import {
  Code2,
  Key,
  Copy,
  Check,
  Plus,
  Trash2,
  Shield,
  Zap,
  ArrowRight,
  Lock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet-context";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

/* ─────────────────────────────────────────────────────────────────── */
/* Developer Portal — API docs, key management, rate limits            */
/* ─────────────────────────────────────────────────────────────────── */

interface ApiKeyDisplay {
  id: number;
  prefix: string;
  label: string;
  tier: string;
  status: string;
  requests_today: number;
  created_at: string;
}

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/subnets",
    description: "All subnet metrics (emissions, yield, liquidity, risk, flows)",
    params: "?netuid=N (optional, single subnet)",
    tier: "Strategist",
    example: `curl -H "Authorization: Bearer tyv_your_key" \\
  https://tyvera.ai/api/subnets`,
  },
  {
    method: "GET",
    path: "/api/subnets?netuid=1",
    description: "Single subnet detail with full metrics",
    params: "netuid (required)",
    tier: "Strategist",
    example: `curl -H "Authorization: Bearer tyv_your_key" \\
  https://tyvera.ai/api/subnets?netuid=1`,
  },
  {
    method: "GET",
    path: "/api/metagraph",
    description: "Validator and miner neuron data for a subnet",
    params: "?netuid=N (required)",
    tier: "Strategist",
    example: `curl -H "Authorization: Bearer tyv_your_key" \\
  https://tyvera.ai/api/metagraph?netuid=1`,
  },
  {
    method: "GET",
    path: "/api/tao-rate",
    description: "Current TAO/USD price with 24h/7d/30d changes",
    params: "None",
    tier: "Strategist",
    example: `curl -H "Authorization: Bearer tyv_your_key" \\
  https://tyvera.ai/api/tao-rate`,
  },
  {
    method: "GET",
    path: "/api/tao-price-history",
    description: "Historical TAO price data (up to 365 days)",
    params: "?days=30 (default 30, max 365)",
    tier: "Strategist",
    example: `curl -H "Authorization: Bearer tyv_your_key" \\
  "https://tyvera.ai/api/tao-price-history?days=90"`,
  },
  {
    method: "GET",
    path: "/api/entitlement",
    description: "Check subscription tier for a wallet address",
    params: "?address=5Grw... (required)",
    tier: "Strategist",
    example: `curl -H "Authorization: Bearer tyv_your_key" \\
  "https://tyvera.ai/api/entitlement?address=5Grw..."`,
  },
];

const RATE_LIMITS = [
  { tier: "Explorer", limit: "No API access", color: "text-slate-400" },
  { tier: "Analyst", limit: "No API access", color: "text-cyan-400" },
  { tier: "Strategist", limit: "1,000 requests/day", color: "text-emerald-400" },
  { tier: "Institutional", limit: "Unlimited", color: "text-amber-400" },
];

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre
        className="text-xs font-mono text-slate-300 p-4 rounded-lg overflow-x-auto leading-relaxed"
        style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-700/50 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export default function DevelopersPage() {
  const { address: walletAddress } = useWallet();
  const [keys, setKeys] = useState<ApiKeyDisplay[]>([]);
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [keyLabel, setKeyLabel] = useState("");
  const [activeEndpoint, setActiveEndpoint] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const walletConnected = !!walletAddress;

  // Fetch existing keys when wallet connects
  useEffect(() => {
    if (!walletAddress) {
      setKeys([]);
      return;
    }

    const fetchKeys = async () => {
      setLoadingKeys(true);
      try {
        const response = await fetchWithTimeout(
          `/api/keys?address=${encodeURIComponent(walletAddress)}`,
          { method: "GET", timeoutMs: 8000 }
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch keys: ${response.statusText}`);
        }
        const data = await response.json();
        setKeys(data.keys || []);
      } catch (error) {
        console.error("Error fetching keys:", error);
        setKeys([]);
      } finally {
        setLoadingKeys(false);
      }
    };

    fetchKeys();
  }, [walletAddress]);

  const handleCreateKey = async () => {
    if (!walletAddress || !keyLabel.trim()) {
      return;
    }

    setCreating(true);
    setErrorMessage(null);
    try {
      const response = await fetchWithTimeout(
        "/api/keys",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletAddress,
            label: keyLabel.trim(),
          }),
          timeoutMs: 8000,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setErrorMessage(data.error || "Your tier does not support API keys. Upgrade to Strategist or above.");
        } else {
          setErrorMessage(data.error || "Failed to create key");
        }
        return;
      }

      // Show the revealed key
      setNewKeyRevealed(data.key);
      setKeyLabel("");

      // Refresh keys list
      const keysResponse = await fetchWithTimeout(
        `/api/keys?address=${encodeURIComponent(walletAddress)}`,
        { method: "GET", timeoutMs: 8000 }
      );
      if (keysResponse.ok) {
        const keysData = await keysResponse.json();
        setKeys(keysData.keys || []);
      }
    } catch (error) {
      console.error("Error creating key:", error);
      setErrorMessage("Failed to create key. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: number) => {
    if (!walletAddress) {
      return;
    }

    setRevoking(keyId);
    try {
      const response = await fetchWithTimeout(
        "/api/keys",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletAddress,
            id: keyId,
          }),
          timeoutMs: 8000,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        setErrorMessage(data.error || "Failed to revoke key");
        return;
      }

      // Remove key from state
      setKeys(keys.filter((k) => k.id !== keyId));
      setErrorMessage(null);
    } catch (error) {
      console.error("Error revoking key:", error);
      setErrorMessage("Failed to revoke key. Please try again.");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      <PageHeader
        title="Developer API"
        subtitle="Programmatic access to Bittensor subnet analytics"
      />

      {/* Quick Start */}
      <FadeIn>
        <GlassCard padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)" }}
            >
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Quick Start</h2>
              <p className="text-xs text-slate-500">Get data in 30 seconds</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-400">
                <span className="text-white font-medium">1.</span> Get an API key from the{" "}
                <a href="/pricing" className="text-cyan-400 hover:underline">Pricing page</a>{" "}
                (Strategist tier or above).
              </p>
              <p className="text-sm text-slate-400">
                <span className="text-white font-medium">2.</span> Include your key in the Authorization header:
              </p>
            </div>

            <CodeBlock
              code={`curl -H "Authorization: Bearer tyv_your_api_key" \\
  https://tyvera.ai/api/subnets`}
            />

            <p className="text-sm text-slate-400">
              <span className="text-white font-medium">3.</span> Parse the JSON response — each subnet includes emissions, yield, liquidity, risk level, flows, and more.
            </p>
          </div>
        </GlassCard>
      </FadeIn>

      {/* API Key Management */}
      <FadeIn delay={100}>
        <GlassCard padding="lg">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}
              >
                <Key className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Your API Keys</h2>
                <p className="text-xs text-slate-500">Manage keys for programmatic access</p>
              </div>
            </div>
          </div>

          {!walletConnected ? (
            <div
              className="rounded-xl p-8 text-center"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Lock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400 mb-1">Connect your wallet to manage API keys</p>
              <p className="text-xs text-slate-600">Requires Strategist tier or above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Error message */}
              {errorMessage && (
                <div
                  className="rounded-lg p-3"
                  style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}
                >
                  <p className="text-sm text-red-400">{errorMessage}</p>
                </div>
              )}

              {/* Key creation form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Key label (e.g., production-bot)"
                  value={keyLabel}
                  onChange={(e) => setKeyLabel(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm bg-slate-900/40 border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
                />
                <button
                  onClick={handleCreateKey}
                  disabled={creating || loadingKeys}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {creating ? "Creating..." : "Generate Key"}
                </button>
              </div>

              {/* Revealed key warning */}
              {newKeyRevealed && (
                <div
                  className="rounded-lg p-4 space-y-2"
                  style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}
                >
                  <p className="text-xs font-semibold text-amber-300">
                    Save this key now — it won&apos;t be shown again
                  </p>
                  <CodeBlock code={newKeyRevealed} />
                  <button
                    onClick={() => setNewKeyRevealed(null)}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Loading state */}
              {loadingKeys && (
                <p className="text-sm text-slate-500 py-4 text-center">Loading keys...</p>
              )}

              {/* Existing keys */}
              {!loadingKeys && keys.length === 0 && !newKeyRevealed && (
                <p className="text-sm text-slate-500 py-4 text-center">No API keys yet</p>
              )}

              {/* Keys list */}
              {!loadingKeys && keys.length > 0 && (
                <div className="space-y-2 mt-4">
                  {keys.map((key) => (
                    <div
                      key={key.id}
                      className="rounded-lg p-3 flex items-center justify-between"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono text-emerald-300 truncate">{key.prefix}</code>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 whitespace-nowrap">
                            {key.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-1">{key.label}</p>
                        <p className="text-xs text-slate-600">
                          {key.requests_today} requests today • Created {new Date(key.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        disabled={revoking === key.id}
                        className="ml-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        {revoking === key.id ? "Revoking..." : "Revoke"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </FadeIn>

      {/* Rate Limits */}
      <FadeIn delay={150}>
        <GlassCard padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}
            >
              <Shield className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Rate Limits</h2>
              <p className="text-xs text-slate-500">Requests per day by tier</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {RATE_LIMITS.map((rl) => (
              <div
                key={rl.tier}
                className="rounded-xl p-4 text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className={cn("text-xs font-semibold mb-1", rl.color)}>{rl.tier}</div>
                <div className="text-sm text-white font-medium">{rl.limit}</div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-600 mt-3">
            Rate limits reset daily at midnight UTC. Exceeded limits return HTTP 429.
            Response headers include <code className="text-slate-400">X-RateLimit-Remaining</code> and <code className="text-slate-400">X-RateLimit-Reset</code>.
          </p>
        </GlassCard>
      </FadeIn>

      {/* Endpoints */}
      <FadeIn delay={200}>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Endpoints</h2>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
            {/* Endpoint list */}
            <div className="space-y-1">
              {ENDPOINTS.map((ep, i) => (
                <button
                  key={i}
                  onClick={() => setActiveEndpoint(i)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm",
                    activeEndpoint === i
                      ? "bg-white/[0.06] text-white border border-white/[0.08]"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block w-10 text-[10px] font-bold mr-2",
                      ep.method === "GET" ? "text-emerald-400" : "text-amber-400"
                    )}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs">{ep.path.split("?")[0]}</span>
                </button>
              ))}
            </div>

            {/* Endpoint detail */}
            <GlassCard padding="lg">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                      {ENDPOINTS[activeEndpoint].method}
                    </span>
                    <code className="text-sm text-white font-mono">
                      {ENDPOINTS[activeEndpoint].path}
                    </code>
                  </div>
                  <p className="text-sm text-slate-400">{ENDPOINTS[activeEndpoint].description}</p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Parameters</h4>
                  <p className="text-sm text-slate-300">{ENDPOINTS[activeEndpoint].params}</p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Minimum Tier</h4>
                  <span className="text-xs font-medium text-emerald-300 bg-emerald-400/10 px-2 py-0.5 rounded">
                    {ENDPOINTS[activeEndpoint].tier}+
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Example</h4>
                  <CodeBlock code={ENDPOINTS[activeEndpoint].example} />
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </FadeIn>

      {/* Authentication */}
      <FadeIn delay={250}>
        <GlassCard padding="lg">
          <h2 className="text-base font-semibold text-white mb-4">Authentication</h2>
          <div className="space-y-4 text-sm text-slate-400">
            <p>
              All API requests require a Bearer token in the <code className="text-cyan-300 bg-cyan-400/10 px-1.5 py-0.5 rounded text-xs">Authorization</code> header.
            </p>
            <CodeBlock code={`Authorization: Bearer tyv_your_api_key_here`} />
            <p>
              Requests without a valid key return <code className="text-slate-300">401 Unauthorized</code>.
              Requests exceeding the rate limit return <code className="text-slate-300">429 Too Many Requests</code> with a <code className="text-slate-300">Retry-After</code> header.
            </p>
          </div>
        </GlassCard>
      </FadeIn>

      {/* Response Format */}
      <FadeIn delay={300}>
        <GlassCard padding="lg">
          <h2 className="text-base font-semibold text-white mb-4">Response Format</h2>
          <p className="text-sm text-slate-400 mb-4">All responses are JSON. Successful responses return HTTP 200 with the data payload. Errors return the appropriate status code with an error message.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-emerald-400 mb-2">Success (200)</h4>
              <CodeBlock
                code={`{
  "subnets": [
    {
      "netuid": 1,
      "name": "Apex",
      "emissions": 0.0234,
      "yield": 12.5,
      "liquidity": 45000,
      "risk": "LOW",
      ...
    }
  ]
}`}
                language="json"
              />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-red-400 mb-2">Error (401/429)</h4>
              <CodeBlock
                code={`{
  "error": "Rate limit exceeded",
  "rate_limit": 1000,
  "requests_today": 1001,
  "retry_after": 43200
}`}
                language="json"
              />
            </div>
          </div>
        </GlassCard>
      </FadeIn>

      {/* CTA */}
      <FadeIn delay={350}>
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.12)" }}
        >
          <h3 className="text-base font-semibold text-white mb-2">Ready to build?</h3>
          <p className="text-sm text-slate-400 mb-4">
            Get API access with a Strategist subscription — 1,000 requests/day for $49.99/mo.
          </p>
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 transition-all"
          >
            View Pricing
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </FadeIn>
    </div>
  );
}
