import type { Metadata } from "next";
import { LegalShell } from "@/components/layout/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Tyvera Privacy Policy. We are non-custodial, we don't store personal data, and we don't share your wallet address with third parties.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updatedAt="April 2026">
      <section>
        <p>
          Tyvera (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;)
          operates as a non-custodial subnet analysis and recommendation
          platform. This Privacy Policy explains how we handle information when
          you use our platform.
        </p>
      </section>

      <section>
        <h2>What Data We Collect</h2>
        <p>
          <strong>Wallet Address (Read-Only).</strong> When you connect a
          wallet, we read your public blockchain address to display your subnet
          stakes and earnings. This data comes from your wallet extension
          (Polkadot.js, Talisman, etc.) — we never store or transmit your
          private keys or seed phrases.
        </p>
        <p>
          <strong>No Personal Data.</strong> Tyvera does not require or store:
          your name, email, phone number, identity verification, or any
          personal identifiers. Usage of our platform is fully pseudonymous.
        </p>
      </section>

      <section>
        <h2>Cookies &amp; Analytics</h2>
        <p>
          <strong>Minimal Analytics.</strong> We use basic analytics to measure
          platform usage and diagnose technical issues. No personal tracking
          cookies are used. Analytics data is anonymized and aggregated.
        </p>
        <p>
          <strong>Browser Storage.</strong> Your settings and preferences are
          stored locally in your browser (localStorage) and never transmitted
          to our servers.
        </p>
      </section>

      <section>
        <h2>Third-Party Services</h2>
        <p>Tyvera integrates with external APIs to provide real-time data:</p>
        <ul>
          <li>
            <strong>Bittensor Subtensor RPC</strong> — Public read-only queries
            for subnet metrics, emissions, and staking information.
          </li>
          <li>
            <strong>TaoStats API</strong> — Historical performance metrics.
            Subnet identifiers only.
          </li>
          <li>
            <strong>CoinGecko API</strong> — TAO/USD pricing for display.
          </li>
        </ul>
        <p>
          We do not share your wallet address with these services. Requests are
          scoped to subnet identifiers or pricing only.
        </p>
      </section>

      <section>
        <h2>Data Retention</h2>
        <p>
          For free-tier usage, Tyvera stores no persistent personal data on our
          servers. For paid plans, we store only what is strictly needed to
          service your subscription (wallet address, plan tier, payment
          receipts). No identity, contact, or browsing data is retained.
        </p>
      </section>

      <section>
        <h2>No Data Sales</h2>
        <p>
          We do not sell, trade, or share your information with third parties
          for marketing, advertising, or any other purpose. Your data is yours
          alone.
        </p>
      </section>

      <section>
        <h2>Non-Custodial Platform</h2>
        <p>
          Tyvera is a read-and-recommend tool only. We never access, hold, or
          execute transactions with your wallet. Your private keys remain fully
          in your control at all times. Every on-chain action requires your
          explicit approval through your wallet extension.
        </p>
      </section>

      <section>
        <h2>Questions?</h2>
        <p>
          For questions about this Privacy Policy, email us at{" "}
          <a href="mailto:tyvera.ai@gmail.com">tyvera.ai@gmail.com</a>.
        </p>
      </section>
    </LegalShell>
  );
}
