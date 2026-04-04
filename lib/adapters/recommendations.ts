import type {
  RecommendationBand,
  RecommendationFactorBullet,
  RecommendationUiModel,
  ConfidenceLabel,
} from "@/lib/types/recommendations";
import type { RiskLevel } from "@/lib/types/subnets";
import type { Recommendation as RecommendationMock } from "@/lib/mock-data/recommendations";

interface RecommendationApiDto {
  id?: string;
  source?: { netuid?: number; name?: string; yield?: number };
  destination?: { netuid?: number; name?: string; yield?: number };
  fromSubnet?: { netuid?: number; name?: string; yield?: number };
  toSubnet?: { netuid?: number; name?: string; yield?: number };
  move?: {
    recommended_tao?: number;
    fraction_of_source?: number;
    fee_tao?: number;
    chain_fee_tao?: number;
    total_fee_tao?: number;
    breakeven_days?: number;
    post_move_concentration?: number;
  };
  amount?: number;
  fraction?: number;
  projectedEdge?: number;
  projectedEdgeRao?: number;
  fees?: { move?: number; chain?: number; total?: number };
  breakeven?: number;
  confidence?: number | { score?: number; label?: ConfidenceLabel };
  confidenceLabel?: ConfidenceLabel;
  risk?: { level?: RiskLevel };
  riskLevel?: RiskLevel;
  band?: RecommendationBand;
  score?: number | { projected_edge_pct?: number; band?: RecommendationBand; final?: number };
  explanation?: {
    summary?: string;
    factor_bullets?: RecommendationFactorBullet[];
    risk_bullets?: string[];
  };
  rationale?: string;
  factorBullets?: RecommendationFactorBullet[];
  riskBullets?: string[];
  status?: string;
  expires_at?: string;
  expiresAt?: string;
  generated_at?: string;
  generatedAt?: string;
  postMoveConcentration?: number;
}

export function mapRecommendationDtoToUiModel(
  dto: RecommendationApiDto | RecommendationMock,
): RecommendationUiModel {
  const normalized = dto as RecommendationApiDto;
  const confidence = typeof normalized.confidence === "object" ? normalized.confidence?.score : normalized.confidence;
  const confidenceLabel = typeof normalized.confidence === "object" ? normalized.confidence?.label : normalized.confidenceLabel;
  const score = typeof normalized.score === "object" ? normalized.score?.final : normalized.score;
  const projectedEdge = typeof normalized.score === "object" ? normalized.score?.projected_edge_pct : normalized.projectedEdge;
  const band = typeof normalized.score === "object" ? normalized.score?.band : normalized.band;

  return {
    id: normalized.id ?? "unknown-rec",
    fromSubnet: {
      netuid: normalized.source?.netuid ?? normalized.fromSubnet?.netuid ?? 0,
      name: normalized.source?.name ?? normalized.fromSubnet?.name ?? "Unknown",
      yield: normalized.source?.yield ?? normalized.fromSubnet?.yield ?? 0,
    },
    toSubnet: {
      netuid: normalized.destination?.netuid ?? normalized.toSubnet?.netuid ?? 0,
      name: normalized.destination?.name ?? normalized.toSubnet?.name ?? "Unknown",
      yield: normalized.destination?.yield ?? normalized.toSubnet?.yield ?? 0,
    },
    amount: normalized.move?.recommended_tao ?? normalized.amount ?? 0,
    fraction: normalized.move?.fraction_of_source ?? normalized.fraction ?? 0,
    projectedEdge: projectedEdge ?? 0,
    projectedEdgeRao: normalized.projectedEdgeRao,
    fees: {
      move: normalized.move?.fee_tao ?? normalized.fees?.move ?? 0,
      chain: normalized.move?.chain_fee_tao ?? normalized.fees?.chain ?? 0,
      total: normalized.move?.total_fee_tao ?? normalized.fees?.total ?? normalized.move?.fee_tao ?? 0,
    },
    breakeven: normalized.move?.breakeven_days ?? normalized.breakeven ?? 0,
    confidence: confidence ?? 0,
    confidenceLabel: confidenceLabel ?? "WEAK",
    riskLevel: normalized.risk?.level ?? normalized.riskLevel ?? "MODERATE",
    band: band ?? "MILD",
    score: score ?? 0,
    rationale: normalized.explanation?.summary ?? normalized.rationale ?? "",
    factorBullets: normalized.explanation?.factor_bullets ?? normalized.factorBullets ?? [],
    riskBullets: normalized.explanation?.risk_bullets ?? normalized.riskBullets ?? [],
    status: normalized.status,
    expiresAt: normalized.expires_at ?? normalized.expiresAt,
    generatedAt: normalized.generated_at ?? normalized.generatedAt,
    postMoveConcentration: normalized.move?.post_move_concentration ?? normalized.postMoveConcentration,
  };
}
