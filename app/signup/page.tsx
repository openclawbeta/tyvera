"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap,
  ArrowRight,
  Shield,
  Wallet,
  Network,
  Lightbulb,
  BarChart2,
} from "lucide-react";
import { useWallet } from "@/lib/wallet-context";

const FEATURE_LIST = [
  { icon: Network,    color: "#22d3ee", text: "Live analytics on all 64+ Bittensor subnets" },
  { icon: Lightbulb, color: "#8b5cf6", text: "Risk-adjusted recommendations with full rationale" },
  { icon: Wallet,     color: "#34d399", text: "Assisted reallocation — you sign, we never execute" },
  { icon: BarChart2,  color: "#fbbf24", text: "Portfolio tracking, yield history, and concentration metrics" },
];

export default function SignupPage() {
  const router = useRouter();
  const { walletState, connect, availableExtensions } = useWallet();

  // Redirect to dashboard once connected
  useEffect(() => {
    if (walletState === "connected" || walletState === "verified") {
      router.push("/dashboard");
    }
  }, [walletState, router]);

  function handleConnectWallet() {
    const ext = availableExtensions.length > 0 ? availableExtensions[0] : "polkadotjs";
    connect(ext);
  }

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
              <div className="text-[15px] font-bold text-white" style={{ letterSpacing: "-0.02em" }}>Tyvera</div>
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
              Connect your wallet to start exploring. Upgrade to premium anytime.
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
            <span className="text-[13px] font-bold text-white">Tyvera</span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[440px]"
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
                Connect your wallet
              </h1>
              <p className="text-[13px] text-slate-500">
                No account creation needed. Just connect a Polkadot.js or Talisman wallet to get started.
              </p>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleConnectWallet}
              className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-[13px] py-3 mb-6 transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                color: "#04060d",
                boxShadow: "0 0 0 1px rgba(34,211,238,0.35), 0 4px 14px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
                letterSpacing: "-0.01em",
              }}
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>

            {/* Trust note */}
            <div className="flex items-start gap-2 px-1">
              <Shield className="w-3 h-3 text-slate-700 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-700 leading-relaxed">
                Read-only connection. We never access your private keys or execute transactions without your approval.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
