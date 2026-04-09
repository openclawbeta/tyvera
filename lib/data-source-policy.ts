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
 */

import { NextResponse } from "next/server";

export const DATA_SOURCES = {
  CHAIN_LIVE: "chain-live",
  COINGECKO_LIVE: "coingecko-live",
  COINMARKETCAP_LIVE: "coinmarketcap-live",
  TAOSTATS_LIVE: "taostats-live",

  CHAIN_CACHE: "chain-cache",
  METAGRAPH_CACHE: "metagraph-cache",
  HOLDER_CACHE: "holder-cache",
  RATE_CACHE: "rate-cache",

  SUBTENSOR_SNAPSHOT: "subtensor-snapshot",
  SUBTENSOR_SNAPSHOT_STALE: "subtensor-snapshot-stale",
  HOLDER_SNAPSHOT: "holder-snapshot",
  RATE_STALE: "rate-stale",

  STATIC_SNAPSHOT: "static-snapshot",
  SYNTHETIC: "synthetic",
  MODELED: "modeled",
  FALLBACK_CONSTANT: "fallback-constant",
  UNAVAILABLE: "unavailable",
} as const;

export type DataSourceId = (typeof DATA_SOURCES)[keyof typeof DATA_SOURCES];
export type TrustTier = 1 | 2 | 3 | 4;

const SOURCE_TIERS: Record<DataSourceId, TrustTier> = {
  [DATA_SOURCES.CHAIN_LIVE]: 1,
  [DATA_SOURCES.COINGECKO_LIVE]: 1,
  [DATA_SOURCES.COINMARKETCAP_LIVE]: 1,
  [DATA_SOURCES.TAOSTATS_LIVE]: 1,

  [DATA_SOURCES.CHAIN_CACHE]: 2,
  [DATA_SOURCES.METAGRAPH_CACHE]: 2,
  [DATA_SOURCES.HOLDER_CACHE]: 2,
  [DATA_SOURCES.RATE_CACHE]: 2,

  [DATA_SOURCES.SUBTENSOR_SNAPSHOT]: 3,
  [DATA_SOURCES.SUBTENSOR_SNAPSHOT_STALE]: 3,
  [DATA_SOURCES.HOLDER_SNAPSHOT]: 3,
  [DATA_SOURCES.RATE_STALE]: 3,

  [DATA_SOURCES.STATIC_SNAPSHOT]: 4,
  [DATA_SOURCES.SYNTHETIC]: 4,
  [DATA_SOURCES.MODELED]: 4,
  [DATA_SOURCES.FALLBACK_CONSTANT]: 4,
  [DATA_SOURCES.UNAVAILABLE]: 4,
};

export function getTier(source: DataSourceId): TrustTier {
  return SOURCE_TIERS[source] ?? 4;
}

const TIER_CACHE_CONTROL: Record<TrustTier, string> = {
  1: "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
  2: "public, max-age=60, s-maxage=300",
  3: "public, max-age=30, s-maxage=120",
  4: "public, max-age=30, s-maxage=60",
};

export interface ResponseMeta {
  source: DataSourceId;
  tier: TrustTier;
  fetchedAt: string | null;
  servedAt: string;
  stale?: boolean;
  fallbackUsed?: boolean;
  awaiting?: boolean;
  snapshotAgeMs?: number;
  blockHeight?: number;
  note?: string;
}

export interface MetaInput {
  source: DataSourceId;
  fetchedAt: string | null;
  stale?: boolean;
  fallbackUsed?: boolean;
  awaiting?: boolean;
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
    ...(input.stale != null ? { stale: input.stale } : {}),
    ...(input.fallbackUsed != null ? { fallbackUsed: input.fallbackUsed } : {}),
    ...(input.awaiting != null ? { awaiting: input.awaiting } : {}),
    ...(input.snapshotAgeMs != null ? { snapshotAgeMs: input.snapshotAgeMs } : {}),
    ...(input.blockHeight != null ? { blockHeight: input.blockHeight } : {}),
    ...(input.note ? { note: input.note } : {}),
  };
}

interface ApiResponseOptions {
  status?: number;
  extraHeaders?: Record<string, string>;
  cacheControl?: string;
}

export function buildSourceHeaders(meta: {
  source: DataSourceId;
  stale?: boolean;
  fallbackUsed?: boolean;
  awaiting?: boolean;
  fetchedAt?: string | null;
  servedAt?: string;
}): Record<string, string> {
  return {
    "X-Data-Source": meta.source,
    "X-Data-Stale": meta.stale ? "true" : "false",
    "X-Fallback-Used": meta.fallbackUsed ? "true" : "false",
    "X-Data-Awaiting": meta.awaiting ? "true" : "false",
    ...(meta.fetchedAt ? { "X-Fetched-At": meta.fetchedAt } : {}),
    ...(meta.servedAt ? { "X-Served-At": meta.servedAt } : {}),
  };
}

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
    ...buildSourceHeaders({
      source: responseMeta.source,
      stale: responseMeta.stale,
      fallbackUsed: responseMeta.fallbackUsed,
      awaiting: responseMeta.awaiting,
      fetchedAt: responseMeta.fetchedAt,
      servedAt: responseMeta.servedAt,
    }),
    ...(responseMeta.blockHeight != null ? { "X-Block-Height": String(responseMeta.blockHeight) } : {}),
    ...(options.extraHeaders ?? {}),
  };

  return NextResponse.json({ ...body, _meta: responseMeta }, { status: options.status ?? 200, headers });
}

export function apiErrorResponse(message: string, status: number = 500, extraHeaders?: Record<string, string>): NextResponse {
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
