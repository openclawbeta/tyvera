"use client";

import { useState, useEffect } from "react";
import {
  Wallet, Shield, CheckCircle, AlertCircle, Copy, ExternalLink,
  LogOut, Bell, Lock, Eye, ChevronRight, Loader2,
  Globe, Info, ToggleLeft, ToggleRight, User, Lightbulb, Save,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { useWallet } from "@/lib/wallet-context";
import { truncateAddress } from "@/lib/utils";
import { cn } from "@/lib/utils";

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
/* Primitives                                                           */
/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

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

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
/* Section nav                                                          */
/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

const SECTIONS = [
  { id: "account",         label: "Account",          icon: User },
  { id: "wallet",          label: "Wallet",           icon: Wallet },
  { id: "notifications",   label: "Notifications",    icon: Bell },
  { id: "guardrails",      label: "Rec. Guardrails",  icon: Lightbulb },
  { id: "security",        label: "Security",         icon: Shield },
];

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
/* Wallet section (full)                                               */
/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

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

      {/* ââ Disconnected ââ */}
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
              { icon: Lock,        text: "No seed phrase stored â ever" },
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

      {/* ââ Connecting ââ */}
      {walletState === "connecting" && (
        <div className="flex items-center gap-3 py-6">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#22d3ee" }} />
          <p className="text-[13px] text-slate-400">Connecting to wallet extensionâ¦</p>
        </div>
      )}

      {/* ââ Connected or Verified ââ */}
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
                  {isVerified ? "Verified" : "Unverified"} Â· Polkadot.js
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
                  Sign a one-time verification message to confirm wallet ownership. Gasless â no TAO is spent.
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

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
/* Account section                                                      */
/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

function AccountSection() {
  return (
    <Panel>
      <PanelHeader title="Account" subtitle="Profile and plan information." />
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.055)" }}>
        <SettingRow label="Display name">
          <span className="text-[12px] text-slate-300 font-medium">Openclaw</span>
        </SettingRow>
        <SettingRow label="Email" description="Used for billing receipts only.">
          <span className="text-[12px] text-slate-500">openclawbeta@gmail.com</span>
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
                background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.1))",
                border: "1px solid rgba(251,191,36,0.28)",
                color: "#fbbf24",
              }}
            >
              â¡ PREMIUM
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
          </div>
        </SettingRow>
      </div>
    </Panel>
  );
}

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
/* Notifications section                                               */
/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

function NotificationsSection() {
  const defaultPrefs = {
    newRecs: true, yieldAlerts: true, txConfirmed: true,
    premiumExpiry: true, weeklyDigest: false, systemUpdates: true,
  };

  const [prefs, setPrefs] = useState(defaultPrefs);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("tyvera_notifications");
    if (stored) {
      try {
        setPrefs(JSON.parse(stored));
      } catch {
        setPrefs(defaultPrefs);
      }
    }
  }, []);

  function toggle(key: keyof typeof prefs) {
    setPrefs((p) => {
      const updated = { ...p, [key]: !p[key] };
      localStorage.setItem("tyvera_notifications", JSON.stringify(updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return updated;
    });
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
            <div className="flex items-center gap-3">
              {saved && (
                <span className="text-[10px] text-emerald-400 font-semibold">Saved</span>
              )}
              <Toggle enabled={prefs[key as keyof typeof prefs]} onChange={() => toggle(key as keyof typeof prefs)} />
            </div>
          </SettingRow>
        ))}
      </div>
    </Panel>
  );
}

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
/* Guardrails section                                                   */
/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

