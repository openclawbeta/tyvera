import type { RiskLevel } from "./subnets";

export type RecommendationBand = "STRONG" | "MODERATE" | "MILD";
export type ConfidenceLabel = "HIGH" | "GOOD" | "FAIR" | "WEAK";

/**
 * What kind of move this recommendation represents, so the UI can render
 * root moves distinctly from subnet-to-subnet moves:
 *   - "subnet":   alpha subnet → alpha subnet (the legacy default)
 *   - "root_in":  any subnet → root (move back to root)
 *   - "root_out": root → any subnet (trim root stake, redeploy into alpha)
 */
export type RecommendationKind = "subnet" | "root_in" | "root_out";

/**
 * Personalized recommendations take the caller's per-netuid stake as input
 * (in TAO). Include `0` for root if known. Missing entries are treated as 0.
 */
export type WalletHoldingsMap = Record<number, number>;

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
  /** What kind of move: subnet-to-subnet, root-in, or root-out. Defaults to "subnet". */
  kind?: RecommendationKind;
  /** True when the recommendation was personalized against the caller's holdings. */
  personalized?: boolean;
}
