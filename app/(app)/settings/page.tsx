"use client";

import { useState } from "react";
import {
  Wallet, Shield, CheckCircle, AlertCircle, Copy, ExternalLink,
  LogOut, Bell, Lock, Eye, ChevronRight, Loader2,
  Globe, Info, ToggleLeft, ToggleRight, User, Lightbulb, Save,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { useWallet } from "@/lib/wallet-context";
import { useEntitlement } from "@/lib/hooks/use-entitlement";
import { truncateAddress } from "@/lib/utils";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------------------------------------------------------------------- */
/* Primitives                                                           */
/* -------------------------------------------------------------------------------------------------------------------------------------- */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl"
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.028) 0%, rgba(255,255,255,0.014) 100%)",
        border: "1px solid rgba(255,255,255,0.068)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.045), 0 4px 24px rgba(0,0,0,0.28)",
        padding: "24px",
      }}
    >
      {children}
    </div>
  );
}

function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.055)" }}>
      <h2 className="font-bold text-white" style={{ fontSize: "13px", letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      {subtitle && <p className="text-[11px] text-slate-600 mt-0.5">{subtitle}</p>}
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
      <div className="flex-1">
        <p className="text-[12px] font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>
          {label}
        </p>
        {description && (
          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!enabled)} className="transition-colors duration-200">
      {enabled ? (
        <ToggleRight className="w-8 h-8" style={{ color: "#22d3ee" }} />
      ) : (
        <ToggleLeft className="w-8 h-8" style={{ color: "#334155" }} />
      )}
    </button>
  );
}

