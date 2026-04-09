/**
 * lib/data-source-policy.ts
 *
 * Central data-source policy for the Tyvera internal API.
 *
 * Every API route should report WHERE its data came from and HOW
 * reliable it is, using a standardized vocabulary. This module
 * defines the vocabulary, assigns trust tiers, and provides a
 * response-builder that stamps consistent headers + body metadata
 * onto every NextResponse.
 *
 * Tier definitions:
 *   T1 — Live chain / authoritative external API  (freshest, highest trust)
 *   T2 — Tyvera-managed cache or recent snapshot  (seconds to minutes old)
 *   T3 — Stale cache or aged snapshot             (minutes to hours old)
 *   T4 — Static fallback or seeded synthetic data (always available, lowest trust)
 */

import { NextResponse } from "next/server";

/* ─────────────────────────────────────────────────────────────────── */
/* Source identifiers                                                   */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Canonical data source identifiers.
 * Every API response must use one of these — no ad-hoc strings.
 */
export const DATA_SOURCES = {
  /* ── Tier 1: Live / authoritative ──────────────────────────────── */
  CHAIN_LIVE:          "chain-live",
  COINGECKO_LIVE:      "coingecko-live",
  COINMARKETCAP_LIVE:  "coinmarketcap-live",
  TAOSTATS_LIVE:       "taostats-live",

  /* ── Tier 2: Tyvera cache (warm, within TTL) ───────────────────── */
  CHAIN_CACHE:         "chain-cache",
  METAGRAPH_CACHE:     "metagraph-cache",
  HOLDER_CACHE:        "holder-cache",
  RATE_CACHE:          "rate-cache",

  /* ── Tier 3: Stale / aged snapshots ────────────────────────────── */
  SUBTENSOR_SNAPSHOT:        "subtensor-snapshot",
  SUBTENSOR_SNAPSHOT_STALE:  "subtensor-snapshot-stale",
  HOLDER_SNAPSHOT:           "holder-snapshot",
  RATE_STALE:                "rate-stale",

  /* ── Tier 4: Static / synthetic ────────────────────────────────── */
  STATIC_SNAPSHOT:     "static-snapshot",
  SYNTHETIC:           "synthetic",
  MODELED:             "modeled",
  FALLBACK_CONSTANT:   "fallback-constant",
} as const;

export type DataSourceId = (typeof DATA_SOURCES)[keyof typeof DATA_SOURCES];

/* ─────────────────────────────────────────────────────────────────── */
/* Trust tiers                                                         */
/* ─────────────────────────────────────────────────────────────────── */

export type TrustTier = 1 | 2 | 3 | 4;

const SOURCE_TIERS: Record<DataSourceId, TrustTier> = {
  [DATA_SOURCES.CHAIN_LIVE]:              1,
  [DATA_SOURCES.COINGECKO_LIVE]:          1,
  [DATA_SOURCES.COINMARKETCAP_LIVE]:      1,
  [DATA_SOURCES.TAOSTATS_LIVE]:           1,

  [DATA_SOURCES.CHAIN_CACHE]:             2,
  [DATA_SOURCES.METAGRAPH_CACHE]:         2,
  [DATA_SOURCES.HOLDER_CACHE]:            2,
  [DATA_SOURCES.RATE_CACHE]:              2,

  [DATA_SOURCES.SUBTENSOR_SNAPSHOT]:      3,
  [DATA_SOURCES.SUBTENSOR_SNAPSHOT_STALE]:3,
  [DATA_SOURCES.HOLDER_SNAPSHOT]:         3,
  [DATA_SOURCES.RATE_STALE]:              3,

  [DATA_SOURCES.STATIC_SNAPSHOT]:         4,
  [DATA_SOURCES.SYNTHETIC]:               4,
  [DATA_SOURCES.MODELED]:                 4,
  [DATA_SOURCES.FALLBACK_CONSTANT]:       4,
};

