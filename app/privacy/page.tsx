"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-slate-400">Last updated April 2026</p>
        </div>

        {/* Body text */}
        <div className="space-y-8 text-slate-300">
          {/* Intro */}
          <section>
            <p className="leading-relaxed">
              Tyvera ("we", "us", or "our") operates as a non-custodial subnet analysis and recommendation platform.
              This Privacy Policy explains how we handle information when you use our platform.
            </p>
          </section>

          {/* Data Collection */}
          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              What Data We Collect
            </h2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                <strong className="text-white">Wallet Address (Read-Only)</strong>
                <br />
                When you connect a wallet, we read your public blockchain address to display your subnet stakes and
                earnings. This data comes from your wallet extension (Polkadot.js, Talisman, etc.) — we never store
                or transmit your private keys or seed phrases.
              </p>
              <p>
                <strong className="text-white">No Personal Data</strong>
                <br />
                Tyvera does not require or store: your name, email, phone number, identity verification, or any
                personal identifiers. Usage of our platform is fully pseudonymous.
              </p>
            </div>
          </section>

          {/* Cookies & Analytics */}
          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Cookies & Analytics
            </h2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                <strong className="text-white">Minimal Analytics</strong>
                <br />
                We use basic analytics to measure platform usage and diagnose technical issues. No personal tracking
                cookies are used. Analytics data is anonymized and aggregated.
              </p>
              <p>
                <strong className="text-white">Browser Storage</strong>
                <br />
                Your settings and preferences are stored locally in your browser (localStorage) and never transmitted
                to our servers.
              </p>
            </div>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Third-Party Services
            </h2>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                Tyvera integrates with external APIs to provide real-time data:
              </p>
              <ul className="space-y-2 ml-4">
                <li>
                  <strong className="text-white">CoinGecko API</strong> — Subnet yield and market data. Query sent
                  as subnet ID only.
                </li>
                <li>
                  <strong className="text-white">TaoStats API</strong> — Historical performance metrics. Subnet
                  identifiers only.
                </li>
                <li>
                  <strong className="text-white">Bittensor Blockchain</strong> — Public read-only queries for staking
                  information.
                </li>
              </ul>
              <p className="mt-3">
                We do not share your wallet address with these services. Requests are made client-side from your
                browser.
              </p>
            </div>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Data Retention
            </h2>
            <p className="text-sm leading-relaxed">
              Tyvera stores no persistent user data on our servers. All data is ephemeral — generated in your browser
              session and cleared when you disconnect or leave the platform.
            </p>
          </section>

          {/* No Data Sales */}
          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              No Data Sales
            </h2>
            <p className="text-sm leading-relaxed">
              We do not sell, trade, or share your information with third parties for marketing, advertising, or any
              other purpose. Your data is yours alone.
            </p>
          </section>

          {/* Non-Custodial Nature */}
          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Non-Custodial Platform
            </h2>
            <p className="text-sm leading-relaxed">
              Tyvera is a read-and-recommend tool only. We never access, hold, or execute transactions with your
              wallet. Your private keys remain fully in your control at all times. Every on-chain action requires
              your explicit approval through your wallet extension.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-white font-semibold mb-3" style={{ fontSize: "18px" }}>
              Questions?
            </h2>
            <p className="text-sm leading-relaxed">
              For questions about this Privacy Policy, open an issue on our GitHub or contact us through our
              official channels on the Bittensor Discord.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
