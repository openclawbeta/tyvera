"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  Shield,
  CheckCircle,
  Wallet,
  ChevronRight,
  Network,
  Lightbulb,
  BarChart2,
} from "lucide-react";

const FEATURE_LIST = [
  { icon: Network,    color: "#22d3ee", text: "Live analytics on all 64+ Bittensor subnets" },
  { icon: Lightbulb, color: "#8b5cf6", text: "Risk-adjusted recommendations with full rationale" },
  { icon: Wallet,     color: "#34d399", text: "Assisted reallocation — you sign, we never execute" },
  { icon: BarChart2,  color: "#fbbf24", text: "Portfolio tracking, yield history, and concentration metrics" },
];

type Step = "account" | "wallet";

function PasswordStrength({ value }: { value: string }) {
  const len  = value.length;
  const has  = (re: RegExp) => re.test(value);
  const score = [
    len >= 8,
    has(/[A-Z]/),
    has(/[0-9]/),
    has(/[^A-Za-z0-9]/),
  ].filter(Boolean).length;

  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#f87171", "#fbbf24", "#34d399", "#22d3ee"];

  if (!value) return null;
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-1 h-[3px] rounded-full transition-all duration-300"
            style={{ background: i <= score ? colors[score] : "rgba(255,255,255,0.08)" }}
          />
        ))}
      </div>
      <span className="text-[10px] font-semibold" style={{ color: colors[score] }}>
        {labels[score]}
      </span>
    </div>
  );
}

