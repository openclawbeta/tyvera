import type { RiskLevel } from "./subnets";

export type RecommendationBand = "STRONG" | "MODERATE" | "MILD";
export type ConfidenceLabel = "HIGH" | "GOOD" | "FAIR" | "WEAK";

export interface RecommendationSubnetRef {
  netuid: number;
  name: string;
  yield: number;
}

export interface RecommendationFees {
  move: number;
  chain: number;
  total: number;
}

export interface RecommendationFactorBullet {
  label: string;
  sentence: string;
  direction: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
}

export interface RecommendationUiModel {
  id: string;
  fromSubnet: RecommendationSubnetRef;
  toSubnet: RecommendationSubnetRef;
  amount: number;
  fraction: number;
  projectedEdge: number;
  projectedEdgeRao?: number;
  fees: RecommendationFees;
  breakeven: number;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  riskLevel: RiskLevel;
  band: RecommendationBand;
  score: number;
  rationale: string;
  factorBullets: RecommendationFactorBullet[];
  riskBullets: string[];
  status?: string;
  expiresAt?: string;
  generatedAt?: string;
  postMoveConcentration?: number;
}
