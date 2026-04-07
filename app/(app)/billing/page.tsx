"use client";

import { Zap, Lock, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/ui-custom/fade-in";

export default function BillingPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-7">
      <PageHeader
        title="Billing"
        subtitle="Premium subscriptions paid in TAO, activated on-chain"
      />

      <FadeIn>
        <div
          className="rounded-2xl relative overflow-hidden text-center py-16 px-8"
          style={{
            background: "linear-gradient(145deg, rgba(251,191,36,0.05) 0%, rgba(245,158,11,0.02) 60%, rgba(255,255,255,0.012) 100%)",
            border: "1px solid rgba(251,191,36,0.15)",
            boxShadow: "0 0 48px rgba(251,191,36,0.04), inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.25)",
          }}
        >
          {/* Icon */}
          <div
            className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))",
              border: "1px solid rgba(251,191,36,0.2)",
            }}
          >
            <Lock className="w-6 h-6 text-amber-400" />
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">
            Premium Coming Soon
          </h2>

          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
            On-chain premium subscriptions are being built. Pay in TAO to unlock
            advanced analytics, real-time alerts, and priority API access.
          </p>

          {/* Feature preview */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {["Real-time alerts", "Advanced metagraph", "API access", "Priority support"].map((feature) => (
              <span
                key={feature}
                className="text-[11px] font-medium px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(251,191,36,0.06)",
                  border: "1px solid rgba(251,191,36,0.12)",
                  color: "rgba(251,191,36,0.7)",
                }}
              >
                <Zap className="w-3 h-3 inline mr-1 -mt-0.5" />
                {feature}
              </span>
            ))}
          </div>

          {/* CTA */}
          <a
            href="/subnets"
            className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl transition-all hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))",
              border: "1px solid rgba(251,191,36,0.25)",
              color: "#fbbf24",
            }}
          >
            Explore subnets while you wait
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </FadeIn>
    </div>
  );
}
