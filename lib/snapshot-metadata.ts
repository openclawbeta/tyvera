/**
 * lib/snapshot-metadata.ts
 *
 * Standardized metadata for on-disk JSON snapshots.
 *
 * Every snapshot file in `public/data/` should embed a `_meta` block
 * that follows this schema. This module provides helpers to:
 *   1. Read and validate snapshot metadata
 *   2. Determine freshness (within TTL vs stale)
 *   3. Produce metadata blocks for new snapshots
 *
 * Schema version history:
 *   1 — original ad-hoc fields (fetched_at, subnet_count)
 *   2 — standardized _meta with source, schemaVersion, generator
 */

import { readFile } from "fs/promises";
import path from "path";

/* ─────────────────────────────────────────────────────────────────── */
/* Schema                                                              */
/* ─────────────────────────────────────────────────────────────────── */

export const CURRENT_SCHEMA_VERSION = 2;

export interface SnapshotMeta {
  /** ISO timestamp when the data was fetched / generated */
  fetchedAt: string;
  /** What produced the snapshot (e.g. "cron/sync-chain", "scripts/fetch_subnets_subtensor.py") */
  generator: string;
  /** Canonical data source from data-source-policy */
  source: string;
  /** Schema version for forward compatibility */
  schemaVersion: number;
  /** Optional: block height at snapshot time */
  blockHeight?: number;
  /** Optional: count of items (subnets, holders, etc.) */
  itemCount?: number;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Builder                                                             */
/* ─────────────────────────────────────────────────────────────────── */

export function createSnapshotMeta(
  input: Pick<SnapshotMeta, "generator" | "source"> &
    Partial<Pick<SnapshotMeta, "blockHeight" | "itemCount">>,
): SnapshotMeta {
  return {
    fetchedAt: new Date().toISOString(),
    generator: input.generator,
    source: input.source,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    ...(input.blockHeight != null ? { blockHeight: input.blockHeight } : {}),
    ...(input.itemCount != null ? { itemCount: input.itemCount } : {}),
  };
}

/* ─────────────────────────────────────────────────────────────────── */
/* Validation & reading                                                */
/* ─────────────────────────────────────────────────────────────────── */

interface ParsedSnapshot<T> {
  data: T;
  meta: SnapshotMeta;
  ageMs: number;
}

/**
 * Normalize legacy `_meta` blocks (schema v1) into current format.
 * Falls back gracefully — a snapshot with no `_meta` at all still works.
 */
function normalizeMeta(raw: Record<string, unknown>): SnapshotMeta {
  // Current format
  if (raw.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return raw as unknown as SnapshotMeta;
  }

  // Legacy v1 format (e.g. subnets.json uses fetched_at, subnet_count)
  const fetchedAt =
    (raw.fetchedAt as string) ??
    (raw.fetched_at as string) ??
    new Date(0).toISOString();

  return {
    fetchedAt,
    generator: (raw.generator as string) ?? "unknown",
    source: (raw.source as string) ?? "unknown",
    schemaVersion: 1,
    ...(raw.blockHeight != null || raw.block_height != null
      ? { blockHeight: (raw.blockHeight ?? raw.block_height) as number }
      : {}),
    ...(raw.itemCount != null || raw.subnet_count != null
      ? { itemCount: (raw.itemCount ?? raw.subnet_count) as number }
      : {}),
  };
}

/**
 * Read a JSON snapshot file, extract its metadata, and compute age.
 *
 * @param filePath  Absolute or relative path to the snapshot JSON.
 * @param dataKey   The key in the JSON that holds the main data array/object.
 *                  If null, the entire JSON (minus _meta) is treated as data.
 *
 * @returns null if the file does not exist or is unparseable.
 */
export async function readSnapshot<T = unknown>(
  filePath: string,
  dataKey: string | null = null,
): Promise<ParsedSnapshot<T> | null> {
  try {
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    const raw = JSON.parse(await readFile(resolved, "utf-8"));

    const metaRaw = raw._meta ?? {};
    const meta = normalizeMeta(metaRaw);

    const fetchedMs = Date.parse(meta.fetchedAt);
    const ageMs = isNaN(fetchedMs) ? Infinity : Date.now() - fetchedMs;

    // Extract data
    let data: T;
    if (dataKey) {
      data = raw[dataKey] as T;
    } else {
      const { _meta: _, ...rest } = raw;
      data = rest as T;
    }

    return { data, meta, ageMs };
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/* Freshness checks                                                    */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Check whether a snapshot is fresh (within the given TTL).
 */
export function isSnapshotFresh(
  meta: SnapshotMeta | null | undefined,
  maxAgeMs: number,
): boolean {
  if (!meta) return false;
  const ts = Date.parse(meta.fetchedAt);
  if (isNaN(ts)) return false;
  return Date.now() - ts < maxAgeMs;
}

/**
 * Compute age in ms. Returns Infinity for missing/invalid timestamps.
 */
export function snapshotAgeMs(meta: SnapshotMeta | null | undefined): number {
  if (!meta) return Infinity;
  const ts = Date.parse(meta.fetchedAt);
  if (isNaN(ts)) return Infinity;
  return Date.now() - ts;
}
