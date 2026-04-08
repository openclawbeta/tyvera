"use client";

import { Wallet, CreditCard, ArrowRight, ExternalLink, Clock, Shield, CheckCircle2, Construction } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui-custom/fade-in";

const PLAN_STATUS = {
  tier: "Explorer",
  status: "Free",
  walletConnected: false,
} as const;

const ROADMAP_PHASES = [
  {
    phase: "Phase 1",
    label: "Free Explorer tier",
    status: "live" as const,
    detail: "Subnet explorer, heatmap, basic alerts, and static data access.",
  },
  {
    phase: "Phase 2",
    label: "Paid tiers launch",
    status: "building" as const,
    detail: "Analyst, Strategist, and Institutional tiers with on-chain TAO payments.",
  },
  {
    phase: "Phase 3",
    label: "API keys and webhooks",
    status: "planned" as const,
    detail: "Programmatic access with rate-limited API keys and event webhooks.",
  },
  {
    phase: "Phase 4",
    label: "Team accounts",
    status: "planned" as const,
    detail: "Multi-seat access, shared dashboards, and white-label options.",
  },
];

function StatusDot({ status }: { status: "live" | "building" | "planned" }) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: "0 0 4px rgba(52,211,153,0.6)" }} />
        Live
      </span>
    );
  }
  if (status === "building") {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
        <Construction className="w-3 h-3" />
        Building
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
      <Clock className="w-3 h-3" />
      Planned
    </span>
  );
}

export default function BillingPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-7">
      <PageHeader
        title="Billing & Account"
        subtitle="Your subscription status and payment history"
      />

      {/* Current plan card */}
      <FadeIn>
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-1">Current Plan</h3>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-white">{PLAN_STATUS.tier}</span>
                <span
                  className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: "rgba(52,211,153,0.08)",
                    border: "1px solid rgba(52,211,153,0.18)",
                    color: "#34d399",
                  }}
                >
                  {PLAN_STATUS.status}
                </span>
              </div>
            </div>
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(34,211,238,0.06)",
                border: "1px solid rgba(34,211,238,0.12)",
              }}
            >
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
          </div>

          {/* Wallet status */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Wallet className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-400">
              {PLAN_STATUS.walletConnected
                ? "Wallet connected"
                : "No wallet connected \u2014 connect to manage subscriptions"}
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-xs font-medium px-4 py-2.5 rounded-xl transition-all hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(6,182,212,0.06))",
                border: "1px solid rgba(34,211,238,0.2)",
                color: "#22d3ee",
              }}
            >
              <CreditCard className="w-3.5 h-3.5" />
              View plans & pricing
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/developers"
              className="inline-flex items-center gap-2 text-xs font-medium px-4 py-2.5 rounded-xl transition-all hover:brightness-110"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#94a3b8",
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              API & developer portal
            </Link>
          </div>
        </div>
      </FadeIn>

      {/* What's included in Explorer */}
      <FadeIn>
        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.018)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Included in Explorer (Free)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              "Subnet explorer & search",
              "Heatmap view",
              "Basic network alerts",
              "7-day yield history",
              "Metagraph viewer (top 20)",
              "Static data snapshots",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5 text-xs text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60 flex-shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Subscription roadmap */}
      <FadeIn>
        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.018)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h3 className="text-sm font-semibold text-slate-300 mb-5">Subscription Roadmap</h3>
          <StaggerContainer className="space-y-4">
            {ROADMAP_PHASES.map((phase) => (
              <StaggerItem key={phase.phase}>
                <div
                  className="flex items-start gap-4 px-4 py-3.5 rounded-xl"
                  style={{
                    background: phase.status === "live" ? "rgba(52,211,153,0.03)" : "rgba(255,255,255,0.015)",
                    border: `1px solid ${phase.status === "live" ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.04)"}`,
                  }}
                >
                  <div className="pt-0.5 flex-shrink-0">
                    <span
                      className="text-[10px] font-bold text-slate-600 uppercase tracking-wider"
                    >
                      {phase.phase}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-xs font-semibold text-slate-300">{phase.label}</span>
                      <StatusDot status={phase.status} />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{phase.detail}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </FadeIn>

      {/* Payment info */}
      <FadeIn>
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{
            background: "rgba(255,255,255,0.012)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <CreditCard className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <p className="text-[11px] text-slate-500">
            All paid subscriptions will be settled on-chain in TAO. No credit card required.
            Prices recalculated weekly based on TAO/USD rate.
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
