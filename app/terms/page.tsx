"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: "#070a12" }}>
      {/* Navigation */}
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

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto px-8 py-16"
      >
        {/* Header */}
        <div className="mb-12">
          <h1
            className="text-white font-bold mb-3"
            style={{ fontSize: "36px", letterSpacing: "-0.02em" }}
          >
            Terms of Service
          </h1>
          <p className="text-slate-400">Last updated April 2026</p>
        </div>

        {/* Body text */}
        <div className="space-y-8 text-slate-300">
          {/* Intro */}
          <section>
            <p className="leading-relaxed">
              By using Tyvera, you agree to these Terms of Service. Tyvera is provided "as-is" for educational and
              informational purposes only. Please read carefully.
            </p>
          </section>

          {/* Not Financial Advice */}
          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Not Financial Advice
            </h2>
            <p className="text-sm leading-relaxed">
              Tyvera and its recommendations are for informational purposes only. Nothing herein constitutes
              investment advice, financial advice, tax advice, or a solicitation to buy or sell any asset. The
              information provided is subject to change without notice. You are solely responsible for your
              investment decisions. Consult a professional advisor before making financial decisions.
            </p>
          </section>

          {/* Non-Custodial */}
          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Non-Custodial Platform
            </h2>
            <p className="text-sm leading-relaxed">
              Tyvera never accesses, holds, or executes transactions with your wallet. Your private keys remain
              fully in your control. We make recommendations, but you approve every on-chain transaction using your
              own wallet extension. We cannot access, reverse, or modify transactions.
            </p>
          </section>

          {/* No Guarantees */}
          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              No Guarantees
            </h2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                <strong className="text-white">Subnet Yields</strong>
                <br />
                Yields on Bittensor subnets vary continuously based on validator set, demand, and network dynamics.
                Historical yield is not indicative of future results. We provide no guarantee on any subnet's APR or
                income.
              </p>
              <p>
                <strong className="text-white">Recommendations</strong>
                <br />
                Our recommendation engine is a tool to surface opportunities. We make no guarantee of profitability,
                risk reduction, or accuracy. Past recommendations do not guarantee future performance.
              </p>
              <p>
                <strong className="text-white">Platform Availability</strong>
                <br />
                Tyvera is provided on an "as-is" basis. We make no warranty regarding uptime, accuracy of data, or
                freedom from errors. Use at your own risk.
              </p>
            </div>
          </section>

          {/* TAO Payments */}
          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              TAO Payments & Premium
            </h2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                <strong className="text-white">Final & Irreversible</strong>
                <br />
                All TAO payments for premium access are final. Due to the nature of blockchain transactions, payments
                cannot be reversed, refunded, or recalled once confirmed on-chain. You assume all responsibility for
                transaction accuracy.
              </p>
              <p>
                <strong className="text-white">No Refunds</strong>
                <br />
                We do not offer refunds for premium subscriptions or any service purchased. Payment is considered
                final upon on-chain confirmation.
              </p>
              <p>
                <strong className="text-white">Cancellation</strong>
                <br />
                You can stop using Tyvera at any time. Existing premium periods are not refunded.
              </p>
            </div>
          </section>

          {/* User Responsibility */}
          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Your Responsibility
            </h2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                You agree to:
              </p>
              <ul className="space-y-2 ml-4">
                <li>Use Tyvera solely for legitimate purposes.</li>
                <li>Not attempt to abuse, reverse-engineer, or disrupt the platform.</li>
                <li>Verify all transaction details before signing in your wallet.</li>
                <li>Keep your wallet extension and private keys secure.</li>
                <li>Assume all responsibility for your staking decisions.</li>
              </ul>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Limitation of Liability
            </h2>
            <p className="text-sm leading-relaxed">
              To the maximum extent permitted by law, Tyvera and its operators are not liable for any indirect,
              incidental, special, consequential, or punitive damages — including loss of profits, data, or capital —
              arising from your use of or inability to use the platform, even if advised of such possibility.
            </p>
          </section>

          {/* Service Changes */}
          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Service Modifications
            </h2>
            <p className="text-sm leading-relaxed">
              Tyvera reserves the right to modify, suspend, or discontinue features at any time without notice. We
              may introduce fees or change pricing. Continued use after changes constitutes acceptance of the new terms.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Termination of Access
            </h2>
            <p className="text-sm leading-relaxed">
              We reserve the right to deny access to Tyvera for any reason, including suspected abuse, fraud, or
              violation of these terms. Disconnection is immediate and without refund.
            </p>
          </section>

          {/* Questions */}
          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Questions?
            </h2>
            <p className="text-sm leading-relaxed">
              For questions about these Terms, open an issue on our GitHub or reach out through the Bittensor Discord
              community.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
