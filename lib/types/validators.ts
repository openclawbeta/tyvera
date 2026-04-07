/**
 * lib/types/validators.ts
 *
 * Type definitions for validator-related data structures
 */

export interface ValidatorInfo {
  rank: number;
  name: string;
  address: string;
  dominance: number; // percentage
  nominators: number;
  change24h: number; // percentage change in nominators
  activeSubnets: number;
  totalWeight: number;
  weightChange24h: number; // τ amount
  rootStake: number; // τ
  alphaStake: number; // τ
  verified: boolean;
}

export interface ValidatorSummary {
  totalValidators: number;
  totalStake: number; // τ
  totalNominators: number;
  avgDominance: number; // percentage
}
