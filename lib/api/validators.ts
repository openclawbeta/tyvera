/**
 * lib/api/validators.ts
 *
 * Validator data sourced from real on-chain and registry data.
 *
 * Strategy:
 *   1. Fetch TaoStats delegate stats (stake, nominators, etc.)
 *   2. Enrich with Opentensor delegate registry (names, descriptions)
 *   3. Fall back to a minimal list of known validators with honest zero metrics
 */

import { ValidatorInfo, ValidatorSummary } from "@/lib/types/validators";

// Public delegate registry from Opentensor
const DELEGATE_REGISTRY_URL =
  "https://raw.githubusercontent.com/opentensor/bittensor-delegates/main/public/delegates.json";

// TaoStats delegate stats endpoint
const TAOSTATS_DELEGATES_URL = "https://api.taostats.io/api/v1/delegate";

// In-memory cache with 10-minute TTL
let cachedValidators: ValidatorInfo[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

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

interface DelegateEntry {
  name?: string;
  url?: string;
  description?: string;
  [key: string]: unknown;
}

interface TaoStatsDelegateEntry {
  hotkey?: string;
  delegate_name?: string;
  name?: string;
  total_stake?: number;
  nominators?: number;
  nominator_count?: number;
  registrations?: number[];
  total_daily_return?: number;
  take?: number;
  [key: string]: unknown;
}

/**
 * Fetch validators with real data from TaoStats + Opentensor registry.
 */
export async function fetchValidators(): Promise<ValidatorInfo[]> {
  // Return cache if fresh
  if (cachedValidators && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedValidators;
  }

  // Fetch both sources in parallel
  const [registryResult, taoStatsResult] = await Promise.allSettled([
    fetch(DELEGATE_REGISTRY_URL, { signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? r.json() : null)) as Promise<Record<string, DelegateEntry> | null>,
    fetch(TAOSTATS_DELEGATES_URL, { signal: AbortSignal.timeout(10000), headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null)) as Promise<TaoStatsDelegateEntry[] | { data: TaoStatsDelegateEntry[] } | null>,
  ]);

  const registry: Record<string, DelegateEntry> =
    registryResult.status === "fulfilled" && registryResult.value ? registryResult.value : {};

  // Parse TaoStats response (may be array or { data: [...] })
  let taoStatsDelegates: TaoStatsDelegateEntry[] = [];
  if (taoStatsResult.status === "fulfilled" && taoStatsResult.value) {
    const raw = taoStatsResult.value;
    taoStatsDelegates = Array.isArray(raw) ? raw : Array.isArray((raw as { data: TaoStatsDelegateEntry[] }).data) ? (raw as { data: TaoStatsDelegateEntry[] }).data : [];
  }

  // Build a lookup from TaoStats by hotkey
  const stakeMap = new Map<string, TaoStatsDelegateEntry>();
  for (const d of taoStatsDelegates) {
    const key = d.hotkey ?? "";
    if (key) stakeMap.set(key, d);
  }

  // Compute total network stake for dominance calculation
  const totalNetworkStake = taoStatsDelegates.reduce((sum, d) => {
    const stake = Number(d.total_stake ?? 0);
    return sum + (stake > 1e6 ? stake / 1e9 : stake); // Auto-detect rao vs TAO
  }, 0);

  // Merge: prefer TaoStats data enriched with registry names
  // Start with TaoStats delegates (they have real metrics), then fill in registry-only entries
  const seen = new Set<string>();
  const validators: ValidatorInfo[] = [];

  // First pass: TaoStats delegates (sorted by stake, top 50)
  const sortedDelegates = [...taoStatsDelegates]
    .sort((a, b) => Number(b.total_stake ?? 0) - Number(a.total_stake ?? 0))
    .slice(0, 50);

  for (const d of sortedDelegates) {
    const address = d.hotkey ?? "";
    if (!address || seen.has(address)) continue;
    seen.add(address);

    const rawStake = Number(d.total_stake ?? 0);
    const stake = rawStake > 1e6 ? rawStake / 1e9 : rawStake;
    const nominators = Number(d.nominators ?? d.nominator_count ?? 0);
    const registrations = Array.isArray(d.registrations) ? d.registrations.length : 0;

    const regEntry = registry[address];
    const name = regEntry?.name || d.delegate_name || d.name || `${address.slice(0, 8)}...${address.slice(-4)}`;
    const dominance = totalNetworkStake > 0 ? (stake / totalNetworkStake) * 100 : 0;

    validators.push({
      rank: validators.length + 1,
      name,
      address,
      dominance: Math.round(dominance * 100) / 100,
      nominators,
      change24h: 0, // Would need historical data to compute
      activeSubnets: registrations,
      totalWeight: stake,
      weightChange24h: 0,
      rootStake: stake, // TaoStats total_stake is root stake
      alphaStake: 0,
      verified: !!regEntry?.name || !!d.delegate_name,
    });
  }

  // If TaoStats returned data, use it; otherwise fall back to registry-only or hardcoded
  if (validators.length > 0) {
    cachedValidators = validators;
    cacheTimestamp = Date.now();
    return validators;
  }

  // Second pass: registry-only (no TaoStats data available)
  if (Object.keys(registry).length > 0) {
    const regValidators = Object.entries(registry)
      .slice(0, 50)
      .map(([address, delegate], index): ValidatorInfo => ({
        rank: index + 1,
        name: delegate.name || `${address.slice(0, 8)}...${address.slice(-4)}`,
        address,
        dominance: 0,
        nominators: 0,
        change24h: 0,
        activeSubnets: 0,
        totalWeight: 0,
        weightChange24h: 0,
        rootStake: 0,
        alphaStake: 0,
        verified: !!delegate.name,
      }));

    cachedValidators = regValidators;
    cacheTimestamp = Date.now();
    return regValidators;
  }

  // Final fallback: hardcoded known validators
  return getValidatorsFallback();
}

/**
 * Synchronous fallback: returns known validators with honest zero metrics.
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