export function getTier(source: DataSourceId): TrustTier {
  return SOURCE_TIERS[source] ?? 4;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Default Cache-Control per tier                                      */
/* ─────────────────────────────────────────────────────────────────── */

const TIER_CACHE_CONTROL: Record<TrustTier, string> = {
  1: "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
  2: "public, max-age=60, s-maxage=300",
  3: "public, max-age=30, s-maxage=120",
  4: "public, max-age=30, s-maxage=60",
};

/* ─────────────────────────────────────────────────────────────────── */
/* Response metadata                                                   */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Standard metadata block that every API response can include
 * in the JSON body under the `_meta` key.
 */
export interface ResponseMeta {
  source: DataSourceId;
  tier: TrustTier;
  fetchedAt: string;          // ISO timestamp of data origin
  servedAt: string;           // ISO timestamp of this response
  stale?: boolean;            // true when data is past its nominal TTL
  snapshotAgeMs?: number;     // age of underlying snapshot, if applicable
  blockHeight?: number;       // chain block height, if known
  note?: string;              // human-readable caveat
}

export interface MetaInput {
  source: DataSourceId;
  fetchedAt: string;
  stale?: boolean;
  snapshotAgeMs?: number;
  blockHeight?: number;
  note?: string;
}

export function buildMeta(input: MetaInput): ResponseMeta {
  return {
    source: input.source,
    tier: getTier(input.source),
    fetchedAt: input.fetchedAt,
    servedAt: new Date().toISOString(),
    ...(input.stale != null && { stale: input.stale }),
    ...(input.snapshotAgeMs != null && { snapshotAgeMs: input.snapshotAgeMs }),
    ...(input.blockHeight != null && { blockHeight: input.blockHeight }),
    ...(input.note ? { note: input.note } : {}),
  };
}

/* ─────────────────────────────────────────────────────────────────── */
/* Response builder                                                    */
/* ─────────────────────────────────────────────────────────────────── */

interface ApiResponseOptions {
  /** HTTP status code. Default: 200 */
  status?: number;
  /** Additional HTTP headers to merge. */
  extraHeaders?: Record<string, string>;
  /** Override default Cache-Control for this tier. */
  cacheControl?: string;
}

/**
 * Build a standardized API response.
 *
 * Every response gets:
 *   - JSON body with `_meta` block
 *   - `X-Data-Source` header
 *   - `X-Data-Tier` header (1–4)
 *   - `Cache-Control` appropriate to tier
 *
 * Usage:
 * ```ts
 * return apiResponse(
 *   { subnets: [...] },
 *   { source: DATA_SOURCES.CHAIN_CACHE, fetchedAt: snapshot.fetchedAt },
 * );
 * ```
 */
export function apiResponse<T extends Record<string, unknown>>(
  body: T,
  meta: MetaInput,
  options: ApiResponseOptions = {},
): NextResponse {
  const responseMeta = buildMeta(meta);
  const tier = responseMeta.tier;
  const cacheControl = options.cacheControl ?? TIER_CACHE_CONTROL[tier];

  const headers: Record<string, string> = {
    "X-Data-Source": responseMeta.source,
    "X-Data-Tier": String(tier),
    "Cache-Control": cacheControl,
    ...(responseMeta.blockHeight != null
      ? { "X-Block-Height": String(responseMeta.blockHeight) }
      : {}),
    ...(responseMeta.stale ? { "X-Data-Stale": "true" } : {}),
    ...(options.extraHeaders ?? {}),
  };

  return NextResponse.json(
    { ...body, _meta: responseMeta },
    { status: options.status ?? 200, headers },
  );
}

/**
 * Build a standardized error response.
 */
export function apiErrorResponse(
  message: string,
  status: number = 500,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(
    { error: message, _meta: { servedAt: new Date().toISOString() } },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(extraHeaders ?? {}),
      },
    },
  );
}
