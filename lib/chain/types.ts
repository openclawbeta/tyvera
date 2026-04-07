/**
 * lib/chain/types.ts
 *
 * Shared types for Tyvera's on-chain data pipeline.
 */

/** Raw subnet data as pulled from Subtensor. */
export interface ChainSubnet {
  netuid: number;
  name: string;
  symbol: string;
  taoIn: number;          // TAO locked in subnet pool
  emissionPerDay: number; // TAO emitted per day
  stakers: number;        // Registered neuron count
  registeredAt: number;   // Block number at registration
  ageDays: number;        // Derived: blocks since registration / 7200
}

/** Raw neuron data from Subtensor metagraph. */
export interface ChainNeuron {
  uid: number;
  hotkey: string;
  coldkey: string;
  stake: number;
  trust: number;
  consensus: number;
  incentive: number;
  dividends: number;
  emission: number;
  active: boolean;
}

/** Full chain snapshot stored in cache. */
export interface ChainSnapshot {
  subnets: ChainSubnet[];
  blockHeight: number;
  fetchedAt: string;       // ISO timestamp
  syncDurationMs: number;  // How long the sync took
}

/** Per-subnet metagraph cache entry. */
export interface MetagraphCacheEntry {
  netuid: number;
  neurons: ChainNeuron[];
  blockHeight: number;
  fetchedAt: string;
}
