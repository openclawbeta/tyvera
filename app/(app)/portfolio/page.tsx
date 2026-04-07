"use client";

import { Wallet, TrendingUp, ArrowRight, Construction } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/ui-custom/fade-in";

export default function PortfolioPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-7">
      <PageHeader
        title="Portfolio"
        subtitle="Your staked TAO positions and performance"
      />

      {/* Honest placeholder label */}
      <FadeIn>
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: "rgba(251,191,36,0.04)",
            border: "1px solid rgba(251,191,36,0.14)",
          }}
        >
          <Construction className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-[12px] text-slate-400">
            <span className="font-semibold text-amber-300">Under Construction.</span>{" "}
            This page is a preview of an upcoming feature. No live data is displayed.
          </p>
        </div>
      </FadeIn>

      <FadeIn>
        <div
          className="rounded-2xl relative overflow-hidden text-center py-16 px-8"
          style={{
            background: "linear-gradient(145deg, rgba(34,211,238,0.04) 0%, rgba(6,182,212,0.02) 60%, rgba(255,255,255,0.012) 100%)",
            border: "1px solid rgba(34,211,238,0.12)",
            boxShadow: "0 0 48px rgba(34,211,238,0.03), inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.25)",
          }}
        >
          {/* Icon */}
          <div
            className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(34,211,238,0.1), rgba(6,182,212,0.05))",
              border: "1px solid rgba(34,211,238,0.18)",
            }}
          >
            <Wallet className="w-6 h-6 text-cyan-400" />
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">
            Connect Your Wallet
          </h2>

          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
            Portfolio tracking is coming soon. Connect a Bittensor wallet to see
            your staked positions, earnings history, and personalized recommendations.
          </p>

          {/* Feature preview */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {["Staking positions", "Earnings history", "Yield tracking", "Reallocation tools"].map((feature) => (
              <span
                key={feature}
                className="text-[11px] font-medium px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(34,211,238,0.05)",
                  border: "1px solid rgba(34,211,238,0.1)",
                  color: "rgba(34,211,238,0.65)",
                }}
              >
                <TrendingUp className="w-3 h-3 inline mr-1 -mt-0.5" />
                {feature}
              </span>
            ))}
          </div>

          {/* CTA */}
          <a
            href="/subnets"
            className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl transition-all hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(6,182,212,0.06))",
              border: "1px solid rgba(34,211,238,0.2)",
              color: "#22d3ee",
            }}
          >
            Explore subnets
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </FadeIn>
    </div>
  );
}
