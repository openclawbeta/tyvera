/**
 * lib/data/subnets-real-helpers.ts
 *
 * Shared derivation helpers used by:
 *   - lib/data/subnets-real.ts       (static Phase 1 snapshot)
 *   - scripts/fetch-subnets.mjs      (live fetch + file generation)
 *
 * All functions are ESTIMATES / HEURISTICS — replace derivation logic
 * with real model outputs when Phase 2 scoring is implemented.
 */

import type { RiskLevel } from "@/lib/types/subnets";

export interface ScoreBreakdown {
  liquidity: number;
  yield: number;
  participation: number;
  stability: number;
  maturity: number;
  total: number;
}

/**
 * Derive risk level from subnet characteristics.
 *
 * Phase 3 recalibration for full-network Subtensor data:
 * - The live chain dataset has many subnets with small validator/miner counts,
 *   so the original curated-snapshot thresholds collapsed nearly everything
 *   into SPECULATIVE.
 * - These thresholds are intentionally broader so the full network distributes
 *   across LOW / MODERATE / HIGH / SPECULATIVE in a way that is still legible.
 *
 * Heuristic bands:
 *   LOW         liquidity ≥ 20 000τ AND stakers ≥ 64
 *   MODERATE    liquidity ≥ 5 000τ  AND stakers ≥ 24 AND |yieldDelta7d| < 8 %
 *   HIGH        liquidity ≥ 1 000τ  AND stakers ≥ 8
 *   SPECULATIVE everything below the above thresholds or very high volatility
 */
export function deriveRisk(
  liquidity:    number,
  stakers:      number,
  yieldDelta7d: number,
): RiskLevel {
  const absΔ = Math.abs(yieldDelta7d);

  if (liquidity >= 1_500_000 && stakers >= 180 && absΔ < 4) return "LOW";
  if (liquidity >= 400_000 && stakers >= 96 && absΔ < 7) return "MODERATE";
  if (liquidity >= 25_000 && stakers >= 24 && absΔ < 10) return "HIGH";
  return "SPECULATIVE";
}

/**
 * Derive composite score 0–100.
 *
 * Weights:
 *   Liquidity   40 %   (normalised against 15 000 τ ceiling)
 *   Yield       30 %   (normalised against 35 % APR ceiling)
 *   Stakers     20 %   (normalised against 2 000 ceiling)
 *   Stability   10 %   (penalises high yield volatility)
 *
 * ESTIMATED — replace with real scoring model in Phase 2.
 */
export function deriveScoreBreakdown(
  liquidity: number,
  yieldPct: number,
  stakers: number,
  yieldDelta7d: number,
  age = 180,
): ScoreBreakdown {
  const liquidityScore = Math.min(100, (liquidity / 2_500_000) * 100) * 0.34;
  const yieldScore = Math.min(100, (yieldPct / 3.2) * 100) * 0.22;
  const participationScore = Math.min(100, (stakers / 256) * 100) * 0.20;
  const stabilityScore = Math.max(0, 100 - Math.abs(yieldDelta7d) * 7) * 0.14;
  const maturityScore = Math.min(100, (age / 365) * 100) * 0.10;
  const total = Math.round(liquidityScore + yieldScore + participationScore + stabilityScore + maturityScore);

  return {
    liquidity: Math.round(liquidityScore),
    yield: Math.round(yieldScore),
    participation: Math.round(participationScore),
    stability: Math.round(stabilityScore),
    maturity: Math.round(maturityScore),
    total,
  };
}

export function deriveScore(
  liquidity:    number,
  yieldPct:     number,
  stakers:      number,
  yieldDelta7d: number,
  age = 180,
): number {
  return deriveScoreBreakdown(liquidity, yieldPct, stakers, yieldDelta7d, age).total;
}

export function deriveConfidence(
  liquidity: number,
  stakers: number,
  yieldDelta7d: number,
  age = 180,
): number {
  const liquidityConfidence = Math.min(100, (liquidity / 2_000_000) * 100) * 0.4;
  const participationConfidence = Math.min(100, (stakers / 256) * 100) * 0.25;
  const stabilityConfidence = Math.max(0, 100 - Math.abs(yieldDelta7d) * 6) * 0.2;
  const maturityConfidence = Math.min(100, (age / 365) * 100) * 0.15;
  return Math.round(liquidityConfidence + participationConfidence + stabilityConfidence + maturityConfidence);
}

/**
 * Build a 14-point momentum sparkline seeded from a current yield and 7d delta.
 *
 * Reconstructs a plausible historical series by walking backwards from the
 * current yield, incorporating the known 7-day trend, plus a small sinusoidal
 * jitter to avoid a perfectly straight line.
 *
 * ESTIMATED — replace with real 14-day history from TaoStats in Phase 2.
 */
export function buildMomentum(baseYield: number, delta7d: number): number[] {
  return Array.from({ length: 14 }, (_, i) => {
    const progress = i / 13;              // 0 (oldest) → 1 (current)
    const trend    = delta7d * (1 - progress); // fade trend in going forward
    const jitter   = Math.sin(i * 1.4) * 0.15;
    return +Math.max(0, baseYield - trend + jitter).toFixed(1);
  });
}

/**
 * Estimate breakeven days for a stake move.
 *
 * Formula: move_fee_rate / daily_yield_rate
 *   move fee ≈ 0.1 % of moved TAO (on-chain default — can vary)
 *   daily yield rate = yieldPct / 100 / 365
 *
 * ESTIMATED — real move fee is chain-determined and subnet-specific.
 */
export function deriveBreakeven(yieldPct: number): number {
  if (yieldPct <= 0) return 999;
  const moveFeeRate    = 0.001;           // 0.1 %
  const dailyYieldRate = yieldPct / 100 / 365;
  return Math.round(moveFeeRate / dailyYieldRate);
}

/**
 * Derive dTAO yield percentage.
 * Formula: (daily_tao_emitted / total_tao_in_subnet) × 365 × 100
 *
 * This is a simplification of dTAO economics (actual yield includes alpha
 * token price appreciation vs. TAO, which is not captured here).
 * SOURCE-BACKED when emissionsPerDay and taoIn come from TaoStats API.
 */
export function deriveYield(emissionsPerDay: number, taoIn: number): number {
  if (!taoIn || taoIn <= 0) return 0;
  return +((emissionsPerDay / taoIn) * 365 * 100).toFixed(2);
}
