"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  Shield,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  LogOut,
  Bell,
  Lock,
  Eye,
  ChevronRight,
  Loader2,
  Globe,
  Info,
  ToggleLeft,
  ToggleRight,
  User,
  Lightbulb,
  Save,
  Layers3,
  SlidersHorizontal,
  Sparkles,
  Clock3,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { useWallet } from "@/lib/wallet-context";
import { useEntitlement } from "@/lib/hooks/use-entitlement";
import { truncateAddress } from "@/lib/utils";
import { cn } from "@/lib/utils";

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("rounded-[24px] border border-white/8 bg-white/[0.022] p-5 shadow-[0_16px_56px_rgba(0,0,0,0.26)]", className)}
    >
      {children}
    </div>
  );
}

function PanelHeader({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  return (
    <div className="mb-5 border-b border-white/6 pb-4">
      {eyebrow && <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</div>}
      <h2 className="mt-2 text-sm font-semibold tracking-tight text-white">{title}</h2>
      {subtitle && <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{subtitle}</p>}
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
  last = false,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-6 py-4"
      style={last ? undefined : { borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold tracking-tight text-white">{label}</p>
        {description && <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!enabled)} className="transition-colors duration-200">
      {enabled ? (
        <ToggleRight className="h-8 w-8 text-cyan-400" />
      ) : (
        <ToggleLeft className="h-8 w-8 text-slate-700" />
      )}
    </button>
  );
}

function SystemEnforced() {
  return (
    <span
      className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
      style={{
        background: "rgba(52,211,153,0.1)",
        border: "1px solid rgba(52,211,153,0.22)",
        color: "#34d399",
      }}
    >
      Always on
    </span>
  );
}

const SECTIONS = [
  { id: "account", label: "Account", icon: User },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "guardrails", label: "Guardrails", icon: SlidersHorizontal },
  { id: "security", label: "Security", icon: Shield },
] as const;

function WalletSection() {
  const { walletState, address, openModal, disconnect, verify } = useWallet();
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const isConnected = walletState !== "disconnected" && walletState !== "connecting";
  const isVerified = walletState === "verified" || walletState === "pending_approval";

  return (
    <Panel>
      <PanelHeader
        eyebrow="Wallet control"
        title="Wallet connection and approval model"
        subtitle="Tyvera reads state, prepares workflows, and asks for approval. It does not take custody of keys or execute silently."
      />

      {walletState === "disconnected" && (
        <>
          <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(160deg,rgba(34,211,238,0.06),rgba(255,255,255,0.018))] p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                  <Wallet className="h-3 w-3" />
                  disconnected state
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">No wallet connected yet.</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Connect a Polkadot-compatible wallet when you want Tyvera to move from research-only mode into verification and execution-review workflows.
                </p>
              </div>

              <button
                onClick={openModal}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                  color: "#04060d",
                  boxShadow:
                    "0 0 0 1px rgba(34,211,238,0.4), 0 4px 16px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                <Wallet className="h-4 w-4" />
                Connect wallet
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              { icon: Shield, text: "Wallet stays under your control" },
              { icon: Lock, text: "No seed phrase or private key storage" },
              { icon: CheckCircle, text: "Every on-chain action requires explicit approval" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.035] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/10">
                    <Icon className="h-4 w-4 text-emerald-300" />
                  </div>
                  <div className="text-sm leading-relaxed text-slate-400">{text}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {walletState === "connecting" && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-5">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-400">Connecting to wallet extension…</p>
        </div>
      )}

      {isConnected && address && (
        <>
          <div
            className="rounded-[22px] p-5"
            style={{
              background: isVerified
                ? "linear-gradient(160deg, rgba(34,211,238,0.06), rgba(255,255,255,0.018))"
                : "linear-gradient(160deg, rgba(251,191,36,0.07), rgba(255,255,255,0.018))",
              border: isVerified ? "1px solid rgba(34,211,238,0.18)" : "1px solid rgba(251,191,36,0.18)",
            }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tracking-tight" style={{ color: isVerified ? "#67e8f9" : "#fbbf24" }}>
                    {isVerified ? "Verified wallet" : "Verification still required"}
                  </span>
                  <span className="rounded-md border border-white/8 bg-black/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Polkadot.js
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <code className="rounded-md border border-white/8 bg-black/20 px-2 py-1 font-mono text-slate-300">
                    {truncateAddress(address)}
                  </code>
                  <button onClick={copyAddress} className="text-slate-500 transition-colors hover:text-slate-300">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button className="text-slate-500 transition-colors hover:text-slate-300">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  {copied && <span className="text-cyan-300">Copied</span>}
                </div>
              </div>

              {!isVerified && walletState === "connected" ? (
                <button
                  onClick={verify}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-2.5 text-xs font-semibold text-amber-300 transition-all hover:bg-amber-400/15"
                >
                  <Shield className="h-3.5 w-3.5" />
                  Verify now
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-xs font-semibold text-cyan-300">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Ready for approval workflows
                </div>
              )}
            </div>
          </div>

          {!isVerified && walletState === "connected" && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/16 bg-amber-400/[0.04] p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div>
                <p className="text-sm font-semibold tracking-tight text-amber-200">Verification is needed before execution-like flows.</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  The message-sign step is ownership verification only. It does not move TAO and does not grant custody.
                </p>
              </div>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.018] px-4">
            <SettingRow label="Connected extension">
              <span className="text-xs font-medium text-slate-300">Polkadot.js</span>
            </SettingRow>
            <SettingRow label="Network" description="Bittensor mainnet (Finney)">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Globe className="h-3.5 w-3.5 text-slate-600" />
                mainnet
              </div>
            </SettingRow>
            <SettingRow label="Signing scope" description="Permissions are requested per action, not as a hidden blanket approval.">
              <span className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                per-action
              </span>
            </SettingRow>
            <SettingRow label="Transaction log" description="Operational activity remains visible for accountability." last>
              <SystemEnforced />
            </SettingRow>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              "Your wallet and keys remain on your device.",
              "Tyvera stores no private keys and no seed phrases.",
              "Every on-chain action requires explicit review and approval.",
              "You can disconnect at any time without affecting custody.",
            ].map((text) => (
              <div key={text} className="rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-slate-400">
                {text}
              </div>
            ))}
          </div>

          <button
            onClick={disconnect}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/8 px-4 py-2.5 text-sm font-medium text-slate-400 transition-all hover:border-rose-400/20 hover:bg-rose-400/[0.05] hover:text-rose-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            Disconnect wallet
          </button>
        </>
      )}
    </Panel>
  );
}

