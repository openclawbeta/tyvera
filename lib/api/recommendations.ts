import { getSubnets } from "@/lib/api/subnets";
import {
  deriveBreakeven,
  deriveConfidence,
  deriveRisk,
  deriveRootYield,
  deriveScoreBreakdown,
} from "@/lib/data/subnets-real-helpers";
import {
  RECOMMENDATION_CONCENTRATION_CEILING,
  RECOMMENDATION_DEFAULT_MOVE_FRACTION,
  RECOMMENDATION_MIN_AMOUNT_TAO,
  RECOMMENDATION_MAX_AMOUNT_TAO,
  ROOT_YIELD_DISCOUNT,
} from "@/lib/config";
import type {
  RecommendationBand,
  RecommendationFactorBullet,
  RecommendationKind,
  RecommendationUiModel,
  WalletHoldingsMap,
} from "@/lib/types/recommendations";

function confidenceLabelFromScore(confidence: number): "HIGH" | "GOOD" | "FAIR" | "WEAK" {
  if (confidence >= 85) return "HIGH";
  if (confidence >= 70) return "GOOD";
  if (confidence >= 55) return "FAIR";
  return "WEAK";
}

/**
 * Minimal subnet shape the recommender works with. Matches the relevant
 * fields on SubnetCardModel / SubnetDetailModel, with an optional marker
 * for the synthetic root row.
 */
interface RecSubnet {
  netuid: number;
  name: string;
  yield: number;
  score: number;
  liquidity: number;
  stakers: number;
  yieldDelta7d: number;
  age: number;
  isRoot?: boolean;
}

/**
 * Build a synthetic "subnet" row for root (netuid 0) so the rest of the
 * recommender can treat it uniformly. Returns null when no root yield can
 * be estimated — in that case root simply doesn't participate.
 */
function buildRootRow(subnets: RecSubnet[]): RecSubnet | null {
  const rootYield = deriveRootYield(subnets, ROOT_YIELD_DISCOUNT);
  if (rootYield == null) return null;

  // Synthetic root "subnet" characteristics:
  // - high liquidity and staker count (root is the densest pool)
  // - zero yield volatility (root doesn't have the same 7d swings)
  // - infinite "age" proxy (root has existed as long as Bittensor)
  const root: RecSubnet = {
    netuid: 0,
    name: "Root (TAO staking)",
    yield: rootYield,
    score: 0,
    liquidity: 10_000_000,
    stakers: 5_000,
    yieldDelta7d: 0,
    age: 365,
    isRoot: true,
  };
  // Score root using the same rubric the other subnets use so comparisons
  // are apples-to-apples.
  root.score = deriveScoreBreakdown(
    root.liquidity,
    root.yield,
    root.stakers,
    root.yieldDelta7d,
    root.age,
  ).total;
  return root;
}

export interface GetRecommendationsOptions {
  /** Caller's wallet address. Used only as a marker; selection comes from `holdings`. */
  address?: string | null;
  /** Caller's per-netuid stake in TAO. Include `0` for root if known. */
  holdings?: WalletHoldingsMap | null;
}

/**
 * Build the list of recommendations for a caller.
 *
 * Two modes:
 *
 *  1. Anonymous (no holdings): preserves the legacy global-leaderboard
 *     behavior — top-by-score targets paired with lower-scored sources.
 *     Root is included in the candidate pool when a root-yield estimate
 *     is available.
 *
 *  2. Personalized (holdings provided): sources are drawn exclusively
 *     from subnets the caller actually holds (including root), targets
 *     already at or above the concentration ceiling are excluded,
 *     and move amounts are sized against the caller's position.
 */
export function getRecommendations(
  addressOrOptions?: string | GetRecommendationsOptions,
): RecommendationUiModel[] {
  const opts: GetRecommendationsOptions =
    typeof addressOrOptions === "string"
      ? { address: addressOrOptions }
      : addressOrOptions ?? {};

  const holdings = opts.holdings ?? null;
  const personalized = !!(
    holdings && Object.values(holdings).some((v) => v > 0)
  );

  const allSubnets = getSubnets();
  if (allSubnets.length === 0) return [];

  // Base candidate set: non-root subnets with liquidity, ranked by score.
  const alphaSubnets: RecSubnet[] = allSubnets
    .filter((s) => s.liquidity > 0 && s.netuid !== 0)
    .map((s) => ({
      netuid: s.netuid,
      name: s.name,
      yield: s.yield,
      score: s.score,
      liquidity: s.liquidity,
      stakers: s.stakers,
      yieldDelta7d: s.yieldDelta7d,
      age: s.age,
    }));

  if (alphaSubnets.length === 0) return [];

  const rootRow = buildRootRow(alphaSubnets);
  const fullPool = rootRow ? [rootRow, ...alphaSubnets] : alphaSubnets;
  const rankedPool = [...fullPool].sort((a, b) => b.score - a.score);

  if (!personalized) {
    return buildAnonymousRecommendations(rankedPool);
  }

  return buildPersonalizedRecommendations(rankedPool, holdings!);
}

