"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export default function RiskDisclosurePage() {
  return (
    <div className="min-h-screen" style={{ background: "#070a12" }}>
      <nav className="border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="max-w-3xl mx-auto px-8 py-6 flex items-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium transition-colors duration-150 hover:text-slate-300"
            style={{ color: "#94a3b8" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto px-8 py-16"
      >
        <div className="mb-12">
          <h1 className="text-white font-bold mb-3" style={{ fontSize: "36px", letterSpacing: "-0.02em" }}>
            Risk Disclosure
          </h1>
          <p className="text-slate-400">Last updated April 2026</p>
        </div>

        <div className="space-y-8 text-slate-300">
          <section>
            <p className="leading-relaxed">
              Tyvera provides analytics, rankings, and workflow support for Bittensor participants. It does not provide
              investment advice, guarantee outcomes, or eliminate the risks of digital asset participation. You remain
              solely responsible for every decision you make and every transaction you approve.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Not Investment, Legal, or Tax Advice
            </h2>
            <p className="text-sm leading-relaxed">
              Nothing on Tyvera should be interpreted as investment advice, legal advice, tax advice, portfolio
              management, or a recommendation to buy, sell, stake, unstake, or reallocate digital assets. Analytics,
              scores, rankings, and recommendations are informational only.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Digital Asset and Network Risk
            </h2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>Bittensor participation involves substantial risk, including loss of capital, reduced yield, slashing-like economic outcomes, liquidity constraints, market volatility, validator behavior changes, and protocol-level changes.</p>
              <p>Subnet conditions can change quickly. Metrics such as emissions, liquidity, momentum, and relative yield may become outdated or reverse without notice.</p>
            </div>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              No Guarantee of Accuracy or Performance
            </h2>
            <p className="text-sm leading-relaxed">
              Tyvera may rely on direct chain queries, cached snapshots, third-party market data, heuristics, and derived
              scoring models. Data may be delayed, incomplete, unavailable, or incorrect. Historical performance,
              rankings, and model outputs do not guarantee future results.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              User-Approved Execution Only
            </h2>
            <p className="text-sm leading-relaxed">
              Tyvera is designed around user-approved actions. You are responsible for reviewing wallet prompts,
              destination details, memos, amounts, and transaction consequences before signing. If you approve a
              transaction, you accept full responsibility for it.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Non-Custodial Responsibility
            </h2>
            <p className="text-sm leading-relaxed">
              Tyvera does not hold your private keys or custody your assets. That also means Tyvera cannot recover lost
              keys, reverse blockchain transactions, or undo mistakes made from your wallet or device.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Payment and Subscription Risk
            </h2>
            <p className="text-sm leading-relaxed">
              Blockchain payments are generally irreversible. If you send funds to the wrong address, omit a required
              memo, or otherwise submit an incorrect payment, recovery may be impossible. Premium access, if offered,
              may depend on successful payment detection and system availability.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Contact
            </h2>
            <p className="text-sm leading-relaxed">
              Questions about this disclosure can be sent to <a className="text-cyan-300 hover:underline" href="mailto:tyvera.ai@gmail.com">tyvera.ai@gmail.com</a>.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
