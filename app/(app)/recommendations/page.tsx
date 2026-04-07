"use client";

import { useState } from "react";
import { Filter, Clock, CheckCircle, Wallet, Shield, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { RecommendationCard } from "@/components/recommendations/recommendation-card";
import { ReviewPanel } from "@/components/recommendations/review-panel";
import { getRecommendations } from "@/lib/api/recommendations";
import { useWallet } from "@/lib/wallet-context";
import type { RecommendationUiModel as Recommendation } from "@/lib/types/recommendations";

const BANDS = [
  { dot: "#22d3ee",  dotGlow: "rgba(34,211,238,0.6)",  label: "Strong",   range: "score --¥ 0.35" },
  { dot: "#fbbf24",  dotGlow: "rgba(251,191,36,0.5)",   label: "Moderate", range: "score --¥ 0.22" },
  { dot: "#64748b",  dotGlow: "",                        label: "Mild",     range: "score --¥ 0.15" },
];

/* -------------------------------------------------------------------------------------------------------------------------------------- */
/* Wallet banners                                                       */
/* -------------------------------------------------------------------------------------------------------------------------------------- */

function WalletBanner() {
  const { walletState, openModal, verify } = useWallet();

  /* Verified -- show standard trust copy */
  if (walletState === "verified" || walletState === "pending_approval") {
    return (
      <FadeIn>
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: "rgba(52,211,153,0.04)",
            border: "1px solid rgba(52,211,153,0.14)",
          }}
        >
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="text-[12px] text-slate-400">
            <span className="font-semibold text-emerald-300">You approve every move.</span>{" "}
            Recommendations are suggestions only. Nothing executes until you sign in your wallet.
          </p>
          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            <Shield className="w-3 h-3 text-slate-600" />
            <span className="text-[10px] text-slate-600">Wallet verified</span>
          </div>
        </div>
      </FadeIn>
    );
  }

  /* Connected but not verified */
  if (walletState === "connected") {
    return (
      <FadeIn>
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: "rgba(251,191,36,0.04)",
            border: "1px solid rgba(251,191,36,0.18)",
          }}
        >
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-[12px] text-slate-400 flex-1">
            <span className="font-semibold text-amber-300">Wallet verification required.</span>{" "}
            Sign a one-time message to confirm ownership before submitting any moves. No TAO is spent.
          </p>
          <button
            onClick={verify}
            className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
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
            <Shield className="w-3 h-3" />
            Verify now
          </button>
        </div>
      </FadeIn>
    );
  }

  /* Disconnected */
  return (
    <FadeIn>
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-xl"
        style={{
          background: "rgba(34,211,238,0.04)",
          border: "1px solid rgba(34,211,238,0.14)",
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(34,211,238,0.1)",
            border: "1px solid rgba(34,211,238,0.2)",
          }}
        >
          <Wallet className="w-4 h-4" style={{ color: "#22d3ee" }} />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-white mb-0.5" style={{ letterSpacing: "-0.01em" }}>
            Connect your wallet to execute recommendations
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Browse freely -- wallet connection is only needed when you want to approve a move.
            Your seed phrase is never stored. You approve every transaction individually.
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex-shrink-0 flex items-center gap-2 text-[12px] font-semibold px-4 py-2 rounded-xl transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, rgba(34,211,238,0.14) 0%, rgba(14,165,233,0.1) 100%)",
            border: "1px solid rgba(34,211,238,0.25)",
            color: "#67e8f9",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "linear-gradient(135deg, rgba(34,211,238,0.22) 0%, rgba(14,165,233,0.16) 100%)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(34,211,238,0.38)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "linear-gradient(135deg, rgba(34,211,238,0.14) 0%, rgba(14,165,233,0.1) 100%)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(34,211,238,0.25)";
          }}
        >
          <Wallet className="w-3.5 h-3.5" />
          Connect Wallet
        </button>
      </div>
    </FadeIn>
  );
}

/* -------------------------------------------------------------------------------------------------------------------------------------- */
/* Page                                                                 */
/* -------------------------------------------------------------------------------------------------------------------------------------- */

export default function RecommendationsPage() {
  const recommendations = getRecommendations();
  const [selected, setSelected] = useState<Recommendation | null>(recommendations[1] ?? recommendations[0] ?? null);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">

      {/* ---- Header ---- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Recommendations"
          subtitle="Risk-adjusted reallocation opportunities -- you approve every move"
        />
        <div className="flex items-center gap-2 mt-0.5">
          <div
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
            style={{
              background: "rgba(34,211,238,0.07)",
              border: "1px solid rgba(34,211,238,0.18)",
            }}
          >
            <span
              className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse-dot"
              style={{ boxShadow: "0 0 4px rgba(34,211,238,0.6)" }}
            />
            <span className="text-[11px] font-semibold text-cyan-300">
              {recommendations.length} active
            </span>
          </div>
          <button className="btn-ghost gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
        </div>
      </div>

      {/* ---- Wallet-aware trust banner ---- */}
      <WalletBanner />

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: list */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Band legend */}
          <FadeIn delay={0.04}>
            <div className="flex items-center gap-5">
              {BANDS.map(({ dot, dotGlow, label, range }) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: dot, boxShadow: dotGlow ? `0 0 5px ${dotGlow}` : undefined }}
                  />
                  <span className="text-[11px] font-medium text-slate-500">{label}</span>
                  <span className="text-[10px] text-slate-700">{range}</span>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Cards */}
          {recommendations.map((rec, i) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              selected={selected?.id === rec.id}
              onSelect={() => setSelected(rec)}
              index={i}
            />
          ))}

          {/* Next run */}
          <FadeIn delay={0.3}>
            <div
              className="text-center py-7 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.018)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Clock className="w-7 h-7 mx-auto mb-2.5" style={{ color: "#334155" }} />
              <p className="text-[13px] font-medium text-slate-500">
                Next scoring run in ~18 minutes
              </p>
              <p className="text-[11px] text-slate-700 mt-1">
                The engine scores all subnets every 30 minutes.
              </p>
            </div>
          </FadeIn>
        </div>

        {/* Right: review panel */}
        <div className="w-full lg:w-[320px] flex-shrink-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <ReviewPanel rec={selected} />
        </div>
      </div>
    </div>
  );
}