function AccountSection() {
  const { address } = useWallet();
  const { tier } = useEntitlement(address);
  const displayTier = tier ? tier.toUpperCase() : "EXPLORER";
  const truncated = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected";

  const tierStyles: Record<string, { bg: string; border: string; color: string }> = {
    EXPLORER: { bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.25)", color: "#94a3b8" },
    ANALYST: { bg: "rgba(34,211,238,0.1)", border: "rgba(34,211,238,0.25)", color: "#22d3ee" },
    STRATEGIST: { bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.25)", color: "#8b5cf6" },
    INSTITUTIONAL: { bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)", color: "#fbbf24" },
  };

  const style = tierStyles[displayTier] || tierStyles.EXPLORER;

  return (
    <div className="space-y-5">
      <Panel className="overflow-hidden bg-[linear-gradient(160deg,rgba(79,124,255,0.05),rgba(255,255,255,0.018))]">
        <div className="pointer-events-none absolute" />
        <PanelHeader
          eyebrow="Account overview"
          title="Your operator profile"
          subtitle="This is where plan state, wallet identity, and account-level preferences start to come together."
        />

        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: "Plan", value: displayTier, note: "Current access layer", tone: style.color },
            { label: "Wallet", value: address ? "Connected" : "Not connected", note: "Execution identity", tone: address ? "#67e8f9" : "#fbbf24" },
            { label: "Mode", value: "Source-aware", note: "Trust-first product state", tone: "#34d399" },
            { label: "Profile", value: "Operator", note: "Individual workflow", tone: "#c4b5fd" },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</div>
              <div className="mt-2 text-base font-semibold tracking-tight" style={{ color: card.tone }}>
                {card.value}
              </div>
              <div className="mt-1 text-xs text-slate-500">{card.note}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          eyebrow="Preferences"
          title="Profile and plan settings"
          subtitle="Small account preferences now, broader account-control workflows later."
        />

        <div className="rounded-2xl border border-white/8 bg-white/[0.018] px-4">
          <SettingRow label="Wallet address">
            <span className="font-mono text-xs text-slate-300">{truncated}</span>
          </SettingRow>
          <SettingRow label="Timezone">
            <select
              className="rounded-lg border border-white/8 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option>UTC+0</option>
              <option>UTC-5 (Eastern)</option>
              <option>UTC-8 (Pacific)</option>
            </select>
          </SettingRow>
          <SettingRow label="Current plan" last>
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.color }}
              >
                {displayTier}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-700" />
            </div>
          </SettingRow>
        </div>
      </Panel>
    </div>
  );
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    newRecs: true,
    yieldAlerts: true,
    txConfirmed: true,
    premiumExpiry: true,
    weeklyDigest: false,
    systemUpdates: true,
  });

  function toggle(key: keyof typeof prefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  const rows = [
    { key: "newRecs", label: "New recommendation", desc: "Notify when the engine finds a new opportunity for your portfolio." },
    { key: "yieldAlerts", label: "Yield change alerts", desc: "Alert when a subnet's estimated APR changes by more than 5%." },
    { key: "txConfirmed", label: "Transaction confirmed", desc: "Notify when an on-chain action reaches finality." },
    { key: "premiumExpiry", label: "Premium expiring soon", desc: "Warn ahead of plan expiry when paid access is active." },
    { key: "weeklyDigest", label: "Weekly digest", desc: "Receive a weekly summary of your portfolio and market posture." },
    { key: "systemUpdates", label: "System updates", desc: "Important platform changes, maintenance windows, and trust notices." },
  ] as const;

  return (
    <Panel>
      <PanelHeader
        eyebrow="Notification control"
        title="Alert and digest preferences"
        subtitle="Tune signal flow so Tyvera feels useful, not noisy."
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {[
          { label: "Recommendation signal", value: prefs.newRecs ? "On" : "Off", icon: Sparkles },
          { label: "Yield alerts", value: prefs.yieldAlerts ? "On" : "Off", icon: Bell },
          { label: "Weekly digest", value: prefs.weeklyDigest ? "On" : "Off", icon: Clock3 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
            <div className="mt-2 text-base font-semibold tracking-tight text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.018] px-4">
        {rows.map(({ key, label, desc }, i) => (
          <SettingRow key={key} label={label} description={desc} last={i === rows.length - 1}>
            <Toggle enabled={prefs[key]} onChange={() => toggle(key)} />
          </SettingRow>
        ))}
      </div>
    </Panel>
  );
}

function GuardrailsSection() {
  const [blockSpeculative, setBlockSpeculative] = useState(false);
  const [enableRecs, setEnableRecs] = useState(true);
  const [minScoreThreshold, setMinScoreThreshold] = useState("0.15");
  const [maxMoveSize, setMaxMoveSize] = useState("25%");
  const [cooldownPeriod, setCooldownPeriod] = useState("24 hours");
  const [savedState, setSavedState] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("tyvera.guardrails");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        blockSpeculative?: boolean;
        enableRecs?: boolean;
        minScoreThreshold?: string;
        maxMoveSize?: string;
        cooldownPeriod?: string;
      };
      if (typeof parsed.blockSpeculative === "boolean") setBlockSpeculative(parsed.blockSpeculative);
      if (typeof parsed.enableRecs === "boolean") setEnableRecs(parsed.enableRecs);
      if (typeof parsed.minScoreThreshold === "string") setMinScoreThreshold(parsed.minScoreThreshold);
      if (typeof parsed.maxMoveSize === "string") setMaxMoveSize(parsed.maxMoveSize);
      if (typeof parsed.cooldownPeriod === "string") setCooldownPeriod(parsed.cooldownPeriod);
    } catch {
      // ignore malformed local state
    }
  }, []);

  function saveGuardrails() {
    try {
      window.localStorage.setItem(
        "tyvera.guardrails",
        JSON.stringify({
          blockSpeculative,
          enableRecs,
          minScoreThreshold,
          maxMoveSize,
          cooldownPeriod,
          savedAt: new Date().toISOString(),
        }),
      );
      setSavedState("saved");
      window.setTimeout(() => setSavedState("idle"), 1800);
    } catch {
      setSavedState("idle");
    }
  }

  return (
    <Panel>
      <PanelHeader
        eyebrow="Decision policy"
        title="Recommendation guardrails"
        subtitle="Shape how aggressive or conservative the engine should be when surfacing moves."
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {[
          { label: "Recommendations", value: enableRecs ? "Enabled" : "Paused", tone: enableRecs ? "text-cyan-300" : "text-slate-400" },
          { label: "Max move size", value: maxMoveSize, tone: "text-white" },
          { label: "Cooldown", value: cooldownPeriod, tone: "text-amber-300" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</div>
            <div className={cn("mt-2 text-base font-semibold tracking-tight", card.tone)}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.018] px-4">
        <SettingRow label="Enable recommendations" description="Turn off to suppress recommendation generation entirely.">
          <Toggle enabled={enableRecs} onChange={setEnableRecs} />
        </SettingRow>
        <SettingRow label="Minimum score threshold" description="Only surface recommendations above this threshold.">
          <input
            type="number"
            value={minScoreThreshold}
            onChange={(e) => setMinScoreThreshold(e.target.value)}
            step="0.01"
            min="0.1"
            max="0.5"
            className="w-20 rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-1.5 text-center text-xs text-white focus:outline-none"
          />
        </SettingRow>
        <SettingRow label="Maximum single move size" description="Cap any suggested move as a percentage of the source stake.">
          <select
            value={maxMoveSize}
            onChange={(e) => setMaxMoveSize(e.target.value)}
            className="rounded-lg border border-white/8 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option>25%</option>
            <option>15%</option>
            <option>10%</option>
            <option>5%</option>
          </select>
        </SettingRow>
        <SettingRow label="Block speculative-risk moves" description="Suppress recommendations tagged as speculative.">
          <Toggle enabled={blockSpeculative} onChange={setBlockSpeculative} />
        </SettingRow>
        <SettingRow label="Cooldown period" description="Minimum time between actions on the same subnet pair." last>
          <select
            value={cooldownPeriod}
            onChange={(e) => setCooldownPeriod(e.target.value)}
            className="rounded-lg border border-white/8 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option>24 hours</option>
            <option>48 hours</option>
            <option>72 hours</option>
          </select>
        </SettingRow>
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={saveGuardrails}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
          style={{
            background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
            color: "#04060d",
            boxShadow:
              "0 0 0 1px rgba(34,211,238,0.4), 0 4px 12px rgba(34,211,238,0.18), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <Save className="h-3.5 w-3.5" />
          Save guardrails
        </button>
        <span className="text-[11px] text-slate-500">
          {savedState === "saved" ? "Saved locally in this browser." : "Stored locally until server-backed preferences land."}
        </span>
      </div>
    </Panel>
  );
}

function SecuritySection() {
  const [showAddress, setShowAddress] = useState(true);
  const [activityLog, setActivityLog] = useState(true);

  return (
    <Panel>
      <PanelHeader
        eyebrow="Security posture"
        title="Privacy and session controls"
        subtitle="A compact view of the security defaults that shape the product experience."
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {[
          { label: "Transaction review", value: "Required", tone: "text-emerald-300" },
          { label: "Activity log", value: activityLog ? "Enabled" : "Disabled", tone: "text-slate-200" },
          { label: "Address display", value: showAddress ? "Visible" : "Hidden", tone: "text-cyan-300" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</div>
            <div className={cn("mt-2 text-base font-semibold tracking-tight", card.tone)}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.018] px-4">
        <SettingRow label="Show wallet address in topbar" description="Display a truncated address in the navigation chrome.">
          <Toggle enabled={showAddress} onChange={setShowAddress} />
        </SettingRow>
        <SettingRow label="Activity log" description="Keep an operational log of actions taken through this interface.">
          <Toggle enabled={activityLog} onChange={setActivityLog} />
        </SettingRow>
        <SettingRow label="Session timeout" description="Auto-disconnect wallet after a period of inactivity.">
          <select className="rounded-lg border border-white/8 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 focus:outline-none">
            <option>30 min</option>
            <option>1 hour</option>
            <option>4 hours</option>
          </select>
        </SettingRow>
        <SettingRow label="Transaction confirmation" description="Every approval flow requires an explicit user review step." last>
          <SystemEnforced />
        </SettingRow>
      </div>

      <div className="mt-5">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Data Tyvera should never collect</div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            "Seed phrases or private keys",
            "Wallet history outside the active product context",
            "Personal identification or KYC data",
            "Hidden device fingerprinting for monetization",
          ].map((item) => (
            <div key={item} className="rounded-xl border border-rose-400/12 bg-rose-400/[0.035] px-4 py-3 text-sm text-slate-400">
              {item}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<(typeof SECTIONS)[number]["id"]>("account");

  return (
    <div className="max-w-6xl mx-auto">
      <FadeIn>
        <PageHeader
          title="Settings"
          subtitle="Account controls, wallet state, notifications, guardrails, and security preferences"
        />
      </FadeIn>

      <FadeIn>
        <div className="mb-6 rounded-[24px] border border-white/8 bg-[linear-gradient(160deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Control surface", value: "Settings", icon: Layers3, tone: "text-cyan-300" },
              { label: "Intent", value: "Operator-grade", icon: Sparkles, tone: "text-white" },
              { label: "Focus", value: "Trust + control", icon: Shield, tone: "text-emerald-300" },
              { label: "Mode", value: "Scoped preferences", icon: SlidersHorizontal, tone: "text-violet-300" },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>
                <div className={cn("mt-2 text-base font-semibold tracking-tight", tone)}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full shrink-0 lg:w-[220px]">
          <nav className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-24 lg:flex-col lg:pb-0">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className="flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-sm transition-all lg:w-full"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, rgba(34,211,238,0.1) 0%, rgba(34,211,238,0.05) 100%)"
                      : "rgba(255,255,255,0.02)",
                    border: isActive ? "1px solid rgba(34,211,238,0.18)" : "1px solid rgba(255,255,255,0.06)",
                    color: isActive ? "#a5f3fc" : "#64748b",
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="min-w-0 flex-1">
          <FadeIn key={activeSection}>
            {activeSection === "account" && <AccountSection />}
            {activeSection === "wallet" && <WalletSection />}
            {activeSection === "notifications" && <NotificationsSection />}
            {activeSection === "guardrails" && <GuardrailsSection />}
            {activeSection === "security" && <SecuritySection />}
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
