/**
 * lib/api/validators.ts
 *
 * Validator data and aggregation functions
 */

import { ValidatorInfo, ValidatorSummary } from "@/lib/types/validators";

// Seeded PRNG (Mulberry32) for deterministic synthetic data
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a realistic Bittensor address (SS58 format)
 */
function generateAddress(seed: number): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let result = "5";
  const rng = mulberry32(seed);

  for (let i = 0; i < 46; i++) {
    result += chars[Math.floor(rng() * chars.length)];
  }

  return result;
}

/**
 * Get top 50 validators with realistic data (seeded/deterministic)
 */
export function getValidators(): ValidatorInfo[] {
  const knownValidators = [
    "tao.bot",
    "Taostats",
    "Yuma, a DCG Company",
    "Opentensor Foundation",
    "TAO.com",
    "Kraken",
    "Crucible Labs",
    "BitDAO",
  ];

  const validators: ValidatorInfo[] = [];
  const baseSeed = 42; // deterministic seed

  for (let i = 0; i < 50; i++) {
    const rng = mulberry32(baseSeed + i);

    // Determine if known or address-based
    const isKnown = i < knownValidators.length;
    const name = isKnown ? knownValidators[i] : generateAddress(baseSeed + i);

    // Dominance: top validator ~14%, descending to ~0.5%
    const dominance = 14 * Math.pow(0.92, i);

    // Total weight: descending from 500k to 10k
    const totalWeight = 500000 * Math.pow(0.95, i) + 10000;

    // Nominators: ranges from 40000+ down to a few hundred
    const nominators = Math.max(100, 40000 * Math.pow(0.93, i));

    // Change 24h: mix of positive/negative changes (-3 to +5%)
    const change24h = (rng() - 0.4) * 8;

    // Active subnets: 80-126
    const activeSubnets = Math.floor(80 + rng() * 46);

    // Weight change 24h: mix of positive/negative
    const weightChange24h = (rng() - 0.5) * 50000;

    // Root and Alpha stakes
    const rootStake = 100000 + rng() * 800000;
    const alphaStake = rng() * 500000;

    // Top 8 are verified
    const verified = i < 8;

    validators.push({
      rank: i + 1,
      name,
      address: isKnown ? generateAddress(baseSeed + i) : name,
      dominance,
      nominators: Math.round(nominators),
      change24h,
      activeSubnets,
      totalWeight: Math.round(totalWeight),
      weightChange24h,
      rootStake: Math.round(rootStake),
      alphaStake: Math.round(alphaStake),
      verified,
    });
  }

  // Already sorted by totalWeight descending
  return validators;
}

/**
 * Aggregate validators to summary stats
 */
export function getValidatorSummary(validators: ValidatorInfo[]): ValidatorSummary {
  const totalStake = validators.reduce((sum, v) => sum + v.rootStake + v.alphaStake, 0);
  const totalNominators = validators.reduce((sum, v) => sum + v.nominators, 0);
  const avgDominance = validators.reduce((sum, v) => sum + v.dominance, 0) / validators.length;

  return {
    totalValidators: validators.length,
    totalStake,
    totalNominators,
    avgDominance,
  };
}
