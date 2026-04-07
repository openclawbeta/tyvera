"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap,
  ArrowRight,
  Shield,
  Wallet,
  ChevronRight,
} from "lucide-react";

const TRUST_ITEMS = [
  { icon: Shield,       text: "No seed phrase storage",       sub: "We never see your private keys." },
  { icon: Wallet,       text: "You approve every move",        sub: "Nothing executes without your signature." },
  { icon: Shield,       text: "Non-custodial, end-to-end",     sub: "Your wallet, your funds, your control." },
];

export default function LoginPage() {
  const router = useRouter();
  const [walletState, setWalletState] = useState<"idle" | "connecting">("idle");

  function handleWalletConnect() {
    setWalletState("connecting");
    setTimeout(() => {
      router.push("/dashboard");
    }, 800);
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "#06070f" }}
    >
      {/* ── LEFT PANEL ── brand / trust ──────────────────────────── */}
      <div
        className="hidden lg:flex w-[460px] flex-shrink-0 flex-col justify-between p-10 relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #08091a 0%, #06070f 100%)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Background glows */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 70% 50% at 30% 20%, rgba(34,211,238,0.07), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 50% 40% at 70% 80%, rgba(139,92,246,0.05), transparent 60%)",
          }}
        />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Top: logo */}
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
              <div className="text-[15px] font-bold text-white" style={{ letterSpacing: "-0.02em" }}>
                Tyvera
              </div>
              <div className="text-[9.5px] text-slate-600 font-medium uppercase tracking-[0.08em]">
                Bittensor Intelligence
              </div>
            </div>
          </Link>
        </div>

        {/* Middle: headline */}
        <div className="relative space-y-6">
          <div>
            <h2
              className="font-black text-white mb-4"
              style={{ fontSize: "34px", letterSpacing: "-0.035em", lineHeight: 1.1 }}
            >
              Subnet analytics
              <br />
              built for serious
              <br />
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(135deg, #67e8f9 0%, #22d3ee 100%)" }}
              >
                TAO stakers.
              </span>
            </h2>
            <p className="text-[14px] text-slate-500 leading-relaxed">
              Live scoring, risk-adjusted recommendations, and wallet-signed reallocation — all in one dashboard.
            </p>
          </div>

          {/* Trust rows */}
          <div className="space-y-3">
            {TRUST_ITEMS.map(({ icon: Icon, text, sub }) => (
              <div key={text} className="flex items-start gap-3">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: "rgba(52,211,153,0.1)",
                    border: "1px solid rgba(52,211,153,0.18)",
                  }}
                >
                  <Icon className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>{text}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: disclaimer */}
        <p className="text-[10px] text-slate-700 relative">
          Not financial advice. Staking yields change continuously.
        </p>
      </div>

      {/* ── RIGHT PANEL ── auth form ───────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Top-right mobile logo */}
        <div className="lg:hidden absolute top-6 left-6">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-[9px] flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)" }}
            >
              <Zap className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
            </div>
            <span className="text-[13px] font-bold text-white">Tyvera</span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px]"
        >
          {/* Card */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.038) 0%, rgba(255,255,255,0.018) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.055) inset, 0 20px 60px rgba(0,0,0,0.45)",
            }}
          >
            {/* Header */}
            <div className="mb-7">
              <h1
                className="font-bold text-white mb-1"
                style={{ fontSize: "22px", letterSpacing: "-0.025em" }}
              >
                Sign in
              </h1>
              <p className="text-[13px] text-slate-500">
                Connect your wallet or sign in with email.
              </p>
            </div>

            {/* Wallet connection */}
            <div className="space-y-4">
              {walletState === "idle" && (
                <>
                  <div className="mb-6 p-4 rounded-xl" style={{ background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.15)" }}>
                    <p className="text-[12px] text-slate-300">Connect your Polkadot.js or Talisman wallet to get started.</p>
                  </div>
                  <button
                    onClick={handleWalletConnect}
                    className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.045)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg, #e6007a 0%, #c0006a 100%)",
                        boxShadow: "0 2px 8px rgba(230,0,122,0.3)",
                      }}
                    >
                      <span className="text-white text-[11px] font-black">P</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-[13px] font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>
                        Connect Wallet
                      </div>
                      <div className="text-[10px] text-slate-600 mt-0.5">Polkadot.js Extension</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>

                  {/* Trust note */}
                  <div className="flex items-start gap-2 px-1 mt-4">
                    <Shield className="w-3 h-3 text-slate-700 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-700 leading-relaxed">
                      Read-only connection. We never access your private keys or execute transactions without your approval.
                    </p>
                  </div>
                </>
              )}

              {walletState === "connecting" && (
                <div
                  className="flex flex-col items-center justify-center py-8 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-3"
                    style={{ borderTopColor: "transparent" }}
                  />
                  <p className="text-[13px] font-medium text-slate-300">Connecting wallet…</p>
                  <p className="text-[11px] text-slate-600 mt-1">Approve the connection in your extension.</p>
                </div>
              )}
            </div>
          </div>

          {/* Below-card disclaimer */}
          <p className="text-center text-[10px] text-slate-700 mt-5 px-4 leading-relaxed">
            By continuing, you agree to the{" "}
            <Link href="/terms" className="underline hover:text-slate-500 transition-colors">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-slate-500 transition-colors">Privacy Policy</Link>.
            Not financial advice.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
