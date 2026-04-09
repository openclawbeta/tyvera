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

import type { ChainSnapshot, MetagraphCacheEntry, HolderAttributionSnapshot } from "./types";

/* ─────────────────────────────────────────────────────────────────── */
/* Subnet cache                                                         */
/* ─────────────────────────────────────────────────────────────────── */

let subnetCache: ChainSnapshot | null = null;

import { SUBNET_CACHE_TTL_MS, METAGRAPH_CACHE_TTL_MS } from "@/lib/config";

/** Max age before consumers should treat data as stale. */
const SUBNET_MAX_AGE_MS = SUBNET_CACHE_TTL_MS;

export function setSubnetCache(snapshot: ChainSnapshot): void {
  subnetCache = snapshot;
}

export function getSubnetCache(): ChainSnapshot | null {
  return subnetCache;
}

export function isSubnetCacheFresh(): boolean {
  if (!subnetCache) return false;
  const ts = Date.parse(subnetCache.fetchedAt);
  if (isNaN(ts)) return false;
  return Date.now() - ts < SUBNET_MAX_AGE_MS;
}

export function getSubnetCacheAgeMs(): number {
  if (!subnetCache) return Infinity;
  const ts = Date.parse(subnetCache.fetchedAt);
  if (isNaN(ts)) return Infinity;
  return Date.now() - ts;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Metagraph cache (per-subnet)                                         */
/* ─────────────────────────────────────────────────────────────────── */

const metagraphCache = new Map<number, MetagraphCacheEntry>();

/** Max age for metagraph entries. */
const METAGRAPH_MAX_AGE_MS = METAGRAPH_CACHE_TTL_MS;

export function setMetagraphCache(entry: MetagraphCacheEntry): void {
  metagraphCache.set(entry.netuid, entry);
}

export function getMetagraphCache(netuid: number): MetagraphCacheEntry | null {
  return metagraphCache.get(netuid) ?? null;
}

export function isMetagraphCacheFresh(netuid: number): boolean {
  const entry = metagraphCache.get(netuid);
  if (!entry) return false;
  const ts = Date.parse(entry.fetchedAt);
  if (isNaN(ts)) return false;
  return Date.now() - ts < METAGRAPH_MAX_AGE_MS;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Block height (always updated on subnet sync)                         */
/* ─────────────────────────────────────────────────────────────────── */

export function getBlockHeight(): number | null {
  return subnetCache?.blockHeight ?? null;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Holder attribution cache                                             */
/* ─────────────────────────────────────────────────────────────────── */

let holderAttributionCache: HolderAttributionSnapshot | null = null;
const HOLDER_ATTRIBUTION_MAX_AGE_MS = 15 * 60 * 1000;

export function setHolderAttributionCache(snapshot: HolderAttributionSnapshot): void {
  holderAttributionCache = snapshot;
}

export function getHolderAttributionCache(): HolderAttributionSnapshot | null {
  return holderAttributionCache;
}

export function isHolderAttributionCacheFresh(): boolean {
  if (!holderAttributionCache) return false;
  const ts = Date.parse(holderAttributionCache.fetchedAt);
  if (isNaN(ts)) return false;
  return Date.now() - ts < HOLDER_ATTRIBUTION_MAX_AGE_MS;
}
