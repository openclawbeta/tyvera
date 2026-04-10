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
  Lock,
  CheckCircle2,
  Layers3,
} from "lucide-react";
import { useWallet } from "@/lib/wallet-context";

const FEATURE_LIST = [
  { icon: Network, color: "#22d3ee", text: "Live analytics on all 64+ Bittensor subnets" },
  { icon: Lightbulb, color: "#8b5cf6", text: "Risk-adjusted recommendations with full rationale" },
  { icon: Wallet, color: "#34d399", text: "Assisted reallocation — you sign, we never execute" },
  { icon: BarChart2, color: "#fbbf24", text: "Portfolio tracking, yield history, and concentration metrics" },
];

const TRUST_NOTES = [
  "Read-only until you explicitly approve a workflow.",
  "No seed phrase handling. No private key custody.",
  "Tyvera prepares intelligence and review surfaces — not silent execution.",
];

export default function SignupPage() {
  const router = useRouter();
  const { walletState, connect, availableExtensions } = useWallet();

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_20%),radial-gradient(circle_at_78%_18%,rgba(59,130,246,0.1),transparent_20%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.05),transparent_24%)] text-slate-100" style={{ backgroundColor: "#06070f" }}>
      <nav
        className="fixed inset-x-0 top-0 z-50 flex h-16 items-center"
        style={{
          background: "linear-gradient(180deg, rgba(8,10,18,0.9), rgba(7,9,16,0.78))",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 10px 32px rgba(0,0,0,0.22)",
          backdropFilter: "blur(24px) saturate(1.6)",
        }}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-[10px]"
              style={{
                background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                boxShadow: "0 0 0 1px rgba(34,211,238,0.3), 0 4px 14px rgba(34,211,238,0.22)",
              }}
            >
              <Zap className="h-4 w-4 text-black" strokeWidth={2.5} />
            </div>
            <span className="text-[14px] font-bold text-white" style={{ letterSpacing: "-0.02em" }}>
              Tyvera
            </span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/pricing" className="rounded-xl px-4 py-2 text-[13px] font-medium text-slate-500 transition-all hover:bg-white/[0.05] hover:text-slate-200">
              Pricing
            </Link>
            <Link href="/subnets" className="rounded-xl px-4 py-2 text-[13px] font-medium text-slate-500 transition-all hover:bg-white/[0.05] hover:text-slate-200">
              Subnets
            </Link>
            <Link href="/dashboard">
              <button
                className="flex items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-semibold transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                  color: "#04060d",
                  boxShadow: "0 0 0 1px rgba(34,211,238,0.35), 0 4px 14px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                Open App <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 pb-10 pt-28 md:px-8 xl:grid-cols-[1.02fr_0.98fr] xl:items-center">
        <div className="relative overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(160deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.36)] lg:p-8">
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 30% 20%, rgba(34,211,238,0.07), transparent 60%)" }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 40% at 70% 80%, rgba(139,92,246,0.05), transparent 60%)" }} />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.025]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div className="relative space-y-8">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-2"
                style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)" }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse-dot" style={{ boxShadow: "0 0 4px rgba(34,211,238,0.6)" }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Free to start</span>
              </div>

              <h1 className="mt-6 text-[38px] font-black leading-[1.02] tracking-[-0.045em] text-white md:text-[50px]">
                Enter the
                <span className="block bg-[linear-gradient(135deg,#67e8f9_0%,#4f7cff_45%,#8b5cf6_100%)] bg-clip-text text-transparent">
                  Tyvera operator workspace.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-400 md:text-base">
                Connect your wallet to move from passive browsing into personalized research, portfolio visibility, and review-based allocation workflows.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Source-aware", "Fallback state stays visible"],
                ["Non-custodial", "You approve every move"],
                ["Operator-grade", "Built for decision clarity"],
              ].map(([title, sub]) => (
                <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <div className="mt-1 text-xs text-slate-500">{sub}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
                <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  <Layers3 className="h-3.5 w-3.5" />
                  Included from the start
                </div>
                <div className="space-y-3">
                  {FEATURE_LIST.map(({ icon: Icon, color, text }) => (
                    <div key={text} className="flex items-start gap-3">
                      <div
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: `${color}15`, border: `1px solid ${color}25` }}
                      >
                        <Icon className="h-4 w-4" style={{ color }} />
                      </div>
                      <span className="text-sm leading-relaxed text-slate-400">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
                <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Plans built for real operators</div>
                <div className="text-[26px] font-black tracking-[-0.045em] text-white md:text-[30px]">
                  Explorer <span className="text-slate-600">→</span> Analyst <span className="text-slate-600">→</span> Strategist
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  Start free, then move into deeper intelligence, recommendations, alerts, and portfolio workflows when the edge is materially useful.
                </p>
                <Link href="/pricing" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                  Review plan architecture
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-[24px] border border-emerald-400/12 bg-emerald-400/[0.035] p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <Shield className="h-4 w-4" />
                Trust boundary
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {TRUST_NOTES.map((text) => (
                  <div key={text} className="rounded-xl border border-white/6 bg-black/10 px-4 py-3 text-sm leading-relaxed text-slate-300">
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[520px] justify-self-center xl:justify-self-end"
        >
          <div
            className="rounded-[30px] border border-white/10 p-7 md:p-8"
            style={{
              background: "linear-gradient(160deg, rgba(14,17,26,0.96), rgba(9,11,18,0.98))",
              boxShadow: "0 1px 0 rgba(255,255,255,0.055) inset, 0 24px 70px rgba(0,0,0,0.45)",
            }}
          >
            <div className="mb-7 flex items-center justify-between border-b border-white/8 pb-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Wallet access</div>
                <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-white">Connect your wallet</h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
                  No separate account creation. Connect a supported wallet to enter the Tyvera workspace.
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-400/16 bg-cyan-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                Non-custodial
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">What happens next</div>
                <div className="mt-4 space-y-3">
                  {[
                    ["01", "Wallet connection", "Use Polkadot.js or Talisman to establish your workspace identity."],
                    ["02", "Read-only start", "You can inspect research and portfolio surfaces before approving anything."],
                    ["03", "Review-based execution", "When a workflow needs action, you review and sign it yourself."],
                  ].map(([n, title, text]) => (
                    <div key={n} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-black/20 text-xs font-bold text-cyan-300">
                        {n}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{title}</div>
                        <div className="mt-1 text-sm leading-relaxed text-slate-400">{text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleConnectWallet}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)",
                  color: "#04060d",
                  boxShadow: "0 0 0 1px rgba(34,211,238,0.35), 0 8px 24px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
                  letterSpacing: "-0.01em",
                }}
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </button>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
                    <Lock className="h-4 w-4 text-emerald-300" />
                    No custody
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">Tyvera does not take custody of funds, keys, or seed phrases.</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
                    <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                    Approval required
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">Every execution-like step still requires your explicit wallet approval.</p>
                </div>
              </div>

              <p className="px-1 text-[11px] leading-relaxed text-slate-600">
                Read-only connection first. You remain in control of signing and final submission at every step.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
