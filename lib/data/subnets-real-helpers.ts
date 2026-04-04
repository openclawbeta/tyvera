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

/**
 * Derive risk level from subnet characteristics.
 *
 * Thresholds (heuristic — adjust as the ecosystem matures):
 *   LOW         liquidity ≥ 8 000τ  AND stakers ≥ 500
 *   MODERATE    liquidity ≥ 3 000τ  AND stakers ≥ 150 AND |yieldDelta7d| < 5 %
 *   HIGH        liquidity < 3 000τ  OR  stakers < 150  OR  |yieldDelta7d| ≥ 5 %
 *   SPECULATIVE liquidity < 1 500τ  OR  stakers < 80   OR  |yieldDelta7d| ≥ 8 %
 */
export function deriveRisk(
  liquidity:    number,
  stakers:      number,
  yieldDelta7d: number,
): RiskLevel {
  const absΔ = Math.abs(yieldDelta7d);
  if (liquidity >= 8000 && stakers >= 500)                          return "LOW";
  if (liquidity >= 3000 && stakers >= 150 && absΔ < 5)             return "MODERATE";
  if (liquidity < 1500  || stakers < 80   || absΔ >= 8)            return "SPECULATIVE";
  return "HIGH";
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
export function deriveScore(
  liquidity:    number,
  yieldPct:     number,
  stakers:      number,
  yieldDelta7d: number,
): number {
  const liqScore   = Math.min(100, (liquidity / 15000) * 100) * 0.40;
  const yieldScore = Math.min(100, (yieldPct  /    35) * 100) * 0.30;
  const stakeScore = Math.min(100, (stakers   /  2000) * 100) * 0.20;
  const stability  = Math.max(0,   100 - Math.abs(yieldDelta7d) * 5) * 0.10;
  return Math.round(liqScore + yieldScore + stakeScore + stability);
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
