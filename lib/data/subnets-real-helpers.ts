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
 *   Liquidity    34 %   (normalised against 2 500 000 τ ceiling)
 *   Yield        22 %   (normalised against 3.2 % ceiling)
 *   Stakers      20 %   (normalised against 256 ceiling)
 *   Stability    14 %   (penalises high yield volatility)
 *   Maturity     10 %   (age up to 365 days)
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

/**
 * Normalize raw annualized emissions APR into a safer allocator-facing yield.
 *
 * Why this exists:
 * - Raw APR can explode on thin-liquidity subnets.
 * - Users should not treat a 200%+ instantaneous annualization as normal comparable yield.
 * - This function keeps the raw number available while downweighting it using
 *   liquidity depth, participation depth, subnet age, confidence, and outlier severity.
 */
export function deriveNormalizedYield(
  rawYieldPct: number,
  liquidity: number,
  stakers: number,
  age = 180,
  confidence?: number,
): number {
  if (rawYieldPct <= 0) return 0;

  const liquidityFactor = Math.min(1, Math.max(0.12, liquidity / 2_500_000));
  const participationFactor = Math.min(1, Math.max(0.2, stakers / 256));
  const maturityFactor = Math.min(1, Math.max(0.35, age / 365));
  const confidenceFactor = Math.min(1, Math.max(0.35, (confidence ?? 65) / 100));

  const outlierPenalty =
    rawYieldPct > 250 ? 0.16 :
    rawYieldPct > 150 ? 0.24 :
    rawYieldPct > 100 ? 0.34 :
    rawYieldPct > 70 ? 0.48 :
    rawYieldPct > 50 ? 0.62 :
    1;

  const normalized = rawYieldPct * liquidityFactor * participationFactor * maturityFactor * confidenceFactor * outlierPenalty;

  // Clamp to a user-safer comparable yield band while preserving relative quality.
  return +Math.min(rawYieldPct, Math.max(0, normalized)).toFixed(2);
}

/* ─── Outlier / Risk Flag Detection ─────────────────────────────────── */

/**
 * Risk flags surfaced to users before they commit capital.
 * Each flag has a severity ("caution" or "warning") and a plain-English message.
 */
export interface RiskFlag {
  id: string;
  severity: "caution" | "warning";
  title: string;
  message: string;
}

/**
 * Detect outlier conditions that warrant explicit user acknowledgment.
 *
 * Flags:
 *   EXTREME_YIELD     yield > 100% — unsustainable or artifact of low liquidity
 *   HIGH_YIELD        yield > 50%  — elevated, may attract dilution quickly
 *   LOW_LIQUIDITY     liquidity < 100 000 τ — thin pool, high slippage risk
 *   YIELD_LIQUIDITY   yield > 50% AND liquidity < 500 000 τ — red flag combo
 *   ZERO_EMISSION     emissions === 0 — subnet may be inactive or deregistered
 *   YOUNG_SUBNET      age < 30 days — limited track record
 */
export function detectRiskFlags(subnet: {
  yield: number;
  liquidity: number;
  emissions: number;
  stakers: number;
  age: number;
  risk: string;
}): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Extreme yield outlier (SN102-type: 800%+ on thin liquidity)
  if (subnet.yield > 100) {
    flags.push({
      id: "extreme_yield",
      severity: "warning",
      title: "Extreme yield outlier",
      message: `This subnet shows ${subnet.yield.toFixed(0)}% estimated APR — far above network norms. Yields this high are usually unsustainable and driven by low liquidity rather than strong fundamentals. New stakers dilute the pool rapidly.`,
    });
  } else if (subnet.yield > 50) {
    flags.push({
      id: "high_yield",
      severity: "caution",
      title: "Elevated yield",
      message: `This subnet's ${subnet.yield.toFixed(1)}% estimated APR is well above the network average. High yields often compress quickly as new stake flows in. Research the subnet's emission schedule and staker trend before allocating.`,
    });
  }

  // Low liquidity
  if (subnet.liquidity < 100_000 && subnet.liquidity > 0) {
    flags.push({
      id: "low_liquidity",
      severity: "warning",
      title: "Low liquidity pool",
      message: `Only ${Math.round(subnet.liquidity).toLocaleString()} τ is staked in this subnet. Thin pools mean higher slippage, greater price impact when entering or exiting, and more volatile yield swings.`,
    });
  } else if (subnet.liquidity < 500_000 && subnet.yield > 50) {
    flags.push({
      id: "yield_liquidity_mismatch",
      severity: "warning",
      title: "High yield on thin liquidity",
      message: `A ${subnet.yield.toFixed(1)}% yield on just ${Math.round(subnet.liquidity).toLocaleString()} τ of liquidity is a common red-flag combination. The yield will compress rapidly as new stake enters.`,
    });
  }

  // Zero emission — subnet may be inactive
  if (subnet.emissions === 0) {
    flags.push({
      id: "zero_emission",
      severity: "caution",
      title: "No active emissions",
      message: "This subnet is not currently receiving TAO emissions from the network. It may be inactive, in a registration gap, or not yet included in the current emission cycle. Staking here produces no yield until emissions resume.",
    });
  }

  // Young subnet
  if (subnet.age > 0 && subnet.age < 30) {
    flags.push({
      id: "young_subnet",
      severity: "caution",
      title: "New subnet",
      message: `This subnet is only ${subnet.age} days old. New subnets have limited track records, volatile emission patterns, and higher operator risk. Early metrics may not reflect long-term performance.`,
    });
  }

  return flags;
}
