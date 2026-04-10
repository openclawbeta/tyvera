"use client";

import {
  Wallet,
  CreditCard,
  ArrowRight,
  ExternalLink,
  Clock,
  Shield,
  CheckCircle2,
  Construction,
  Zap,
  AlertTriangle,
  Receipt,
  Layers3,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui-custom/fade-in";

const PLAN_STATUS = {
  tier: "Explorer",
  status: "Free access",
  walletConnected: false,
  renewal: "No renewal scheduled",
  settlementRail: "TAO on-chain",
} as const;

const ROADMAP_PHASES = [
  {
    phase: "Phase 1",
    label: "Explorer access layer",
    status: "live" as const,
    detail: "The free product layer is active now: subnet discovery, selected analytics, and public intelligence surfaces.",
  },
  {
    phase: "Phase 2",
    label: "Paid operator plans",
    status: "building" as const,
    detail: "Analyst, Strategist, and Institutional access with on-chain settlement, clearer entitlements, and plan-aware product gating.",
  },
  {
    phase: "Phase 3",
    label: "API keys and webhook delivery",
    status: "planned" as const,
    detail: "Programmatic access for desks and advanced users with controlled rate limits and event delivery.",
  },
  {
    phase: "Phase 4",
    label: "Team and desk accounts",
    status: "planned" as const,
    detail: "Shared access, multi-wallet workflows, and broader operational controls for funds, subnet teams, and internal research groups.",
  },
];

const EXPLORER_FEATURES = [
  "Subnet explorer and ranking views",
  "Heatmap and market scanning surfaces",
  "Basic network alert visibility",
  "Selected historical yield context",
  "Public dashboard intelligence",
  "Read-only product evaluation without payment",
];

const ACCOUNT_SURFACES = [
  {
    label: "Current access",
    value: "Explorer",
    note: "Free evaluation layer",
    tone: "text-slate-200",
  },
  {
    label: "Settlement rail",
    value: "TAO",
    note: "On-chain plan settlement",
    tone: "text-cyan-300",
  },
  {
    label: "Renewal state",
    value: "Inactive",
    note: "No paid plan attached",
    tone: "text-amber-300",
  },
  {
    label: "Entitlement scope",
    value: "Read + sample tools",
    note: "Deeper workflows unlock later",
    tone: "text-emerald-300",
  },
];

const BILLING_NOTES = [
  {
    icon: Shield,
    title: "Trust before monetization",
    detail: "Tyvera should only bill for surfaces that are real, clearly gated, and aligned with actual product capability.",
  },
  {
    icon: Lock,
    title: "Non-custodial by design",
    detail: "Billing and wallet connection do not give Tyvera control over your funds. Every on-chain action still requires your explicit approval.",
  },
  {
    icon: Receipt,
    title: "Accountability layer",
    detail: "The billing surface is being shaped into an account-control center: plan state, settlement details, entitlement clarity, and later invoice history.",
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
    <div className="max-w-6xl mx-auto space-y-8">
      <PageHeader
        title="Billing & Account"
        subtitle="Plan status, entitlement direction, and the trust model behind paid access"
      />

      <FadeIn>
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div
            className="relative overflow-hidden rounded-[26px] border border-white/8 p-6 md:p-7"
            style={{
              background:
                "linear-gradient(160deg, rgba(34,211,238,0.08) 0%, rgba(79,124,255,0.045) 28%, rgba(255,255,255,0.018) 62%, rgba(255,255,255,0.012) 100%)",
              boxShadow:
                "0 24px 80px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 40px rgba(34,211,238,0.04)",
            }}
          >
            <div className="absolute right-0 top-0 h-40 w-56 pointer-events-none" style={{ background: "radial-gradient(circle at top right, rgba(34,211,238,0.14), transparent 68%)" }} />

            <div className="relative flex flex-col gap-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                    <Layers3 className="w-3 h-3" />
                    account control layer
                  </div>
                  <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white md:text-[38px]">
                    Tyvera is still in the
                    <span className="block bg-[linear-gradient(135deg,#67e8f9_0%,#4f7cff_55%,#8b5cf6_100%)] bg-clip-text text-transparent">
                      trust-first billing phase.
                    </span>
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400 md:text-[15px]">
                    You currently have Explorer access. Paid billing is being shaped around honest entitlement boundaries,
                    source-aware product behavior, and TAO-native settlement — not fake feature walls or cosmetic pricing screens.
                  </p>
                </div>

                <div className="grid w-full max-w-[280px] gap-3">
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current plan</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-2xl font-semibold tracking-tight text-white">{PLAN_STATUS.tier}</span>
                      <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                        {PLAN_STATUS.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">{PLAN_STATUS.renewal}</div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Wallet state</div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-200">
                      <Wallet className="w-4 h-4 text-slate-500" />
                      {PLAN_STATUS.walletConnected ? "Connected" : "Not connected"}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {PLAN_STATUS.walletConnected
                        ? "Ready for plan management"
                        : "Connect later to activate paid operator access"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                {ACCOUNT_SURFACES.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</div>
                    <div className={`mt-2 text-base font-semibold tracking-tight ${item.tone}`}>{item.value}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.note}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-400/15"
                >
                  <CreditCard className="w-4 h-4" />
                  View plans & pricing
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/[0.07]"
                >
                  <Shield className="w-4 h-4" />
                  Review settings
                </Link>
                <Link
                  href="/developers"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-white/[0.07] hover:text-slate-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  Developer access
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[24px] border border-white/8 bg-white/[0.025] p-5 shadow-[0_14px_50px_rgba(0,0,0,0.24)]">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" />
                current billing posture
              </div>
              <div className="mt-4 space-y-3">
                {[
                  "Explorer is the only active plan state shown on this account today.",
                  "Paid operator tiers are being built, but entitlement enforcement is still maturing.",
                  "The right behavior is honesty: no pretending premium settlement is fully live before the control path is ready.",
                ].map((line) => (
                  <div key={line} className="rounded-xl border border-white/6 bg-black/20 px-4 py-3 text-sm leading-relaxed text-slate-400">
                    {line}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-white/[0.025] p-5 shadow-[0_14px_50px_rgba(0,0,0,0.24)]">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Explorer includes</div>
              <div className="mt-4 grid gap-2.5">
                {EXPLORER_FEATURES.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="text-sm leading-relaxed text-slate-400">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn>
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.022] p-6 shadow-[0_16px_56px_rgba(0,0,0,0.26)]">
            <div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <Receipt className="w-3.5 h-3.5" />
              settlement and account notes
            </div>
            <div className="space-y-4">
              {BILLING_NOTES.map(({ icon: Icon, title, detail }) => (
                <div key={title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04]">
                      <Icon className="h-4 w-4 text-cyan-300" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold tracking-tight text-white">{title}</div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">{detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-400/12 bg-cyan-400/[0.035] px-4 py-4 text-sm leading-relaxed text-slate-400">
              <span className="font-semibold text-cyan-300">TAO-native direction.</span>{" "}
              Paid access is intended to settle on-chain in TAO, with clearer entitlement states and less ambiguity between browsing, paid research, and operational workflows.
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-white/[0.022] p-6 shadow-[0_16px_56px_rgba(0,0,0,0.26)]">
            <div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <Zap className="w-3.5 h-3.5" />
              subscription roadmap
            </div>
            <StaggerContainer className="space-y-4">
              {ROADMAP_PHASES.map((phase) => (
                <StaggerItem key={phase.phase}>
                  <div
                    className="rounded-2xl px-4 py-4"
                    style={{
                      background: phase.status === "live" ? "rgba(52,211,153,0.035)" : "rgba(255,255,255,0.018)",
                      border: `1px solid ${phase.status === "live" ? "rgba(52,211,153,0.14)" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">{phase.phase}</div>
                        <div className="mt-1 text-sm font-semibold tracking-tight text-white">{phase.label}</div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">{phase.detail}</p>
                      </div>
                      <div className="shrink-0">
                        <StatusDot status={phase.status} />
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </FadeIn>

      <FadeIn>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "What this page becomes",
              detail: "A real account-control center: plan state, payment instructions, settlement history, and entitlement clarity.",
            },
            {
              title: "Why it stays restrained",
              detail: "Billing should feel trustworthy and operational — not like an over-designed sales page pretending unfinished systems are complete.",
            },
            {
              title: "Best next action",
              detail: "Use Pricing to inspect the planned plan structure, then return here as the account and settlement path gets hardened.",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-2xl border border-white/8 bg-white/[0.022] p-5">
              <div className="text-sm font-semibold tracking-tight text-white">{card.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.detail}</p>
            </div>
          ))}
        </div>
      </FadeIn>
    </div>
  );
}