function SystemEnforced() {
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
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

/* -------------------------------------------------------------------------------------------------------------------------------------- */
/* Section nav                                                          */
/* -------------------------------------------------------------------------------------------------------------------------------------- */

const SECTIONS = [
  { id: "account",         label: "Account",          icon: User },
  { id: "wallet",          label: "Wallet",           icon: Wallet },
  { id: "notifications",   label: "Notifications",    icon: Bell },
  { id: "guardrails",      label: "Rec. Guardrails",  icon: Lightbulb },
  { id: "security",        label: "Security",         icon: Shield },
];

/* -------------------------------------------------------------------------------------------------------------------------------------- */
/* Wallet section (full)                                               */
/* -------------------------------------------------------------------------------------------------------------------------------------- */

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
  const isVerified  = walletState === "verified" || walletState === "pending_approval";

  return (
    <Panel>
      <PanelHeader title="Wallet" subtitle="Connect and manage your Polkadot-compatible wallet." />

      {/* ---- Disconnected ---- */}
      {walletState === "disconnected" && (
        <>
          <div
            className="flex flex-col items-center text-center py-10 rounded-xl mb-5"
            style={{
              background: "rgba(255,255,255,0.018)",
              border: "1px solid rgba(255,255,255,0.055)",
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: "rgba(34,211,238,0.08)",
                border: "1px solid rgba(34,211,238,0.18)",
              }}
            >
              <Wallet className="w-6 h-6" style={{ color: "#22d3ee" }} />
            </div>
            <p className="text-[14px] font-semibold text-white mb-1.5" style={{ letterSpacing: "-0.01em" }}>
              No wallet connected
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs">
              Connect a Polkadot-compatible wallet to use reallocation tools and execute recommendations.
            </p>
          </div>

          {/* Trust grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {[
              { icon: Shield,      text: "Wallet stays fully in your control" },
              { icon: Lock,        text: "No seed phrase stored -- ever" },
              { icon: CheckCircle, text: "You approve every on-chain action" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-start gap-2.5 p-3 rounded-xl"
                style={{
                  background: "rgba(52,211,153,0.05)",
                  border: "1px solid rgba(52,211,153,0.12)",
                }}
              >
                <Icon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-[1px]" />
                <span className="text-[11px] text-slate-500 leading-snug">{text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={openModal}
            className="flex items-center gap-2 font-semibold text-[13px] px-5 py-3 rounded-xl transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
              color: "#04060d",
              boxShadow: "0 0 0 1px rgba(34,211,238,0.4), 0 4px 16px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </button>
        </>
      )}

      {/* ---- Connecting ---- */}
      {walletState === "connecting" && (
        <div className="flex items-center gap-3 py-6">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#22d3ee" }} />
          <p className="text-[13px] text-slate-400">Connecting to wallet extension--</p>
        </div>
      )}

      {/* ---- Connected or Verified ---- */}
      {isConnected && address && (
        <>
          {/* Status hero */}
          <div
            className="flex items-center gap-4 p-4 rounded-xl mb-5"
            style={{
              background: isVerified ? "rgba(34,211,238,0.05)" : "rgba(251,191,36,0.05)",
              border: isVerified ? "1px solid rgba(34,211,238,0.18)" : "1px solid rgba(251,191,36,0.18)",
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: isVerified ? "rgba(34,211,238,0.1)" : "rgba(251,191,36,0.1)",
                border: isVerified ? "1px solid rgba(34,211,238,0.22)" : "1px solid rgba(251,191,36,0.22)",
              }}
            >
              {isVerified
                ? <CheckCircle className="w-5 h-5" style={{ color: "#22d3ee" }} />
                : <AlertCircle className="w-5 h-5" style={{ color: "#fbbf24" }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[12px] font-bold"
                  style={{ color: isVerified ? "#22d3ee" : "#fbbf24", letterSpacing: "-0.01em" }}
                >
                  {isVerified ? "Verified" : "Unverified"}  .  Polkadot.js
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-[11px] font-mono text-slate-500">{truncateAddress(address)}</code>
                <button onClick={copyAddress} style={{ color: copied ? "#22d3ee" : "#334155" }} className="transition-colors">
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  style={{ color: "#334155" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#94a3b8")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#334155")}
                  className="transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Verify prompt */}
          {!isVerified && walletState === "connected" && (
            <div
              className="flex items-start gap-3 p-4 rounded-xl mb-5"
              style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.16)" }}
            >
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-[1px]" />
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-amber-200 mb-0.5">Verification required to execute moves</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Sign a one-time verification message to confirm wallet ownership. Gasless -- no TAO is spent.
                </p>
              </div>
              <button
                onClick={verify}
                className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.18)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.1)")}
              >
                <Shield className="w-3 h-3" />
                Verify now
              </button>
            </div>
          )}

          {/* Detail rows */}
          <div className="rounded-xl overflow-hidden mb-5" style={{ border: "1px solid rgba(255,255,255,0.055)" }}>
            <SettingRow label="Connected extension">
              <span className="text-[12px] text-slate-400 font-medium">Polkadot.js</span>
            </SettingRow>
            <SettingRow label="Network" description="Bittensor mainnet (Finney)">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-[11px] text-slate-500">mainnet</span>
              </div>
            </SettingRow>
            <SettingRow label="Signing scope" description="Scope of permissions granted per session">
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.22)", color: "#34d399" }}
              >
                per-action
              </span>
            </SettingRow>
            <SettingRow label="Transaction log" description="Record of all actions initiated this session" last>
              <SystemEnforced />
            </SettingRow>
          </div>

          {/* Trust copy */}
          <div
            className="p-4 rounded-xl mb-5 space-y-2"
            style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.055)" }}
          >
            {[
              { icon: Shield,      text: "Your wallet and keys never leave your device." },
              { icon: Lock,        text: "Tyvera stores no private keys and no seed phrases." },
              { icon: Eye,         text: "Every on-chain action requires your explicit approval." },
              { icon: CheckCircle, text: "You can disconnect at any time without consequence." },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon className="w-3 h-3 flex-shrink-0 text-emerald-400" />
                <span className="text-[11px] text-slate-500">{text}</span>
              </div>
            ))}
          </div>

          {/* Disconnect */}
          <button
            onClick={disconnect}
            className="flex items-center gap-2 text-[12px] font-medium px-4 py-2.5 rounded-xl transition-all"
            style={{ color: "#64748b", border: "1px solid rgba(255,255,255,0.06)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#f87171";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,63,94,0.2)";
              (e.currentTarget as HTMLElement).style.background = "rgba(244,63,94,0.05)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#64748b";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Disconnect wallet
          </button>
        </>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------------------------------------------------------------------- */
/* Account section                                                      */
/* -------------------------------------------------------------------------------------------------------------------------------------- */

function AccountSection() {
  const { address } = useWallet();
  const { tier } = useEntitlement(address);
  const displayTier = tier ? tier.toUpperCase() : "EXPLORER";
  const truncated = address ? (address.slice(0, 6) + "..." + address.slice(-4)) : "Not connected";

  // Tier badge styling
  const tierStyles: Record<string, { bg: string; border: string; color: string }> = {
    EXPLORER:       { bg: "rgba(148,163,184,0.1)",  border: "rgba(148,163,184,0.25)", color: "#94a3b8" },
    ANALYST:        { bg: "rgba(34,211,238,0.1)",    border: "rgba(34,211,238,0.25)",  color: "#22d3ee" },
    STRATEGIST:     { bg: "rgba(139,92,246,0.1)",    border: "rgba(139,92,246,0.25)",  color: "#8b5cf6" },
    INSTITUTIONAL:  { bg: "rgba(251,191,36,0.1)",    border: "rgba(251,191,36,0.25)",  color: "#fbbf24" },
  };
  const style = tierStyles[displayTier] || tierStyles.EXPLORER;

  return (
    <Panel>
      <PanelHeader title="Account" subtitle="Profile and plan information." />
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.055)" }}>
        <SettingRow label="Wallet address">
          <span className="text-[12px] text-slate-300 font-medium font-mono">{truncated}</span>
        </SettingRow>
        <SettingRow label="Timezone">
          <select
            className="px-3 py-1.5 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-400/40 transition-colors"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <option>UTC+0</option>
            <option>UTC-5 (Eastern)</option>
            <option>UTC-8 (Pacific)</option>
          </select>
        </SettingRow>
        <SettingRow label="Current plan" last>
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: `linear-gradient(135deg, ${style.bg}, ${style.bg})`,
                border: `1px solid ${style.border}`,
                color: style.color,
              }}
            >
              {displayTier}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
          </div>
        </SettingRow>
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------------------------------------------------------------------- */
/* Notifications section                                               */
/* -------------------------------------------------------------------------------------------------------------------------------------- */

function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    newRecs: true, yieldAlerts: true, txConfirmed: true,
    premiumExpiry: true, weeklyDigest: false, systemUpdates: true,
  });

  function toggle(key: keyof typeof prefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  const rows = [
    { key: "newRecs",      label: "New recommendation",       desc: "Notify when the engine finds a new opportunity for your portfolio." },
    { key: "yieldAlerts",  label: "Yield change alerts",      desc: "Alert when a subnet's estimated APR changes by more than 5%." },
    { key: "txConfirmed",  label: "Transaction confirmed",    desc: "Notify when your on-chain transaction is finalized." },
    { key: "premiumExpiry",label: "Premium expiring soon",    desc: "Warn 7 days before your premium period ends." },
    { key: "weeklyDigest", label: "Weekly digest",            desc: "Summary of your portfolio performance each Monday." },
    { key: "systemUpdates",label: "System updates",           desc: "Important platform updates and maintenance notices." },
  ];

  return (
    <Panel>
      <PanelHeader title="Notifications" subtitle="Choose which alerts you receive." />
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.055)" }}>
        {rows.map(({ key, label, desc }, i) => (
          <SettingRow key={key} label={label} description={desc} last={i === rows.length - 1}>
            <Toggle enabled={prefs[key as keyof typeof prefs]} onChange={() => toggle(key as keyof typeof prefs)} />
          </SettingRow>
        ))}
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------------------------------------------------------------------- */
/* Guardrails section                                                   */
/* -------------------------------------------------------------------------------------------------------------------------------------- */

function GuardrailsSection() {
  const [blockSpeculative, setBlockSpeculative] = useState(false);
  const [enableRecs, setEnableRecs] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Persist to localStorage so settings survive page reloads
    try {
      localStorage.setItem("tyvera_guardrails", JSON.stringify({ blockSpeculative, enableRecs }));
    } catch { /* localStorage unavailable */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Panel>
      <PanelHeader title="Recommendation Guardrails" subtitle="Control when and how the engine surfaces suggestions." />
      <div className="rounded-xl overflow-hidden mb-4" style={{ border: "1px solid rgba(255,255,255,0.055)" }}>
        <SettingRow label="Enable recommendations" description="Turn off to suppress all recommendation generation.">
          <Toggle enabled={enableRecs} onChange={setEnableRecs} />
        </SettingRow>
        <SettingRow label="Minimum score threshold" description="Only show recommendations above this score.">
          <input
            type="number" defaultValue="0.15" step="0.01" min="0.1" max="0.5"
            className="w-20 px-2.5 py-1.5 rounded-lg text-xs text-white text-center focus:outline-none transition-colors"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          />
        </SettingRow>
        <SettingRow label="Maximum single move size" description="Cap any recommended move as % of source stake.">
          <select
            className="px-3 py-1.5 rounded-lg text-xs text-slate-300 focus:outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <option>25%</option>
            <option>15%</option>
            <option>10%</option>
            <option>5%</option>
          </select>
        </SettingRow>
        <SettingRow label="Block SPECULATIVE-risk moves" description="Never show recommendations rated as Speculative.">
          <Toggle enabled={blockSpeculative} onChange={setBlockSpeculative} />
        </SettingRow>
        <SettingRow label="Cooldown period" description="Minimum hours between moves on the same subnet pair." last>
          <select
            className="px-3 py-1.5 rounded-lg text-xs text-slate-300 focus:outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <option>24 hours</option>
            <option>48 hours</option>
            <option>72 hours</option>
          </select>
        </SettingRow>
      </div>
      <button
        onClick={handleSave}
        className="flex items-center gap-2 font-semibold text-[12px] px-4 py-2.5 rounded-xl transition-all duration-200"
        style={{
          background: saved
            ? "linear-gradient(135deg, #34d399 0%, #10b981 100%)"
            : "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
          color: "#04060d",
          boxShadow: "0 0 0 1px rgba(34,211,238,0.4), 0 4px 12px rgba(34,211,238,0.18), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        <Save className="w-3.5 h-3.5" />
        {saved ? "Saved!" : "Save Guardrails"}
      </button>
    </Panel>
  );
}

/* -------------------------------------------------------------------------------------------------------------------------------------- */
/* Security section                                                     */
/* -------------------------------------------------------------------------------------------------------------------------------------- */

function SecuritySection() {
  const [showAddress, setShowAddress] = useState(true);
  const [activityLog, setActivityLog] = useState(true);

  return (
    <Panel>
      <PanelHeader title="Security & Privacy" subtitle="Session and display preferences." />
      <div className="rounded-xl overflow-hidden mb-5" style={{ border: "1px solid rgba(255,255,255,0.055)" }}>
        <SettingRow label="Show wallet address in topbar" description="Display truncated address in the navigation bar.">
          <Toggle enabled={showAddress} onChange={setShowAddress} />
        </SettingRow>
        <SettingRow label="Activity log" description="Log all platform actions. No keys are stored.">
          <Toggle enabled={activityLog} onChange={setActivityLog} />
        </SettingRow>
        <SettingRow label="Session timeout" description="Auto-disconnect wallet after inactivity.">
          <select
            className="px-3 py-1.5 rounded-lg text-xs text-slate-300 focus:outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <option>30 min</option>
            <option>1 hour</option>
            <option>4 hours</option>
          </select>
        </SettingRow>
        <SettingRow label="Transaction confirmation" description="Require explicit review before every approval dialog." last>
          <SystemEnforced />
        </SettingRow>
      </div>

      {/* What we never collect */}
      <div className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-[0.1em] mb-3">
        Data we never collect
      </div>
      <div className="space-y-2">
        {[
          "Seed phrases or private keys",
          "Wallet transaction history outside of this session",
          "Personal identification or KYC data",
          "Browser fingerprint or device identifiers",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.18)" }}
            >
              <span style={{ color: "#f43f5e", fontSize: "8px", fontWeight: 800 }}>--</span>
            </div>
            <span className="text-[11px] text-slate-500">{item}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------------------------------------------------------------------- */
/* Page                                                                 */
/* -------------------------------------------------------------------------------------------------------------------------------------- */

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("account");

  return (
    <div className="max-w-4xl mx-auto">
      <FadeIn>
        <PageHeader
          title="Settings"
          subtitle="Manage your wallet, notifications, guardrails, and account preferences"
        />
      </FadeIn>

      <div className="flex flex-col lg:flex-row gap-6 mt-2">
        {/* ---- Section nav ---- */}
        <div className="w-full lg:w-44 flex-shrink-0 pt-0 lg:pt-1">
          <nav className="flex gap-1 overflow-x-auto pb-2 lg:pb-0 lg:flex-col lg:space-y-0.5 lg:sticky lg:top-20">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className="flex-shrink-0 lg:w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
                  style={{
                    fontSize: "12px",
                    fontWeight: isActive ? 600 : 500,
                    letterSpacing: "-0.01em",
                    background: isActive
                      ? "linear-gradient(135deg, rgba(34,211,238,0.1) 0%, rgba(34,211,238,0.05) 100%)"
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(34,211,238,0.18)"
                      : "1px solid transparent",
                    color: isActive ? "#a5f3fc" : "#475569",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = "#475569";
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }
                  }}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ---- Content ---- */}
        <div className="flex-1 min-w-0">
          <FadeIn key={activeSection}>
            {activeSection === "account"       && <AccountSection />}
            {activeSection === "wallet"        && <WalletSection />}
            {activeSection === "notifications" && <NotificationsSection />}
            {activeSection === "guardrails"    && <GuardrailsSection />}
            {activeSection === "security"      && <SecuritySection />}
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
