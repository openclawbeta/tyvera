import type { Metadata } from "next";
import { LegalShell } from "@/components/layout/legal-shell";

export const metadata: Metadata = {
  title: "Risk Disclosure",
  description:
    "Risks of participating in Bittensor subnet staking via Tyvera. Tyvera does not provide investment advice or guarantee outcomes.",
  alternates: { canonical: "/risk-disclosure" },
};

export default function RiskDisclosurePage() {
  return (
    <LegalShell title="Risk Disclosure" updatedAt="April 2026">
      <section>
        <p>
          Tyvera provides analytics, rankings, and workflow support for
          Bittensor participants. It does not provide investment advice,
          guarantee outcomes, or eliminate the risks of digital asset
          participation. You remain solely responsible for every decision you
          make and every transaction you approve.
        </p>
      </section>

      <section>
        <h2>Not Investment, Legal, or Tax Advice</h2>
        <p>
          Nothing on Tyvera should be interpreted as investment advice, legal
          advice, tax advice, portfolio management, or a recommendation to buy,
          sell, stake, unstake, or reallocate digital assets. Analytics,
          scores, rankings, and recommendations are informational only.
        </p>
      </section>

      <section>
        <h2>Digital Asset and Network Risk</h2>
        <p>
          Bittensor participation involves substantial risk, including loss of
          capital, reduced yield, slashing-like economic outcomes, liquidity
          constraints, market volatility, validator behavior changes, and
          protocol-level changes.
        </p>
        <p>
          Subnet conditions can change quickly. Metrics such as emissions,
          liquidity, momentum, and relative yield may become outdated or
          reverse without notice.
        </p>
      </section>

      <section>
        <h2>No Guarantee of Accuracy or Performance</h2>
        <p>
          Tyvera may rely on direct chain queries, cached snapshots, third-party
          market data, heuristics, and derived scoring models. Data may be
          delayed, incomplete, unavailable, or incorrect. Historical
          performance, rankings, and model outputs do not guarantee future
          results.
        </p>
      </section>

      <section>
        <h2>User-Approved Execution Only</h2>
        <p>
          Tyvera is designed around user-approved actions. You are responsible
          for reviewing wallet prompts, destination details, memos, amounts,
          and transaction consequences before signing. If you approve a
          transaction, you accept full responsibility for it.
        </p>
      </section>

      <section>
        <h2>Non-Custodial Responsibility</h2>
        <p>
          Tyvera does not hold your private keys or custody your assets. That
          also means Tyvera cannot recover lost keys, reverse blockchain
          transactions, or undo mistakes made from your wallet or device.
        </p>
      </section>

      <section>
        <h2>Payment and Subscription Risk</h2>
        <p>
          Blockchain payments are generally irreversible. If you send funds to
          the wrong address, omit a required memo, or otherwise submit an
          incorrect payment, recovery may be impossible. Premium access, if
          offered, may depend on successful payment detection and system
          availability.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about this disclosure can be sent to{" "}
          <a href="mailto:tyvera.ai@gmail.com">tyvera.ai@gmail.com</a>.
        </p>
      </section>
    </LegalShell>
  );
}
