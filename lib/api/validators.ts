/**
 * lib/api/validators.ts
 *
 * Validator data sourced from direct Subtensor chain queries.
 *
 * Strategy:
 *   1. Use delegate-scanner (root subnet chain queries) for stake, nominators, registrations
 *   2. Enrich with Opentensor delegate registry (names, descriptions) — community data, not a commercial API
 *   3. Fall back to a minimal list of known validators with honest zero metrics
 *
 * No external API dependencies (no TaoStats).
 */

import { ValidatorInfo, ValidatorSummary } from "@/lib/types/validators";
import { fetchDelegatesFromChain, type ChainDelegate } from "@/lib/chain/delegate-scanner";
import { VALIDATOR_CACHE_TTL_MS } from "@/lib/config";

// In-memory cache
let cachedValidators: ValidatorInfo[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = VALIDATOR_CACHE_TTL_MS;

/**
 * Known top validators with their names for fallback.
 */
const KNOWN_VALIDATORS: { name: string; address: string }[] = [
  { name: "Opentensor Foundation", address: "5F4tQyWrhfGVcNhoqeiNsR6KjBCPh1cEF3z8cph5QmWQj7Bm" },
  { name: "Taostats & Corcel",     address: "5Hddm3iBFD2GLT5ik7LZnT3XJUnRnN8PoeCFgGQYawCx8jGv" },
  { name: "Datura",                address: "5HEo565WAy4Dbq3Sv271SAi7syBSofyfhhwRNjFNSM2gP9M2" },
  { name: "RoundTable21",          address: "5FFApaS75bv5pJHfAp2FVLBj9ZaXuFDjEypsaBNc1wCfe52v" },
  { name: "Yuma, a DCG Company",   address: "5DvTpiniW9s3APmHRYn8FroUWyfnLtrsid5Mtn5EwMXHN2ed" },
  { name: "tao.bot",               address: "5HK5tp6t2S59DywmHRWPBVJeJ86T61KjurYqeooqj8sREpeN" },
  { name: "Tensorplex Labs",       address: "5HNQURvmjjYhTSksi8Wfsw676b4owGwfLR2BFAQzG7H3HhYf" },
  { name: "FirstTensor.com",       address: "5CXRfP2ekFhe62r7q3vppRajJmGhTi7vwvb2yr79jveZ282w" },
  { name: "Crucible Labs",         address: "5EhvL1FVkQPpMjZX4MAADcW42i3xPSF1KiCpuaxTYVr28sux" },
  { name: "Foundry / DCG",         address: "5HbScNssaEfioJHXjcXdpyqo1cXgz63tNAZfBeBfzmpaWPe2" },
];

/**
 * Map a ChainDelegate from the delegate-scanner to our ValidatorInfo shape.
 */
function mapDelegateToValidator(
  d: ChainDelegate,
  rank: number,
  totalNetworkStake: number,
): ValidatorInfo {
  const dominance = totalNetworkStake > 0
    ? (d.rootStake / totalNetworkStake) * 100
    : 0;

  return {
    rank,
    name: d.name,
    address: d.hotkey,
    dominance: Math.round(dominance * 100) / 100,
    nominators: d.nominators,
    change24h: 0, // Would need historical snapshots
    activeSubnets: d.registeredSubnets.length,
    totalWeight: d.rootStake,
    weightChange24h: 0,
    rootStake: d.rootStake,
    alphaStake: 0,
    verified: d.verified,
  };
}

/**
 * Fetch validators from direct chain queries via delegate-scanner.
 */
export async function fetchValidators(): Promise<ValidatorInfo[]> {
  // Return cache if fresh
  if (cachedValidators && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedValidators;
  }

  // Query chain directly
  try {
    const scanResult = await fetchDelegatesFromChain();

    if (scanResult && scanResult.delegates.length > 0) {
      const validators = scanResult.delegates
        .slice(0, 50)
        .map((d, i) => mapDelegateToValidator(d, i + 1, scanResult.totalNetworkStake));

      cachedValidators = validators;
      cacheTimestamp = Date.now();
      console.log(
        `[validators] Loaded ${validators.length} validators from chain ` +
        `(block ${scanResult.blockHeight}, ${scanResult.scanDurationMs}ms)`,
      );
      return validators;
    }
  } catch (err) {
    console.error("[validators] Chain delegate scan failed:", err);
  }

  // Fallback: hardcoded known validators with honest zero metrics
  return getValidatorsFallback();
}

/**
 * Synchronous accessor: returns cached validators or fallback.
 */
export function getValidators(): ValidatorInfo[] {
  if (cachedValidators && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedValidators;
  }
  return getValidatorsFallback();
}

function getValidatorsFallback(): ValidatorInfo[] {
  return KNOWN_VALIDATORS.map((v, index): ValidatorInfo => ({
    rank: index + 1,
    name: v.name,
    address: v.address,
    dominance: 0,
    nominators: 0,
    change24h: 0,
    activeSubnets: 0,
    totalWeight: 0,
    weightChange24h: 0,
    rootStake: 0,
    alphaStake: 0,
    verified: true,
  }));
}

/**
 * Aggregate validators to summary stats
 */
export function getValidatorSummary(validators: ValidatorInfo[]): ValidatorSummary {
  const totalStake = validators.reduce((sum, v) => sum + v.rootStake + v.alphaStake, 0);
  const totalNominators = validators.reduce((sum, v) => sum + v.nominators, 0);
  const avgDominance = validators.length > 0
    ? validators.reduce((sum, v) => sum + v.dominance, 0) / validators.length
    : 0;

  return {
    totalValidators: validators.length,
    totalStake,
    totalNominators,
    avgDominance,
  };
}
