import { mapRecommendationDtoToUiModel } from "@/lib/adapters/recommendations";
import { ACTIVE_RECOMMENDATIONS } from "@/lib/mock-data/recommendations";
import { getSubnets } from "@/lib/api/subnets";
import { deriveBreakeven, deriveConfidence, deriveRisk, deriveScoreBreakdown } from "@/lib/data/subnets-real-helpers";
import type { RecommendationBand, RecommendationFactorBullet } from "@/lib/types/recommendations";

function confidenceLabelFromScore(confidence: number): "HIGH" | "GOOD" | "FAIR" | "WEAK" {
  if (confidence >= 85) return "HIGH";
  if (confidence >= 70) return "GOOD";
  if (confidence >= 55) return "FAIR";
  return "WEAK";
}

export function getRecommendations(_address?: string) {
  const base = ACTIVE_RECOMMENDATIONS.map(mapRecommendationDtoToUiModel);
  const subnets = getSubnets()
    .filter((s) => s.liquidity > 0 && s.netuid !== 0)
    .sort((a, b) => b.score - a.score);

  const topCandidates = subnets.slice(0, 18);
  const generated = topCandidates.slice(0, 6).flatMap((target, index) => {
    const source = [...subnets]
      .filter((candidate) => candidate.netuid !== target.netuid && candidate.score < target.score - 3)
      .sort((a, b) => a.score - b.score)[index];

    if (!source) return [];

    const projectedEdge = +(target.yield - source.yield).toFixed(2);
    if (projectedEdge <= 0.35) return [];

    const amount = +(Math.max(0.08, Math.min(0.65, target.liquidity / 10_000_000)).toFixed(2));
    const fees = {
      move: +(amount * 0.00045).toFixed(5),
      chain: 0.00001,
      total: +(amount * 0.00045 + 0.00001).toFixed(5),
    };
    const sourceConfidence = deriveConfidence(source.liquidity, source.stakers, source.yieldDelta7d, source.age);
    const targetConfidence = deriveConfidence(target.liquidity, target.stakers, target.yieldDelta7d, target.age);
    const confidence = Math.round((sourceConfidence * 0.35) + (targetConfidence * 0.65));
    const sourceBreakdown = deriveScoreBreakdown(source.liquidity, source.yield, source.stakers, source.yieldDelta7d, source.age);
    const targetBreakdown = deriveScoreBreakdown(target.liquidity, target.yield, target.stakers, target.yieldDelta7d, target.age);
    const projectedScore = Math.max(0, Math.min(1, (target.score - source.score + projectedEdge) / 100));
    const band: RecommendationBand = confidence >= 82 && projectedEdge >= 0.9 ? "STRONG" : confidence >= 68 ? "MODERATE" : "MILD";

    const factorBullets: RecommendationFactorBullet[] = [
      {
        label: "Yield Edge",
        direction: "POSITIVE",
        sentence: `${target.name} is ahead by ${projectedEdge.toFixed(2)} percentage points of estimated annual yield versus ${source.name}.`,
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

    return [{
      id: `generated-${source.netuid}-${target.netuid}`,
      fromSubnet: { netuid: source.netuid, name: source.name, yield: source.yield },
      toSubnet: { netuid: target.netuid, name: target.name, yield: target.yield },
      amount,
      fraction: +(Math.min(0.18, 0.04 + projectedEdge / 20)).toFixed(2),
      projectedEdge,
      projectedEdgeRao: Math.round(projectedEdge * 100),
      fees,
      breakeven: deriveBreakeven(projectedEdge),
      confidence,
      confidenceLabel: confidenceLabelFromScore(confidence),
      riskLevel: deriveRisk(target.liquidity, target.stakers, target.yieldDelta7d),
      band,
      score: projectedScore,
      rationale: `${target.name} currently looks stronger than ${source.name} on a combined basis of yield, liquidity depth, participation, and maturity. The edge is not just headline APR — ${target.name} also holds up better on allocator-quality signals.`,
      factorBullets,
      riskBullets: [
        `Target risk band: ${deriveRisk(target.liquidity, target.stakers, target.yieldDelta7d)}.`,
        `Confidence is ${confidenceLabelFromScore(confidence).toLowerCase()} rather than guaranteed — always validate category exposure and concentration before reallocating.`,
      ],
      status: "ACTIVE",
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
      postMoveConcentration: +(Math.min(0.34, 0.12 + amount / 4)).toFixed(2),
    }];
  });

  const merged = [...generated, ...base]
    .sort((a, b) => (b.score + b.projectedEdge / 100) - (a.score + a.projectedEdge / 100))
    .slice(0, 8);

  return merged;
}
