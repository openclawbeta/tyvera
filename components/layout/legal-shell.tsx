"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface LegalShellProps {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}

/**
 * Shared shell for legal pages (/terms, /privacy, /risk-disclosure).
 * Uses aurora tokens so the page follows the system theme and matches the
 * landing / signup / login surface language.
 */
export function LegalShell({ title, updatedAt, children }: LegalShellProps) {
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
            <Link
              href="/"
              className="tyvera-landing-navlink inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all"
              style={{ color: "var(--aurora-sub)" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </nav>

      {/* ── CONTENT ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-3xl px-6 pb-20 pt-28 md:px-8"
      >
        <div className="mb-10">
          <div
            className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{
              color: "var(--aurora-sub)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Legal
          </div>
          <h1
            className="mb-2 font-semibold"
            style={{
              fontSize: "clamp(34px, 4.5vw, 48px)",
              letterSpacing: "-0.035em",
              color: "var(--aurora-ink)",
              lineHeight: 1.05,
            }}
          >
            {title}
          </h1>
          <p className="text-[13px]" style={{ color: "var(--aurora-sub)" }}>
            Last updated {updatedAt}
          </p>
        </div>

        <div className="legal-prose flex flex-col gap-8">{children}</div>
      </motion.div>

      {/* Scoped prose styles — lets us keep content JSX minimal */}
      <style jsx global>{`
        .legal-prose section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .legal-prose h2 {
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--aurora-ink);
        }
        .legal-prose p,
        .legal-prose li {
          font-size: 14px;
          line-height: 1.65;
          color: var(--aurora-sub);
        }
        .legal-prose strong {
          color: var(--aurora-ink);
          font-weight: 600;
        }
        .legal-prose ul {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          padding-left: 1rem;
          list-style: disc;
        }
        .legal-prose a {
          color: #5b3fbf;
          text-decoration: underline;
          text-decoration-style: dotted;
          text-underline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
