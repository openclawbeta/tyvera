/**
 * lib/chain/cache.ts
 *
 * Module-scoped in-memory cache for chain data.
 *
 * In Vercel serverless functions, module-level variables persist across
 * invocations on the same warm instance. This gives us free caching
 * without external storage — the cron job writes, API routes read.
 *
 * Cache entries include a timestamp so consumers can decide whether
 * to serve stale data or fall through to TaoStats.
 */

import type { ChainSnapshot, MeagraphCacheEntry } from "./types";

/* ─────────────────────────────────────────────────────────────────── */
/* Subnet cache                                                         */
/* ─────────────────────────────────────────────────────────────────── */

let subnetCache: ChainSnapshot | null = null;

/** Max age before consumers should treat data as stale (10 minutes). */
const SUBNET_MAX_AGE_MS = 10 * 60 * 1000;

export function setSubnetCache(snapshot: ChainSnapshot): void {
  subnetCache = snapshot;
}

export function getSubnetCache(): ChainSnapshot | null {
  return subnetCache;
}

export function isSubnetCacheFresh(): boolean {
  if (!subnetCache) return false;
  return Date.now() - new Date(subnetCache.fetchedAt).getTime() < SUBNET_MAX_AGE_MS;
}

export function getSubnetCacheAgeMs(): number {
  if (!subnetCache) return Infinity;
  return Date.now() - new Date(subnetCache.fetchedAt).getTime();
}

/* ─────────────────────────────────────────────────────────────────── */
/* Metagraph cache (per-subnet)                                         */
/* ─────────────────────────────────────────────────────────────────── */

const metagraphCache = new Map<number, MeagraphCacheEntry>();

/** Max age for metagraph entries (5 minutes). */
const METAGRAPH_MAX_AGE_MS = 5 * 60 * 1000;

export function setMetagraphCache(entry: MeagraphCacheEntry): void {
  metagraphCache.set(entry.netuid, entry);
}

export function getMetagraphCache(netuid: number): MeagraphCacheEntry | null {
  return metagraphCache.get(netuid) ?? null;
}

export function isMetagraphCacheFresh(netuid: number): boolean {
  const entry = metagraphCache.get(netuid);
  if (!entry) return false;
  return Date.now() - new Date(entry.fetchedAt).getTime() < METAGRAPH_MAX_AGE_MS;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Block height (always updated on subnet sync)                         */
/* ─────────────────────────────────────────────────────────────────── */

export function getBlockHeight(): number | null {
  return subnetCache?.blockHeight ?? null;
}