/* ─── Anonymous (legacy) path ──────────────────────────────────────── */

function buildAnonymousRecommendations(pool: RecSubnet[]): RecommendationUiModel[] {
  const topCandidates = pool.slice(0, 18);
  const generated = topCandidates.slice(0, 6).flatMap((target, index) => {
    const source = [...pool]
      .filter((candidate) => candidate.netuid !== target.netuid && candidate.score < target.score - 3)
      .sort((a, b) => a.score - b.score)[index];

    if (!source) return [];

    const projectedEdge = +(target.yield - source.yield).toFixed(2);
    if (projectedEdge <= 0.35) return [];

    // Legacy liquidity-based sizing (preserved so anonymous visitors
    // see the same shape of suggestions they did before this slice).
    const amount = +(Math.max(0.08, Math.min(0.65, target.liquidity / 10_000_000)).toFixed(2));

    return [buildRecommendation({
      source,
      target,
      amount,
      personalized: false,
      postMoveConcentration: +(Math.min(0.34, 0.12 + amount / 4)).toFixed(2),
    })];
  });

  return generated.slice(0, 8);
}

/* ─── Personalized path ────────────────────────────────────────────── */

function buildPersonalizedRecommendations(
  pool: RecSubnet[],
  holdings: WalletHoldingsMap,
): RecommendationUiModel[] {
  const walletTotal = Object.values(holdings).reduce((sum, v) => sum + (v > 0 ? v : 0), 0);
  if (walletTotal <= 0) return [];

  // Held subnets that exist in the pool, sorted by score ascending — the
  // weakest held positions are the most attractive sources to rotate out of.
  const heldInPool: RecSubnet[] = pool
    .filter((s) => (holdings[s.netuid] ?? 0) > 0)
    .sort((a, b) => a.score - b.score);

  if (heldInPool.length === 0) return [];

  // Targets: everything in the pool scored higher than the weakest held
  // position, excluding subnets already at or above the concentration
  // ceiling for this wallet. Sort by score descending.
  const ceiling = RECOMMENDATION_CONCENTRATION_CEILING;
  const eligibleTargets = pool
    .filter((t) => {
      const heldShare = (holdings[t.netuid] ?? 0) / walletTotal;
      return heldShare < ceiling;
    })
    .sort((a, b) => b.score - a.score);

  const recs: RecommendationUiModel[] = [];
  const seenPair = new Set<string>();

  for (const source of heldInPool) {
    for (const target of eligibleTargets) {
      if (target.netuid === source.netuid) continue;

      const pairKey = `${source.netuid}:${target.netuid}`;
      if (seenPair.has(pairKey)) continue;

      // Only propose a move if the target has a meaningful score edge AND
      // yield edge. The yield-edge threshold also serves as a safeguard
      // against recommending a moderately-worse root move when the held
      // subnet is fine.
      if (target.score <= source.score + 3) continue;
      const projectedEdge = +(target.yield - source.yield).toFixed(2);
      if (projectedEdge <= 0.35) continue;

      const heldInSource = holdings[source.netuid] ?? 0;
      const proposed = heldInSource * RECOMMENDATION_DEFAULT_MOVE_FRACTION;
      const amount = +(
        Math.max(RECOMMENDATION_MIN_AMOUNT_TAO, Math.min(RECOMMENDATION_MAX_AMOUNT_TAO, proposed))
      ).toFixed(3);

      // If the held position is smaller than the floor, skip rather than
      // propose a move that exceeds the held amount.
      if (amount > heldInSource) continue;

      const heldInTarget = holdings[target.netuid] ?? 0;
      const postMoveConcentration = +(
        (heldInTarget + amount) / walletTotal
      ).toFixed(3);
      if (postMoveConcentration >= ceiling) continue;

      recs.push(
        buildRecommendation({
          source,
          target,
          amount,
          personalized: true,
          postMoveConcentration,
        }),
      );
      seenPair.add(pairKey);

      if (recs.length >= 8) return recs;
    }
  }

  return recs;
}

/* ─── Shared factory ───────────────────────────────────────────────── */

function kindFor(source: RecSubnet, target: RecSubnet): RecommendationKind {
  if (source.isRoot) return "root_out";
  if (target.isRoot) return "root_in";
  return "subnet";
}

