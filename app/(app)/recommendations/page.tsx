"use client";

import { useState } from "react";
import { Filter, Clock, CheckCircle, Wallet, Shield, AlertCircle, Radar, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { RecommendationCard } from "@/components/recommendations/recommendation-card";
import { ReviewPanel } from "@/components/recommendations/review-panel";
import { getRecommendations } from "@/lib/api/recommendations";
import { useWallet } from "@/lib/wallet-context";
import type { RecommendationUiModel as Recommendation } from "@/lib/types/recommendations";

const BANDS = [
  { dot: "#22d3ee", dotGlow: "rgba(34,211,238,0.6)", label: "Strong", range: "score ≥ 0.35" },
  { dot: "#fbbf24", dotGlow: "rgba(251,191,36,0.5)", label: "Moderate", range: "score ≥ 0.22" },
  { dot: "#64748b", dotGlow: "", label: "Mild", range: "score ≥ 0.15" },
];

function WalletBanner() {
  const { walletState, openModal, verify } = useWallet();

  if (walletState === "verified" || walletState === "pending_approval") {
    return (
      <FadeIn>
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{
            background: "rgba(52,211,153,0.04)",
            border: "1px solid rgba(52,211,153,0.14)",
          }}
        >
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
          <p className="text-[12px] text-slate-400">
            <span className="font-semibold text-emerald-300">You approve every move.</span>{" "}
            Recommendations are suggestions only. Nothing executes until you sign in your wallet.
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <Shield className="h-3 w-3 text-slate-600" />
            <span className="text-[10px] text-slate-600">Wallet verified</span>
          </div>
        </div>
      </FadeIn>
    );
  }

  if (walletState === "connected") {
    return (
      <FadeIn>
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{
            background: "rgba(251,191,36,0.04)",
            border: "1px solid rgba(251,191,36,0.18)",
          }}
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
          <p className="flex-1 text-[12px] text-slate-400">
            <span className="font-semibold text-amber-300">Wallet verification required.</span>{" "}
            Sign a one-time message to confirm ownership before submitting any moves. No TAO is spent.
          </p>
          <button
            onClick={verify}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all duration-150"
            style={{
              background: "rgba(251,191,36,0.1)",
              border: "1px solid rgba(251,191,36,0.25)",
              color: "#fbbf24",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.18)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.1)";
            }}
          >
            <Shield className="h-3 w-3" />
            Verify now
          </button>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <div
        className="flex items-center gap-4 rounded-xl px-5 py-4"
        style={{
          background: "rgba(34,211,238,0.04)",
          border: "1px solid rgba(34,211,238,0.14)",
        }}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: "rgba(34,211,238,0.1)",
            border: "1px solid rgba(34,211,238,0.2)",
          }}
        >
          <Wallet className="h-4 w-4" style={{ color: "#22d3ee" }} />
        </div>
        <div className="flex-1">
          <p className="mb-0.5 text-[13px] font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>
            Connect your wallet to execute recommendations
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Browse freely — wallet connection is only needed when you want to approve a move. Your seed phrase is never stored. You approve every transaction individually.
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-semibold transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, rgba(34,211,238,0.14) 0%, rgba(14,165,233,0.1) 100%)",
            border: "1px solid rgba(34,211,238,0.25)",
            color: "#67e8f9",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(34,211,238,0.22) 0%, rgba(14,165,233,0.16) 100%)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(34,211,238,0.38)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(34,211,238,0.14) 0%, rgba(14,165,233,0.1) 100%)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(34,211,238,0.25)";
          }}
        >
          <Wallet className="h-3.5 w-3.5" />
          Connect Wallet
        </button>
      </div>
    </FadeIn>
  );
}

