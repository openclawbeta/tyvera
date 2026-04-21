"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, ArrowRight, Shield, Wallet, Lock, Eye } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { WalletConnectModal } from "@/components/wallet/wallet-connect-modal";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const TRUST_ITEMS = [
  { icon: Shield, text: "No seed phrase storage", sub: "We never see your private keys." },
  { icon: Eye, text: "You approve every move", sub: "Nothing executes without your signature." },
  { icon: Lock, text: "Non-custodial, end-to-end", sub: "Your wallet, your funds, your control." },
];

export default function LoginPage() {
  const router = useRouter();
  const { walletState, openModal } = useWallet();

  useEffect(() => {
    if (walletState === "connected" || walletState === "verified") {
      router.push("/dashboard");
    }
  }, [walletState, router]);

  const isIdle = walletState === "disconnected";
  const isConnecting = walletState === "connecting";

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
                href="/signup"
                className="tyvera-landing-navlink rounded-full px-4 py-2 text-[13px] font-medium transition-all"
                style={{ color: "var(--aurora-sub)" }}
              >
                New here?
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
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_440px] lg:gap-14">
          {/* ── LEFT: brand / trust ── */}
          <div className="hidden lg:block">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 chip"
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
                Welcome back
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="mb-6 font-semibold leading-[1.04]"
              style={{
                fontSize: "clamp(38px, 5vw, 56px)",
                letterSpacing: "-0.035em",
                color: "var(--aurora-ink)",
              }}
            >
              Sign back in with
              <span className="block serif" style={{ color: "var(--aurora-sub)" }}>
                your Bittensor wallet.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="mb-8 max-w-xl text-[15px] leading-relaxed"
              style={{ color: "var(--aurora-sub)" }}
            >
              Your workspace is keyed off your wallet address — no passwords to
              reset, no email to verify. Connect the same wallet you used to
              sign up and you&rsquo;re back in.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 }}
              className="glass-lg aurora-soft p-6"
            >
              <div className="flex flex-col gap-4">
                {TRUST_ITEMS.map(({ icon: Icon, text, sub }) => (
                  <div key={text} className="flex items-start gap-3">
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "#E5F7EE", border: "1px solid #A7F0D2" }}
                    >
                      <Icon className="h-4 w-4" style={{ color: "#0B8F5A" }} />
                    </div>
                    <div>
                      <p
                        className="text-[14px] font-semibold"
                        style={{
                          color: "var(--aurora-ink)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {text}
                      </p>
                      <p
                        className="mt-0.5 text-[12px]"
                        style={{ color: "var(--aurora-sub)" }}
                      >
                        {sub}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── RIGHT: auth card ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
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
                    Sign in
                  </div>
                  <h2
                    className="mt-2 text-[22px] font-semibold tracking-[-0.03em]"
                    style={{ color: "var(--aurora-ink)" }}
                  >
                    Welcome back
                  </h2>
                  <p
                    className="mt-2 max-w-sm text-[13px] leading-relaxed"
                    style={{ color: "var(--aurora-sub)" }}
                  >
                    Connect the wallet you signed up with.
                  </p>
                </div>
                <div className="tag-violet shrink-0">Non-custodial</div>
              </div>

              <div className="flex flex-col gap-4">
                {isIdle && (
                  <>
                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: "var(--surface-1)",
                        border: "1px solid var(--aurora-hair)",
                      }}
                    >
                      <p
                        className="text-[12px] leading-relaxed"
                        style={{ color: "var(--aurora-sub)" }}
                      >
                        Polkadot.js, SubWallet, or Talisman all work.
                      </p>
                    </div>

                    <button
                      onClick={openModal}
                      className="btn-primary flex w-full items-center justify-center gap-2 text-[14px]"
                      style={{ padding: "14px 24px" }}
                    >
                      <Wallet className="h-4 w-4" />
                      Connect Wallet
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <div className="flex flex-wrap gap-2">
                      {["Polkadot.js", "SubWallet", "Talisman"].map((wallet) => (
                        <span
                          key={wallet}
                          className="rounded-full px-2.5 py-1 text-[10px] font-medium"
                          style={{
                            background: "var(--surface-1)",
                            border: "1px solid var(--aurora-hair)",
                            color: "var(--aurora-sub)",
                          }}
                        >
                          {wallet}
                        </span>
                      ))}
                    </div>

                    <div
                      className="text-[11px]"
                      style={{ color: "var(--aurora-sub)" }}
                    >
                      Don&rsquo;t have a wallet yet?{" "}
                      <a
                        href="https://polkadot.js.org/extension/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline decoration-dotted underline-offset-2"
                        style={{ color: "#5B3FBF" }}
                      >
                        Install Polkadot.js
                      </a>
                    </div>

                    <div className="flex items-start gap-2 pt-2">
                      <Shield
                        className="mt-0.5 h-3 w-3 shrink-0"
                        style={{ color: "var(--aurora-sub)" }}
                      />
                      <p
                        className="text-[11px] leading-relaxed"
                        style={{ color: "var(--aurora-sub)" }}
                      >
                        We never access your private keys or execute
                        transactions without your approval.
                      </p>
                    </div>
                  </>
                )}

                {isConnecting && (
                  <div
                    className="flex flex-col items-center justify-center rounded-xl py-10"
                    style={{
                      background: "var(--surface-1)",
                      border: "1px solid var(--aurora-hair)",
                    }}
                  >
                    <div
                      className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
                      style={{ borderColor: "#5B3FBF", borderTopColor: "transparent" }}
                    />
                    <p
                      className="text-[13px] font-medium"
                      style={{ color: "var(--aurora-ink)" }}
                    >
                      Connecting wallet…
                    </p>
                    <p
                      className="mt-1 text-[11px]"
                      style={{ color: "var(--aurora-sub)" }}
                    >
                      Approve the connection in your extension.
                    </p>
                  </div>
                )}
              </div>

              <p
                className="mt-6 text-center text-[11px] leading-relaxed"
                style={{ color: "var(--aurora-sub)" }}
              >
                By continuing, you agree to the{" "}
                <Link
                  href="/terms"
                  className="underline decoration-dotted underline-offset-2 transition-colors"
                  style={{ color: "#5B3FBF" }}
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="underline decoration-dotted underline-offset-2 transition-colors"
                  style={{ color: "#5B3FBF" }}
                >
                  Privacy Policy
                </Link>
                .
              </p>

              <div
                className="mt-5 border-t pt-4 text-center"
                style={{ borderColor: "var(--aurora-hair)" }}
              >
                <span
                  className="text-[12px]"
                  style={{ color: "var(--aurora-sub)" }}
                >
                  New to Tyvera?{" "}
                </span>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1 text-[12px] font-semibold transition-colors"
                  style={{ color: "#5B3FBF" }}
                >
                  Create a workspace <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <WalletConnectModal />
    </div>
  );
}
