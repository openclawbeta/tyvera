import type { Metadata } from "next";
import { LegalShell } from "@/components/layout/legal-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Tyvera Terms of Service. Tyvera is an informational, non-custodial platform. Read the terms before using the service.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updatedAt="April 2026">
      <section>
        <p>
          By using Tyvera, you agree to these Terms of Service. Tyvera is
          provided &ldquo;as-is&rdquo; for educational and informational
          purposes only. Please read carefully.
        </p>
      </section>

      <section>
        <h2>Not Financial Advice</h2>
        <p>
          Tyvera and its recommendations are for informational purposes only.
          Nothing herein constitutes investment advice, financial advice, tax
          advice, or a solicitation to buy or sell any asset. The information
          provided is subject to change without notice. You are solely
          responsible for your investment decisions. Consult a professional
          advisor before making financial decisions.
        </p>
      </section>

      <section>
        <h2>Non-Custodial Platform</h2>
        <p>
          Tyvera never accesses, holds, or executes transactions with your
          wallet. Your private keys remain fully in your control. We make
          recommendations, but you approve every on-chain transaction using
          your own wallet extension. We cannot access, reverse, or modify
          transactions.
        </p>
      </section>

      <section>
        <h2>No Guarantees</h2>
        <p>
          <strong>Subnet Yields.</strong> Yields on Bittensor subnets vary
          continuously based on validator set, demand, and network dynamics.
          Historical yield is not indicative of future results. We provide no
          guarantee on any subnet&rsquo;s APR or income.
        </p>
        <p>
          <strong>Recommendations.</strong> Our recommendation engine is a tool
          to surface opportunities. We make no guarantee of profitability, risk
          reduction, or accuracy. Past recommendations do not guarantee future
          performance.
        </p>
        <p>
          <strong>Platform Availability.</strong> Tyvera is provided on an
          &ldquo;as-is&rdquo; basis. We make no warranty regarding uptime,
          accuracy of data, or freedom from errors. Use at your own risk.
        </p>
      </section>

      <section>
        <h2>TAO Payments &amp; Premium</h2>
        <p>
          <strong>Final &amp; Irreversible.</strong> All TAO payments for
          premium access are final. Due to the nature of blockchain
          transactions, payments cannot be reversed, refunded, or recalled once
          confirmed on-chain. You assume all responsibility for transaction
          accuracy.
        </p>
        <p>
          <strong>No Refunds.</strong> We do not offer refunds for premium
          subscriptions or any service purchased. Payment is considered final
          upon on-chain confirmation.
        </p>
        <p>
          <strong>Cancellation.</strong> You can stop using Tyvera at any time.
          Existing premium periods are not refunded.
        </p>
      </section>

      <section>
        <h2>Your Responsibility</h2>
        <p>You agree to:</p>
        <ul>
          <li>Use Tyvera solely for legitimate purposes.</li>
          <li>Not attempt to abuse, reverse-engineer, or disrupt the platform.</li>
          <li>Verify all transaction details before signing in your wallet.</li>
          <li>Keep your wallet extension and private keys secure.</li>
          <li>Assume all responsibility for your staking decisions.</li>
        </ul>
      </section>

      <section>
        <h2>Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Tyvera and its operators are
          not liable for any indirect, incidental, special, consequential, or
          punitive damages — including loss of profits, data, or capital —
          arising from your use of or inability to use the platform, even if
          advised of such possibility.
        </p>
      </section>

      <section>
        <h2>Service Modifications</h2>
        <p>
          Tyvera reserves the right to modify, suspend, or discontinue features
          at any time without notice. We may introduce fees or change pricing.
          Continued use after changes constitutes acceptance of the new terms.
        </p>
      </section>

      <section>
        <h2>Termination of Access</h2>
        <p>
          We reserve the right to deny access to Tyvera for any reason,
          including suspected abuse, fraud, or violation of these terms.
          Disconnection is immediate and without refund.
        </p>
      </section>

      <section>
        <h2>Questions?</h2>
        <p>
          For questions about these Terms, email us at{" "}
          <a href="mailto:tyvera.ai@gmail.com">tyvera.ai@gmail.com</a>.
        </p>
      </section>
    </LegalShell>
  );
}