export default function SignupPage() {
  const [step,     setStep]     = useState<Step>("account");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [agreed,   setAgreed]   = useState(false);
  const [walletState, setWalletState] = useState<"idle" | "connecting" | "connected" | "skipped">("idle");

  function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("wallet");
  }

  function handleWalletConnect() {
    setWalletState("connecting");
    setTimeout(() => setWalletState("connected"), 1800);
  }

  const accountReady = name.trim() && email.trim() && password.length >= 8 && agreed;

  return (
    <div className="min-h-screen flex" style={{ background: "#06070f" }}>

      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex w-[460px] flex-shrink-0 flex-col justify-between p-10 relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #08091a 0%, #06070f 100%)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 30% 20%, rgba(34,211,238,0.07), transparent 60%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 40% at 70% 80%, rgba(139,92,246,0.05), transparent 60%)" }} />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Logo */}
        <div className="relative">
          <Link href="/" className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-[11px] flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                boxShadow: "0 0 0 1px rgba(34,211,238,0.3), 0 4px 16px rgba(34,211,238,0.2)",
              }}
            >
              <Zap className="w-[18px] h-[18px] text-black" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-[15px] font-bold text-white" style={{ letterSpacing: "-0.02em" }}>TAO Navigator</div>
              <div className="text-[9.5px] text-slate-600 font-medium uppercase tracking-[0.08em]">Bittensor Intelligence</div>
            </div>
          </Link>
        </div>

        {/* Headline */}
        <div className="relative space-y-8">
          <div>
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-5"
              style={{ background: "rgba(34,211,238,0.07)", border: "1px solid rgba(34,211,238,0.18)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-dot" style={{ boxShadow: "0 0 4px rgba(34,211,238,0.6)" }} />
              <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">Free to start</span>
            </div>
            <h2
              className="font-black text-white mb-4"
              style={{ fontSize: "34px", letterSpacing: "-0.035em", lineHeight: 1.1 }}
            >
              Everything you need
              <br />
              to stake{" "}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #67e8f9 0%, #22d3ee 100%)" }}>smarter.</span>
            </h2>
            <p className="text-[14px] text-slate-500 leading-relaxed">
              Create a free account. Connect your wallet. Upgrade to premium when you're ready.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURE_LIST.map(({ icon: Icon, color, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}15`, border: `1px solid ${color}25` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <span className="text-[13px] text-slate-400">{text}</span>
              </div>
            ))}
          </div>

          {/* Pricing teaser */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2 font-semibold">Premium · when you're ready</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[28px] font-black text-white" style={{ letterSpacing: "-0.04em" }}>0.5</span>
              <span className="text-[16px] font-bold text-cyan-400">τ</span>
              <span className="text-[12px] text-slate-600">/ month</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">Pay in TAO. Extend anytime. No auto-renewal.</p>
          </div>
        </div>

        <p className="text-[10px] text-slate-700 relative">Not financial advice. You approve every move.</p>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="lg:hidden absolute top-6 left-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[9px] flex items-center justify-center" style={{ background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)" }}>
              <Zap className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
            </div>
            <span className="text-[13px] font-bold text-white">TAO Navigator</span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[440px]"
        >
          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            {(["account", "wallet"] as Step[]).map((s, i) => {
              const done    = step === "wallet" && s === "account";
              const active  = step === s;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300"
                    style={{
                      background: done ? "#34d399" : active ? "linear-gradient(135deg, #22d3ee, #0ea5e9)" : "rgba(255,255,255,0.06)",
                      color: done || active ? "#04060d" : "#475569",
                      border: done || active ? "none" : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {done ? <CheckCircle className="w-3 h-3" /> : i + 1}
                  </div>
                  <span className="text-[11px] font-medium capitalize" style={{ color: active ? "#f8fafc" : "#475569" }}>
                    {s === "account" ? "Account" : "Wallet"}
                  </span>
                  {i < 1 && (
                    <div className="w-8 h-px mx-1" style={{ background: step === "wallet" ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.06)" }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.038) 0%, rgba(255,255,255,0.018) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.055) inset, 0 20px 60px rgba(0,0,0,0.45)",
            }}
          >
            {/* ─ STEP 1: Account ─ */}
            {step === "account" && (
              <>
                <div className="mb-7">
                  <h1 className="font-bold text-white mb-1" style={{ fontSize: "22px", letterSpacing: "-0.025em" }}>
                    Create your account
                  </h1>
                  <p className="text-[13px] text-slate-500">Free forever. Upgrade to premium anytime.</p>
                </div>

                <form onSubmit={handleAccountSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#475569" }} />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] text-slate-200 placeholder-slate-600 outline-none transition-all duration-200"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(34,211,238,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(34,211,238,0.08)"; }}
                        onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.boxShadow = "none"; }}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#475569" }} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] text-slate-200 placeholder-slate-600 outline-none transition-all duration-200"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(34,211,238,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(34,211,238,0.08)"; }}
                        onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.boxShadow = "none"; }}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#475569" }} />
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="w-full pl-10 pr-11 py-3 rounded-xl text-[13px] text-slate-200 placeholder-slate-600 outline-none transition-all duration-200"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(34,211,238,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(34,211,238,0.08)"; }}
                        onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.boxShadow = "none"; }}
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: "#475569" }}>
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordStrength value={password} />
                  </div>

                  {/* Terms */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div
                      className="w-4 h-4 rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center transition-all duration-150"
                      style={{
                        background: agreed ? "linear-gradient(135deg, #22d3ee, #0ea5e9)" : "rgba(255,255,255,0.04)",
                        border: agreed ? "none" : "1px solid rgba(255,255,255,0.12)",
                      }}
                      onClick={() => setAgreed(!agreed)}
                    >
                      {agreed && <CheckCircle className="w-3 h-3 text-black" />}
                    </div>
                    <span className="text-[11px] text-slate-500 leading-relaxed">
                      I agree to the{" "}
                      <a href="#" className="text-cyan-500 hover:text-cyan-400 transition-colors">Terms of Service</a>
                      {" "}and{" "}
                      <a href="#" className="text-cyan-500 hover:text-cyan-400 transition-colors">Privacy Policy</a>.
                      Not financial advice.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={!accountReady}
                    className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-[13px] py-3 transition-all duration-200"
                    style={{
                      background: accountReady
                        ? "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)"
                        : "rgba(255,255,255,0.05)",
                      color: accountReady ? "#04060d" : "#334155",
                      boxShadow: accountReady
                        ? "0 0 0 1px rgba(34,211,238,0.35), 0 4px 14px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.2)"
                        : "none",
                      cursor: accountReady ? "pointer" : "not-allowed",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}

            {/* ─ STEP 2: Wallet ─ */}
            {step === "wallet" && (
              <>
                <div className="mb-7">
                  <h1 className="font-bold text-white mb-1" style={{ fontSize: "22px", letterSpacing: "-0.025em" }}>
                    Connect your wallet
                  </h1>
                  <p className="text-[13px] text-slate-500">
                    Optional now — required for recommendations and reallocation.
                  </p>
                </div>

                <div className="space-y-4">
                  {walletState === "idle" && (
                    <>
                      <button
                        onClick={handleWalletConnect}
                        className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all duration-200"
                        style={{
                          background: "rgba(255,255,255,0.045)",
                          border: "1px solid rgba(255,255,255,0.09)",
                          boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
                        }}
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #e6007a 0%, #c0006a 100%)", boxShadow: "0 2px 8px rgba(230,0,122,0.3)" }}>
                          <span className="text-white text-[11px] font-black">P</span>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-[13px] font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>Polkadot.js Extension</div>
                          <div className="text-[10px] text-slate-600 mt-0.5">Connect via browser extension</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </button>

                      <div className="flex items-start gap-2 px-1">
                        <Shield className="w-3 h-3 text-slate-700 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-slate-700 leading-relaxed">
                          Read-only connection. We request only your public address. Nothing is signed until you explicitly approve a transaction.
                        </p>
                      </div>

                      <div className="relative py-2">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                          <span className="text-[10px] text-slate-700 uppercase tracking-wider">or</span>
                          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                        </div>
                      </div>

                      <Link href="/dashboard">
                        <button
                          onClick={() => setWalletState("skipped")}
                          className="w-full flex items-center justify-center gap-2 rounded-xl font-medium text-[13px] py-3 transition-all duration-200"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#94a3b8",
                          }}
                        >
                          Skip for now — explore free features
                        </button>
                      </Link>
                    </>
                  )}

                  {walletState === "connecting" && (
                    <div
                      className="flex flex-col items-center justify-center py-8 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <div className="w-10 h-10 rounded-full border-2 border-cyan-400 animate-spin mb-3" style={{ borderTopColor: "transparent" }} />
                      <p className="text-[13px] font-medium text-slate-300">Waiting for wallet…</p>
                      <p className="text-[11px] text-slate-600 mt-1">Approve the connection in your extension.</p>
                    </div>
                  )}

                  {walletState === "connected" && (
                    <div className="space-y-4">
                      <div className="rounded-xl p-4" style={{ background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.2)" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)" }}>
                            <CheckCircle className="w-4 h-4 text-cyan-400" />
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-cyan-300">Wallet connected</p>
                            <code className="text-[10px] text-slate-500 font-mono">5Grwva…utQY</code>
                          </div>
                        </div>
                      </div>
                      <Link href="/dashboard">
                        <button
                          className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-[13px] py-3 transition-all duration-200"
                          style={{
                            background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                            color: "#04060d",
                            boxShadow: "0 0 0 1px rgba(34,211,238,0.35), 0 4px 14px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
                          }}
                        >
                          Enter App <ArrowRight className="w-4 h-4" />
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="mt-6 flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              <span className="text-[10px] text-slate-700 uppercase tracking-wider">already have an account?</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
            <p className="text-center mt-4">
              <Link href="/login" className="text-[12px] text-cyan-400 font-semibold hover:text-cyan-300 transition-colors">
                Sign in instead
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
