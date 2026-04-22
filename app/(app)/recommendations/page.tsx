"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Clock, CheckCircle, Wallet, Shield, AlertCircle, Radar, Sparkles, Lock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/ui-custom/fade-in";
import { RecommendationCard } from "@/components/recommendations/recommendation-card";
import { ReviewPanel } from "@/components/recommendations/review-panel";
import { getRecommendations } from "@/lib/api/recommendations";
import { fetchSubnetsFromApi, getSubnets } from "@/lib/api/subnets";
import { useWallet } from "@/lib/wallet-context";
import { useEntitlement } from "@/lib/hooks/use-entitlement";
import type { SubnetDetailModel } from "@/lib/types/subnets";
import type {
  RecommendationUiModel as Recommendation,
  WalletHoldingsMap,
} from "@/lib/types/recommendations";

const BANDS = [
  { dot: "#5B4BC9", dotGlow: "rgba(34,211,238,0.6)", label: "Strong", range: "score ≥ 0.35" },
  { dot: "var(--aurora-warn)", dotGlow: "rgba(251,191,36,0.5)", label: "Moderate", range: "score ≥ 0.22" },
  { dot: "var(--aurora-sub)", dotGlow: "", label: "Mild", range: "score ≥ 0.15" },
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
              color: "var(--aurora-warn)",
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
          <Wallet className="h-4 w-4" style={{ color: "#5B4BC9" }} />
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
            color: "#5B4BC9",
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

function UpgradeGate() {
  return (
    <div className="mx-auto max-w-2xl py-20 text-center">
      <div
        className="inline-flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{
          background: "rgba(139,92,246,0.1)",
          border: "1px solid rgba(139,92,246,0.2)",
        }}
      >
        <Lock className="h-7 w-7 text-violet-400" />
      </div>
      <h2 className="mt-6 text-2xl font-bold tracking-tight text-white">
        Recommendations require Strategist
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
        AI-powered reallocation recommendations are available on the Strategist plan ($49.99/mo).
        Upgrade to access wallet-aware scoring, personalized edge detection, and review-first execution.
      </p>
      <a
        href="/pricing"
        className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all"
        style={{
          background: "linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(79,124,255,0.12) 100%)",
          border: "1px solid rgba(139,92,246,0.3)",
          color: "#5B4BC9",
        }}
      >
        <Sparkles className="h-4 w-4" />
        View plans
      </a>
    </div>
  );
}

export default function RecommendationsPage() {
  const { address, walletState } = useWallet();
  const entitlement = useEntitlement(address);
  const [holdings, setHoldings] = useState<WalletHoldingsMap | null>(null);
  const [filterBand, setFilterBand] = useState<string>("all");
  // Live subnet set (seed with static snapshot so first render has data).
  const [liveSubnets, setLiveSubnets] = useState<SubnetDetailModel[]>(() => getSubnets());

  // Pull the live subnet set (includes netuid 0 as root when chain-derived
  // root metrics are fresh). Used by the recommender to compare root vs
  // alpha subnets with real yields rather than a heuristic.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { subnets } = await fetchSubnetsFromApi();
        if (!cancelled && subnets.length > 0) setLiveSubnets(subnets);
      } catch {
        // Silent — we already have the static snapshot.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch wallet holdings when an address is available. We don't require
  // verification — a connected wallet is enough to personalize suggestions
  // since nothing executes until the user signs.
  useEffect(() => {
    if (!address) {
      setHoldings(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/portfolio?address=${encodeURIComponent(address)}`);
        if (!res.ok) return;
        const data = await res.json();
        const positions: Array<{ netuid: number; stakedTao: number }> =
          data?.positions ?? [];
        if (!Array.isArray(positions) || cancelled) return;
        const map: WalletHoldingsMap = {};
        for (const p of positions) {
          if (typeof p?.netuid === "number" && typeof p?.stakedTao === "number" && p.stakedTao > 0) {
            map[p.netuid] = (map[p.netuid] ?? 0) + p.stakedTao;
          }
        }
        if (!cancelled) setHoldings(map);
      } catch {
        // Best-effort — fall back to anonymous recommendations silently.
        if (!cancelled) setHoldings(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, walletState]);

  const recommendations = useMemo(
    () => getRecommendations({ address, holdings, subnets: liveSubnets }),
    [address, holdings, liveSubnets],
  );

  const [selected, setSelected] = useState<Recommendation | null>(null);

  // Keep `selected` in sync with the current rec list: prefer the previously
  // selected id, otherwise fall back to the second (legacy default) or first.
  useEffect(() => {
    setSelected((prev) => {
      if (prev && recommendations.some((r) => r.id === prev.id)) return prev;
      return recommendations[1] ?? recommendations[0] ?? null;
    });
  }, [recommendations]);

  const filteredRecs = filterBand === "all" ? recommendations : recommendations.filter((r) => r.band.toLowerCase() === filterBand);

  // ── Entitlement gate: Strategist+ required ──────────────────────
  if (!entitlement.loading && !entitlement.hasFeature("recommendations")) {
    return (
      <div className="mx-auto max-w-[1440px]">
        <PageHeader title="Recommendations" subtitle="Risk-adjusted reallocation opportunities — you approve every move" />
        <UpgradeGate />
      </div>
    );
  }

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
              Where to move your TAO next
            </div>

            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white md:text-[40px]">
              The best available moves,
              <span className="block bg-[linear-gradient(135deg,#67e8f9_0%,#4f7cff_55%,#8b5cf6_100%)] bg-clip-text text-transparent">
                ranked by expected edge.
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-[15px]">
              Tyvera scans all 128+ subnets each hour and ranks reallocations by expected yield gain, risk, and liquidity. Review each candidate, then sign the transaction from your own wallet — Tyvera never moves capital for you.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                { label: "Ranked by", value: "Expected edge", note: "Yield gain net of risk and liquidity cost", tone: "text-cyan-300" },
                { label: "Execution", value: "You approve", note: "Tyvera never signs a transaction on your behalf", tone: "text-white" },
                { label: "Wallet role", value: "Read-only first", note: "Connect to see personalized moves for your book", tone: "text-emerald-300" },
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
              label: "Ranking",
              title: "Only moves with material edge show up.",
              detail: "Tyvera filters out marginal switches so you're looking at reallocations with real projected yield gain — not a feed of noise.",
            },
            {
              label: "Review",
              title: "See the reasoning before you act.",
              detail: "Each recommendation opens a detail panel with the source yield, destination yield, risk band, and a one-line summary of why Tyvera thinks the swap is worth it.",
            },
            {
              label: "Confidence",
              title: "Strong, moderate, or mild — you choose.",
              detail: "Bands make it easy to stay inside your own risk tolerance. Filter to only the strong band and you'll see Tyvera's most defensible calls.",
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
              <Clock className="mx-auto mb-2.5 h-6 w-6" style={{ color: "var(--aurora-sub)" }} />
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
              title: "How recommendations work",
              detail: "Tyvera scans every subnet each hour and ranks reallocations by expected yield gain, risk, and liquidity — so you don't have to screen 128+ pools manually.",
            },
            {
              title: "Your wallet stays in control",
              detail: "Tyvera only reads balances. Every move is a suggestion — you still sign the transaction yourself from your own wallet whenever you decide to act.",
            },
            {
              title: "Before you execute",
              detail: "Open the review panel on any candidate to see the reasoning, risk band, and alternative moves. Approve only after it matches your own thesis.",
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