function buildRecommendation(args: {
  source: RecSubnet;
  target: RecSubnet;
  amount: number;
  personalized: boolean;
  postMoveConcentration: number;
}): RecommendationUiModel {
  const { source, target, amount, personalized, postMoveConcentration } = args;

  const projectedEdge = +(target.yield - source.yield).toFixed(2);
  const sourceConfidence = deriveConfidence(source.liquidity, source.stakers, source.yieldDelta7d, source.age);
  const targetConfidence = deriveConfidence(target.liquidity, target.stakers, target.yieldDelta7d, target.age);
  const confidence = Math.round(sourceConfidence * 0.35 + targetConfidence * 0.65);
  const sourceBreakdown = deriveScoreBreakdown(source.liquidity, source.yield, source.stakers, source.yieldDelta7d, source.age);
  const targetBreakdown = deriveScoreBreakdown(target.liquidity, target.yield, target.stakers, target.yieldDelta7d, target.age);
  const projectedScore = Math.max(0, Math.min(1, (target.score - source.score + projectedEdge) / 100));
  const band: RecommendationBand =
    confidence >= 82 && projectedEdge >= 0.9 ? "STRONG" :
    confidence >= 68 ? "MODERATE" : "MILD";
  const kind = kindFor(source, target);

  const fees = {
    move: +(amount * 0.00045).toFixed(5),
    chain: 0.00001,
    total: +(amount * 0.00045 + 0.00001).toFixed(5),
  };

  const rationale = buildRationale({ source, target, kind });

  const factorBullets: RecommendationFactorBullet[] = [
    {
      label: "Yield Edge",
      direction: "POSITIVE",
      sentence: `${target.name} is ahead by ${projectedEdge.toFixed(2)} percentage points of estimated yield versus ${source.name}.`,
    },
    {
      label: "Liquidity Quality",
      direction: targetBreakdown.liquidity >= sourceBreakdown.liquidity ? "POSITIVE" : "NEGATIVE",
      sentence: `${target.name} has ${target.liquidity.toLocaleString()} τ of liquidity versus ${source.liquidity.toLocaleString()} τ for ${source.name}.`,
    },
    {
      label: "Participation",
      direction: target.stakers >= source.stakers ? "POSITIVE" : "NEGATIVE",
      sentence: `${target.name} currently shows ${target.stakers} stakers compared with ${source.stakers} on ${source.name}, improving allocator confidence in depth and resilience.`,
    },
  ];

  return {
    id: `${personalized ? "personal" : "generated"}-${source.netuid}-${target.netuid}`,
    fromSubnet: { netuid: source.netuid, name: source.name, yield: source.yield },
    toSubnet: { netuid: target.netuid, name: target.name, yield: target.yield },
    amount,
    fraction: +Math.min(0.18, 0.04 + projectedEdge / 20).toFixed(2),
    projectedEdge,
    projectedEdgeRao: Math.round(projectedEdge * 100),
    fees,
    breakeven: deriveBreakeven(projectedEdge),
    confidence,
    confidenceLabel: confidenceLabelFromScore(confidence),
    riskLevel: target.isRoot ? "LOW" : deriveRisk(target.liquidity, target.stakers, target.yieldDelta7d),
    band,
    score: projectedScore,
    rationale,
    factorBullets,
    riskBullets: [
      `Target risk band: ${target.isRoot ? "LOW" : deriveRisk(target.liquidity, target.stakers, target.yieldDelta7d)}.`,
      `Confidence is ${confidenceLabelFromScore(confidence).toLowerCase()} rather than guaranteed — always validate category exposure and concentration before reallocating.`,
      kind === "root_in"
        ? "Moving to root trades alpha upside for stability — yield estimate is derived from the median mature subnet yield × conservative discount."
        : kind === "root_out"
        ? "Trimming root adds alpha exposure, which is higher-variance than root delegation."
        : `Post-move concentration in ${target.name}: ${(postMoveConcentration * 100).toFixed(1)}%.`,
    ],
    status: "ACTIVE",
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
    postMoveConcentration,
    kind,
    personalized,
  };
}

function buildRationale(args: { source: RecSubnet; target: RecSubnet; kind: RecommendationKind }): string {
  const { source, target, kind } = args;
  if (kind === "root_in") {
    return `${source.name} currently looks weaker than staying on root on a combined basis of yield quality, volatility, and participation depth. Moving back to root reduces exposure without giving up much realistic yield.`;
  }
  if (kind === "root_out") {
    return `${target.name} looks stronger than root on current metrics — liquidity, participation, and yield edge all favor deploying a portion of root stake into alpha.`;
  }
  return `${target.name} currently looks stronger than ${source.name} on a combined basis of yield, liquidity depth, participation, and maturity. The edge is not just headline APR — ${target.name} also holds up better on allocator-quality signals.`;
}
