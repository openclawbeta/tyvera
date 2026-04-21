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
} from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const FEATURE_LIST = [
  {
    icon: Network,
    bg: "#E4DBFF",
    bdr: "#C9B8FF",
    accent: "#5B3FBF",
    text: "Live analytics on all 128+ Bittensor subnets",
  },
  {
    icon: Lightbulb,
    bg: "#FFE5D0",
    bdr: "#FFD7BA",
    accent: "#B65A17",
    text: "Risk-adjusted recommendations with full rationale",
  },
  {
    icon: Wallet,
    bg: "#E5F7EE",
    bdr: "#A7F0D2",
    accent: "#0B8F5A",
    text: "Assisted reallocation — you sign, we never execute",
  },
  {
    icon: BarChart2,
    bg: "#FFF6DC",
    bdr: "#F0D890",
    accent: "#B88A00",
    text: "Portfolio tracking, yield history, and concentration metrics",
  },
];

const TRUST_NOTES = [
  "Read-only until you explicitly approve a move.",
  "No seed phrase handling. No private key custody.",
  "Tyvera prepares intelligence — never silent execution.",
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
    <div
      className="tyvera-landing min-h-screen"
      style={{ background: "var(--aurora-cream)", color: "var(--aurora-ink)" }}
    >
      {/* ── NAV ── */}
      <nav
        className="tyvera-landing-nav fixed inset-x-0 top-0 z-50 flex h-16 items-center backdrop-blur"
        style={{ borderBottom: "1px solid var(--aurora-hair)" }}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, #C9B8FF 0%, #FFD7BA 50%, #A7F0D2 100%)",
              }}
            >
              <Zap
                className="h-4 w-4"
                style={{ color: "var(--aurora-ink)" }}
                strokeWidth={2.5}
              />
            </div>
            <span
              className="font-semibold"
              style={{ color: "var(--aurora-ink)", letterSpacing: "-0.02em" }}
            >
              Tyvera
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <div className="hidden items-center gap-1 lg:flex">
              <Link
                href="/subnets"
                className="tyvera-landing-navlink rounded-full px-4 py-2 text-[13px] font-medium transition-all"
                style={{ color: "var(--aurora-sub)" }}
              >
                Subnets
              </Link>
              <Link
                href="/pricing"
                className="tyvera-landing-navlink rounded-full px-4 py-2 text-[13px] font-medium transition-all"
                style={{ color: "var(--aurora-sub)" }}
              >
                Pricing
              </Link>
              <Link
                href="/developers"
                className="tyvera-landing-navlink rounded-full px-4 py-2 text-[13px] font-medium transition-all"
                style={{ color: "var(--aurora-sub)" }}
              >
                Developers
              </Link>
            </div>
            <div className="ml-1">
              <ThemeToggle size="sm" />
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO / GRID ── */}
      <section className="relative overflow-hidden px-6 pb-20 pt-28 md:px-8 aurora-bg noise">
        <div className="mx-auto grid max-w-7xl gap-10 xl:grid-cols-[1.02fr_0.98fr] xl:items-start xl:gap-14">
          {/* ── LEFT: pitch ── */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mb-8 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 chip"
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse-dot"
                style={{ background: "#0B8F5A" }}
              />
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{
                  color: "var(--aurora-sub)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                Free to start — non-custodial
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
              className="mb-6 max-w-3xl font-semibold leading-[1.02]"
              style={{
                fontSize: "clamp(38px, 5.4vw, 60px)",
                letterSpacing: "-0.035em",
                color: "var(--aurora-ink)",
              }}
            >
              <span className="block">Connect your wallet.</span>
              <span className="block serif" style={{ color: "var(--aurora-sub)" }}>
                See where TAO should be staked.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="mb-10 max-w-xl text-[16px] leading-relaxed md:text-[17px]"
              style={{ color: "var(--aurora-sub)", letterSpacing: "-0.005em" }}
            >
              No email, no password, no custody. Connect a Bittensor-compatible
              wallet and you&rsquo;re in the Tyvera workspace — personalized
              rankings, portfolio visibility, and review-based allocation
              workflows.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.22 }}
              className="mb-10 grid gap-3 sm:grid-cols-3"
            >
              {[
                ["Instant", "Wallet-native, no signup form"],
                ["Read-only", "Browse before you approve"],
                ["You sign", "Every execution needs your key"],
              ].map(([title, sub]) => (
                <div key={title} className="glass px-4 py-4">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: "var(--aurora-ink)" }}
                  >
                    {title}
                  </div>
                  <div
                    className="mt-1 text-xs"
                    style={{ color: "var(--aurora-sub)" }}
                  >
                    {sub}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Feature list */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="glass-lg aurora-soft p-6"
            >
              <div
                className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{
                  color: "var(--aurora-sub)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                Included from the start
              </div>
              <div className="flex flex-col gap-3">
                {FEATURE_LIST.map(({ icon: Icon, bg, bdr, accent, text }) => (
                  <div key={text} className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: bg, border: `1px solid ${bdr}` }}
                    >
                      <Icon
                        className="h-4 w-4"
                        style={{ color: accent }}
                      />
                    </div>
                    <span
                      className="pt-1 text-[14px] leading-relaxed"
                      style={{ color: "var(--aurora-ink)" }}
                    >
                      {text}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="mt-6 border-t pt-5"
                style={{ borderColor: "var(--aurora-hair)" }}
              >
                <div
                  className="mb-2 flex items-center gap-2 text-[13px] font-semibold"
                  style={{ color: "var(--aurora-ink)" }}
                >
                  <Shield className="h-4 w-4" style={{ color: "#0B8F5A" }} />
                  Trust boundary
                </div>
                <ul className="flex flex-col gap-1.5">
                  {TRUST_NOTES.map((text) => (
                    <li
                      key={text}
                      className="text-[12px] leading-relaxed"
                      style={{ color: "var(--aurora-sub)" }}
                    >
                      · {text}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>

          {/* ── RIGHT: connect card ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="w-full xl:sticky xl:top-24"
          >
            <div className="glass-lg aurora-soft p-7 md:p-8">
              <div
                className="mb-6 flex items-start justify-between border-b pb-5"
                style={{ borderColor: "var(--aurora-hair)" }}
              >
                <div>
                  <div
                    className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                    style={{
                      color: "var(--aurora-sub)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    Wallet access
                  </div>
                  <h2
                    className="mt-2 text-[24px] font-semibold tracking-[-0.03em]"
                    style={{ color: "var(--aurora-ink)" }}
                  >
                    Connect your wallet
                  </h2>
                  <p
                    className="mt-2 max-w-sm text-[13px] leading-relaxed"
                    style={{ color: "var(--aurora-sub)" }}
                  >
                    No separate signup. Supported: Polkadot.js and Talisman.
                  </p>
                </div>
                <div className="tag-violet shrink-0">Non-custodial</div>
              </div>

              {/* What happens next */}
              <div
                className="mb-5 rounded-2xl p-4"
                style={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--aurora-hair)",
                }}
              >
                <div
                  className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{
                    color: "var(--aurora-sub)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  What happens next
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    ["01", "Wallet connection", "Polkadot.js or Talisman establishes your workspace identity."],
                    ["02", "Read-only start", "Browse research and portfolio surfaces before approving anything."],
                    ["03", "Review-based execution", "When a workflow needs action, you review and sign it yourself."],
                  ].map(([n, title, text]) => (
                    <div key={n} className="flex items-start gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
                        style={{
                          background: "var(--surface-3)",
                          border: "1px solid var(--aurora-hair)",
                          color: "#5B3FBF",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {n}
                      </div>
                      <div>
                        <div
                          className="text-[13px] font-semibold"
                          style={{
                            color: "var(--aurora-ink)",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {title}
                        </div>
                        <div
                          className="mt-0.5 text-[12px] leading-relaxed"
                          style={{ color: "var(--aurora-sub)" }}
                        >
                          {text}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleConnectWallet}
                className="btn-primary flex w-full items-center justify-center gap-2 text-[14px]"
                style={{ padding: "14px 24px" }}
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div
                  className="rounded-xl px-4 py-3"
                  style={{
                    background: "var(--surface-1)",
                    border: "1px solid var(--aurora-hair)",
                  }}
                >
                  <div
                    className="mb-1 flex items-center gap-2 text-[13px] font-semibold"
                    style={{ color: "var(--aurora-ink)" }}
                  >
                    <Lock className="h-4 w-4" style={{ color: "#0B8F5A" }} />
                    No custody
                  </div>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "var(--aurora-sub)" }}
                  >
                    We don&rsquo;t take custody of funds, keys, or seed phrases.
                  </p>
                </div>
                <div
                  className="rounded-xl px-4 py-3"
                  style={{
                    background: "var(--surface-1)",
                    border: "1px solid var(--aurora-hair)",
                  }}
                >
                  <div
                    className="mb-1 flex items-center gap-2 text-[13px] font-semibold"
                    style={{ color: "var(--aurora-ink)" }}
                  >
                    <CheckCircle2 className="h-4 w-4" style={{ color: "#5B3FBF" }} />
                    Approval required
                  </div>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "var(--aurora-sub)" }}
                  >
                    Every execution step still needs your explicit wallet approval.
                  </p>
                </div>
              </div>

              <p
                className="mt-5 text-[11px] leading-relaxed"
                style={{ color: "var(--aurora-sub)" }}
              >
                Read-only connection first. You remain in control of signing and
                final submission at every step.
              </p>

              <div
                className="mt-5 border-t pt-4 text-center"
                style={{ borderColor: "var(--aurora-hair)" }}
              >
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
                  style={{ color: "#5B3FBF" }}
                >
                  Compare plans <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