function GuardrailsSection() {
  const defaultGuardrails = {
    enableRecs: true,
    scoreThreshold: 0.15,
    maxMoveSize: "25%",
    blockSpeculative: false,
    cooldown: "24 hours",
  };

  const [guardrails, setGuardrails] = useState(defaultGuardrails);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("tyvera_guardrails");
    if (stored) {
      try {
        setGuardrails(JSON.parse(stored));
      } catch {
        setGuardrails(defaultGuardrails);
      }
    }
  }, []);

  function updateGuardrails(updates: Partial<typeof guardrails>) {
    const updated = { ...guardrails, ...updates };
    setGuardrails(updated);
    localStorage.setItem("tyvera_guardrails", JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Panel>
      <PanelHeader title="Recommendation Guardrails" subtitle="Control when and how the engine surfaces suggestions." />
      <div className="rounded-xl overflow-hidden mb-4" style={{ border: "1px solid rgba(255,255,255,0.055)" }}>
        <SettingRow label="Enable recommendations" description="Turn off to suppress all recommendation generation.">
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-[10px] text-emerald-400 font-semibold">Saved</span>
            )}
            <Toggle enabled={guardrails.enableRecs} onChange={(v) => updateGuardrails({ enableRecs: v })} />
          </div>
        </SettingRow>
        <SettingRow label="Minimum score threshold" description="Only show recommendations above this score.">
          <input
            type="number"
            value={guardrails.scoreThreshold}
            onChange={(e) => updateGuardrails({ scoreThreshold: parseFloat(e.target.value) })}
            step="0.01"
            min="0.1"
            max="0.5"
            className="w-20 px-2.5 py-1.5 rounded-lg text-xs text-white text-center focus:outline-none transition-colors"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          />
        </SettingRow>
        <SettingRow label="Maximum single move size" description="Cap any recommended move as % of source stake.">
          <select
            value={guardrails.maxMoveSize}
            onChange={(e) => updateGuardrails({ maxMoveSize: e.target.value })}
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
          <Toggle enabled={guardrails.blockSpeculative} onChange={(v) => updateGuardrails({ blockSpeculative: v })} />
        </SettingRow>
        <SettingRow label="Cooldown period" description="Minimum hours between moves on the same subnet pair." last>
          <select
            value={guardrails.cooldown}
            onChange={(e) => updateGuardrails({ cooldown: e.target.value })}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-300 focus:outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <option>24 hours</option>
            <option>48 hours</option>
            <option>72 hours</option>
          </select>
        </SettingRow>
      </div>
      {saved && (
        <div className="text-[11px] text-emerald-400 font-semibold mb-4">All changes saved to localStorage</div>
      )}
    </Panel>
  );
}

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
/* Security section                                                     */
/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

function SecuritySection() {
  const defaultSecurity = {
    showAddress: true,
    activityLog: true,
    sessionTimeout: "30 min",
  };

  const [security, setSecurity] = useState(defaultSecurity);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("tyvera_security");
    if (stored) {
      try {
        setSecurity(JSON.parse(stored));
      } catch {
        setSecurity(defaultSecurity);
      }
    }
  }, []);

  function updateSecurity(updates: Partial<typeof security>) {
    const updated = { ...security, ...updates };
    setSecurity(updated);
    localStorage.setItem("tyvera_security", JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Panel>
      <PanelHeader title="Security & Privacy" subtitle="Session and display preferences." />
      <div className="rounded-xl overflow-hidden mb-5" style={{ border: "1px solid rgba(255,255,255,0.055)" }}>
        <SettingRow label="Show wallet address in topbar" description="Display truncated address in the navigation bar.">
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-[10px] text-emerald-400 font-semibold">Saved</span>
            )}
            <Toggle enabled={security.showAddress} onChange={(v) => updateSecurity({ showAddress: v })} />
          </div>
        </SettingRow>
        <SettingRow label="Activity log" description="Log all platform actions. No keys are stored.">
          <Toggle enabled={security.activityLog} onChange={(v) => updateSecurity({ activityLog: v })} />
        </SettingRow>
        <SettingRow label="Session timeout" description="Auto-disconnect wallet after inactivity.">
          <select
            value={security.sessionTimeout}
            onChange={(e) => updateSecurity({ sessionTimeout: e.target.value })}
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
              <span style={{ color: "#f43f5e", fontSize: "8px", fontWeight: 800 }}>â</span>
            </div>
            <span className="text-[11px] text-slate-500">{item}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
/* Page                                                                 */
/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

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
        {/* ââ Section nav ââ */}
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

        {/* ââ Content ââ */}
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