export default function RecommendationsPage() {
  const recommendations = getRecommendations();
  const [selected, setSelected] = useState<Recommendation | null>(recommendations[1] ?? recommendations[0] ?? null);
  const [filterBand, setFilterBand] = useState<string>("all");

  const filteredRecs = filterBand === "all" ? recommendations : recommendations.filter((r) => r.band.toLowerCase() === filterBand);

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <PageHeader title="Recommendations" subtitle="Risk-adjusted reallocation opportunities — you approve every move">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
            style={{
              background: "rgba(34,211,238,0.07)",
              border: "1px solid rgba(34,211,238,0.18)",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse-dot" style={{ boxShadow: "0 0 4px rgba(34,211,238,0.6)" }} />
            <span className="text-[11px] font-semibold text-cyan-300">{recommendations.length} active</span>
          </div>
          <div className="relative">
            <select value={filterBand} onChange={(e) => setFilterBand(e.target.value)} className="btn-ghost cursor-pointer gap-1.5 pr-7 appearance-none">
              <option value="all">All Bands</option>
              <option value="strong">Strong</option>
              <option value="moderate">Moderate</option>
              <option value="mild">Mild</option>
            </select>
            <Filter className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <div
          className="relative overflow-hidden rounded-[28px] border border-white/8 p-6 md:p-7"
          style={{
            background:
              "linear-gradient(160deg, rgba(34,211,238,0.08) 0%, rgba(79,124,255,0.045) 28%, rgba(255,255,255,0.018) 62%, rgba(255,255,255,0.012) 100%)",
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 40px rgba(34,211,238,0.04)",
          }}
        >
          <div className="absolute right-0 top-0 h-40 w-56 pointer-events-none" style={{ background: "radial-gradient(circle at top right, rgba(34,211,238,0.16), transparent 68%)" }} />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              <Radar className="h-3 w-3" />
              reallocation engine
            </div>

            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white md:text-[40px]">
              Review the highest-edge moves
              <span className="block bg-[linear-gradient(135deg,#67e8f9_0%,#4f7cff_55%,#8b5cf6_100%)] bg-clip-text text-transparent">
                before you approve capital rotation.
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-[15px]">
              Recommendations is the decision layer: scored reallocations, wallet-aware execution readiness, and review-first action flow designed to help users distinguish real edge from noise.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                { label: "Decision mode", value: "Edge-first", note: "Recommendations are ranked by quality, not novelty", tone: "text-cyan-300" },
                { label: "Execution posture", value: "Review-based", note: "Nothing executes until the user approves it", tone: "text-white" },
                { label: "Trust model", value: "Wallet-aware", note: "Connection and verification state stay visible", tone: "text-emerald-300" },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</div>
                  <div className={`mt-2 text-base font-semibold tracking-tight ${card.tone}`}>{card.value}</div>
                  <div className="mt-1 text-xs text-slate-500">{card.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {[
            {
              label: "Scoring layer",
              title: "Surface reallocations when the projected edge is materially useful.",
              detail: "This page should help users focus on the highest-quality opportunity set rather than scrolling a generic list of suggestions.",
            },
            {
              label: "Execution workflow",
              title: "Move from review to approval without trust ambiguity.",
              detail: "Wallet state, verification state, and execution boundaries should remain obvious while reviewing each recommendation.",
            },
            {
              label: "Signal clarity",
              title: "Strong, moderate, and mild bands should feel operationally distinct.",
              detail: "The page should make it easy to scan confidence levels before diving into the detailed review panel.",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 shadow-[0_14px_50px_rgba(0,0,0,0.24)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
              <div className="mt-3 text-lg font-semibold tracking-tight text-white">{item.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <WalletBanner />

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Recommendation workflow
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <FadeIn delay={0.04}>
            <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              {BANDS.map(({ dot, dotGlow, label, range }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot, boxShadow: dotGlow ? `0 0 5px ${dotGlow}` : undefined }} />
                  <span className="text-[11px] font-medium text-slate-400">{label}</span>
                  <span className="text-[10px] text-slate-600">{range}</span>
                </div>
              ))}
            </div>
          </FadeIn>

          {filteredRecs.map((rec, i) => (
            <RecommendationCard key={rec.id} rec={rec} selected={selected?.id === rec.id} onSelect={() => setSelected(rec)} index={i} />
          ))}

          <FadeIn delay={0.3}>
            <div
              className="rounded-2xl py-7 text-center"
              style={{
                background: "rgba(255,255,255,0.018)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Clock className="mx-auto mb-2.5 h-6 w-6" style={{ color: "#64748b" }} />
              <p className="text-[13px] font-medium text-slate-400">Scored from latest subnet snapshot</p>
              <p className="mt-1 text-[11px] text-slate-600">Recommendations refresh automatically when new on-chain data is ingested.</p>
            </div>
          </FadeIn>
        </div>

        <div className="w-full shrink-0 lg:w-[320px] lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <ReviewPanel rec={selected} onIgnore={() => setSelected(null)} />
        </div>
      </div>

      <FadeIn>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "What this page should do",
              detail: "Help users distinguish the best available reallocations quickly, then review one candidate deeply before taking action.",
            },
            {
              title: "Why wallet state matters",
              detail: "Execution trust depends on keeping wallet connection, verification, and approval boundaries obvious during the review flow.",
            },
            {
              title: "Best follow-on action",
              detail: "Use the review panel to inspect the selected move, then connect or verify the wallet only when you are ready to approve it.",
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
