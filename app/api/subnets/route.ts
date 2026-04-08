/**
 * app/api/subnets/route.ts
 *
 * Next.js Route Handler -- unified subnet data gateway.
 *
 * Data source priority (highest to lowest):
 *   0. In-memory cache from cron/sync-chain (live chain data, 5min TTL)
 *   1. public/data/subnets.json  (Subtensor snapshot, uses _meta.fetched_at)
 *   2. TaoStats REST API  (fallback)
 *   3. lib/data/subnets-real.ts  (static TypeScript snapshot)
 *
 * Market enrichment (best-effort):
 *   CoinMarketCap TAO/USD quote + on-chain pool ratios for per-subnet
 *   alpha prices, falling back to TaoStats dtao/subnet market data.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, statSync } from "fs";
import { join } from "path";
import type { SubnetDetailModel } from "@/lib/types/subnets";
import { SUBNETS_REAL } from "@/lib/data/subnets-real";
import {
  deriveRisk,
  deriveScore,
  buildMomentum,
  deriveBreakeven,
  deriveYield,
  deriveConfidence,
  deriveNormalizedYield,
} from "@/lib/data/subnets-real-helpers";
import {
  CURATED_METADATA,
  buildFallbackMeta,
} from "@/lib/data/subnets-curated-metadata";
import {
  getMarketData,
  isMarketCacheFresh,
  refreshMarketCache,
} from "@/lib/chain/market-cache";
import {
  getSubnetCache,
  isSubnetCacheFresh,
  getSubnetCacheAgeMs,
} from "@/lib/chain/cache";
import { isAllowedInternalOrigin } from "@/lib/api/internal-origin";

// ── Configuration ─────────────────────────────────────────────────────────────

const TAOSTATS_BASE = "https://api.taostats.io/api";
const SNAPSHOT_MAX_AGE_HOURS = 2;
const SUBTENSOR_SNAPSHOT_PATH = join(process.cwd(), "public", "data", "subnets.json");

// ── Source 1: Subtensor JSON snapshot ─────────────────────────────────────────

interface SubtensorPayload {
  _meta?: {
    fetched_at?: string;
    subnet_count?: number;
    schema_version?: number;
  };
  subnets: SubnetDetailModel[];
}

function hydrateSubnetMetadata(subnet: SubnetDetailModel): SubnetDetailModel {
  const sourceName = subnet.name?.startsWith("SN{") ? undefined : subnet.name;
  const sourceSymbol = subnet.symbol?.startsWith("SN{") ? undefined : subnet.symbol;
  const meta = CURATED_METADATA[subnet.netuid] ?? buildFallbackMeta(subnet.netuid, sourceName, sourceSymbol);

  return {
    ...subnet,
    name: subnet.name && !subnet.name.includes("{") ? subnet.name : meta.name,
    symbol: subnet.symbol && !subnet.symbol.includes("{") ? subnet.symbol : meta.symbol,
    description: subnet.description || meta.description,
    summary: subnet.summary ?? meta.summary,
    thesis: subnet.thesis ?? meta.thesis,
    useCases: subnet.useCases ?? meta.useCases,
    links: subnet.links ?? meta.links,
    category: subnet.category || meta.category,
  };
}

function readSubtensorSnapshot(netuidFilter?: number): {
  subnets: SubnetDetailModel[];
  ageSeconds: number;
  isStale: boolean;
} | null {
  try {
    const raw = readFileSync(SUBTENSOR_SNAPSHOT_PATH, "utf-8");
    const payload: SubtensorPayload = JSON.parse(raw);

    if (!Array.isArray(payload.subnets) || payload.subnets.length === 0) {
      return null;
    }

    // Use fetched_at from JSON metadata (reliable) instead of filesystem mtime
    // (mtime is unreliable on Vercel serverless — often reflects build time, not data freshness)
    let ageMs: number;
    if (payload._meta?.fetched_at) {
      ageMs = Date.now() - new Date(payload._meta.fetched_at).getTime();
    } else {
      const stat = statSync(SUBTENSOR_SNAPSHOT_PATH);
      ageMs = Date.now() - stat.mtimeMs;
    }

    const ageSeconds = Math.round(ageMs / 1000);
    const isStale = ageMs > SNAPSHOT_MAX_AGE_HOURS * 60 * 60 * 1000;

    if (isStale) {
      console.log(
        "[/api/subnets] Subtensor snapshot is " + Math.round(ageMs / 3600000) + "h old -- serving stale snapshot"
      );
    }

    const subnets = (netuidFilter != null
      ? payload.subnets.filter((s) => s.netuid === netuidFilter)
      : payload.subnets).map(hydrateSubnetMetadata);

    return { subnets, ageSeconds, isStale };
  } catch {
    return null;
  }
}

// ── Source 2: TaoStats live API ───────────────────────────────────────────────

function mapTaoStatsRow(s: Record<string, unknown>): SubnetDetailModel {
  const netuid = Number(s.netuid ?? 0);

  const sourceName   = String(s.subnet_name ?? s.name ?? "");
  const sourceSymbol = String(s.alpha_token_symbol ?? s.symbol ?? "");
  const meta = CURATED_METADATA[netuid] ?? buildFallbackMeta(netuid, sourceName, sourceSymbol);

  let taoIn = Number(s.tao_in ?? s.total_tao_locked ?? s.total_stake ?? 0);
  if (taoIn > 1e9) taoIn /= 1e9;

  let emissionsPerDay = Number(s.emission_per_day ?? s.emission ?? 0);
  if (emissionsPerDay > 1e6) emissionsPerDay /= 1e9;

  const stakers       = Number(s.registered_neurons ?? s.active_keys ?? s.registered_keys ?? 0);
  const validatorTake = s.max_take != null ? Math.round(Number(s.max_take) * 100) : 18;

  const ageBlocks = Number(s.blocks_since_registration ?? s.created_at_block ?? 0);
  const age       = ageBlocks > 0 ? Math.round(ageBlocks / 7200) : 180;

  const rawYield = deriveYield(emissionsPerDay, taoIn);
  const risk     = deriveRisk(taoIn, stakers, 0);
  const confidence = deriveConfidence(taoIn, stakers, 0, age);
  const yieldPct = deriveNormalizedYield(rawYield, taoIn, stakers, age, confidence);
  const momentum = buildMomentum(yieldPct, 0);
  const score    = deriveScore(taoIn, yieldPct, stakers, 0, age);

  return {
    id:            "sn" + netuid,
    netuid,
    name:          meta.name,
    symbol:        meta.symbol,
    score,
    yield:         yieldPct,
    rawYield:      rawYield,
    yieldDelta7d:  0,
    inflow:        0,
    inflowPct:     0,
    risk,
    liquidity:     +taoIn.toFixed(1),
    stakers,
    emissions:     +emissionsPerDay.toFixed(3),
    validatorTake,
    description:   meta.description,
    summary:       meta.summary,
    thesis:        meta.thesis,
    useCases:      meta.useCases,
    links:         meta.links,
    category:      meta.category,
    confidence,
    momentum,
    isWatched:     false,
    breakeven:     deriveBreakeven(yieldPct),
    age,
  };
}

// ── Market enrichment helper ─────────────────────────────────────────────────

function enrichWithMarketData(subnets: SubnetDetailModel[]): SubnetDetailModel[] {
  return subnets.map((s) => {
    const market = isMarketCacheFresh() ? getMarketData(s.netuid) : undefined;
    if (!market) return s;
    return {
      ...s,
      alphaPrice: market.alphaPrice,
      marketCap: market.marketCap,
      volume24h: market.volume24h,
      change1h: market.change1h,
      change24h: market.change24h,
      change1w: market.change1w,
      change1m: market.change1m,
      flow24h: market.flow24h,
      flow1w: market.flow1w,
      flow1m: market.flow1m,
    };
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const netuidParam   = request.nextUrl.searchParams.get("netuid");
  const netuidFilter  = netuidParam != null ? Number(netuidParam) : undefined;

  if (!isAllowedInternalOrigin(request)) {
    return NextResponse.json(
      { error: "This endpoint is for Tyvera frontend use only." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  // ── Priority 0: In-memory cache from cron/sync-chain ───────────
  const chainCache = getSubnetCache();
  if (chainCache && isSubnetCacheFresh()) {
    let chainSubnets = chainCache.subnets
      .filter((cs) => cs.netuid !== 0)
      .map((cs) => {
        const rawYield = deriveYield(cs.emissionPerDay, cs.taoIn);
        const risk = deriveRisk(cs.taoIn, cs.stakers, 0);
        const confidence = deriveConfidence(cs.taoIn, cs.stakers, 0, cs.ageDays);
        const yieldPct = deriveNormalizedYield(rawYield, cs.taoIn, cs.stakers, cs.ageDays, confidence);
        const score = deriveScore(cs.taoIn, yieldPct, cs.stakers, 0, cs.ageDays);
        const momentum = buildMomentum(yieldPct, 0);
        const partial: SubnetDetailModel = {
          id: "sn" + cs.netuid,
          netuid: cs.netuid,
          name: cs.name,
          symbol: cs.symbol,
          score,
          yield: yieldPct,
          rawYield: rawYield,
          yieldDelta7d: 0,
          inflow: 0,
          inflowPct: 0,
          risk,
          liquidity: +cs.taoIn.toFixed(1),
          stakers: cs.stakers,
          emissions: +cs.emissionPerDay.toFixed(3),
          validatorTake: 18,
          description: "",
          summary: "",
          thesis: [],
          useCases: [],
          links: {},
          category: "Other",
          confidence,
          momentum,
          isWatched: false,
          breakeven: deriveBreakeven(yieldPct),
          age: cs.ageDays,
        };
        return hydrateSubnetMetadata(partial);
      });
    if (netuidFilter != null) {
      chainSubnets = chainSubnets.filter((s) => s.netuid === netuidFilter);
    }
    const cacheAgeSec = Math.round(getSubnetCacheAgeMs() / 1000);
    const enriched = enrichWithMarketData(chainSubnets);

    return NextResponse.json(enriched, {
      headers: {
        "X-Data-Source":    "chain-cache",
        "X-Subnet-Count":  String(enriched.length),
        "X-Snapshot-Age":  String(cacheAgeSec),
        "X-Snapshot-Stale": "false",
        "X-Market-Enriched": String(isMarketCacheFresh()),
        "Cache-Control":   "public, s-maxage=60",
      },
    });
  }

  // ── Priority 1: Fresh subtensor snapshot (< 2h old) ───────────
  const snapshot = readSubtensorSnapshot(netuidFilter);
  if (snapshot && !snapshot.isStale) {
    // Best-effort market enrichment
    if (!isMarketCacheFresh()) {
      await refreshMarketCache(
        snapshot.subnets.map((s) => ({
          netuid: s.netuid,
          tao_in: s.liquidity,
          alpha_in: (s as unknown as Record<string, unknown>).alpha_in as number | undefined,
          liquidity: s.liquidity,
        })),
      ).catch(() => false);
    }

    const enriched = enrichWithMarketData(snapshot.subnets);

    return NextResponse.json(enriched, {
      headers: {
        "X-Data-Source":    "subtensor-snapshot",
        "X-Subnet-Count":  String(enriched.length),
        "X-Snapshot-Age":  String(snapshot.ageSeconds),
        "X-Snapshot-Stale": "false",
        "X-Market-Enriched": String(isMarketCacheFresh()),
        "Cache-Control":   "public, s-maxage=300",
      },
    });
  }

  // ── Priority 2: TaoStats live API (preferred when snapshot is stale) ───────
  const apiKey = process.env.TAOSTATS_API_KEY ?? "";
  if (apiKey) {
    try {
      const url = netuidFilter != null
        ? TAOSTATS_BASE + "/dtao/subnet/latest/v1?netuid=" + netuidFilter
        : TAOSTATS_BASE + "/dtao/subnet/latest/v1?limit=256";

      const resp = await fetch(url, {
        headers: {
          Authorization: "Bearer " + apiKey,
          Accept: "application/json",
          "User-Agent": "tao-navigator/3.0",
        },
        next: { revalidate: 60 },
      });

      if (!resp.ok) throw new Error("TaoStats returned HTTP " + resp.status);

      const body = await resp.json();
      const rows: Record<string, unknown>[] = Array.isArray(body)
        ? body
        : (body.data ?? []);

      const subnets: SubnetDetailModel[] = rows
        .filter((r) => Number(r.netuid) !== 0)
        .map(mapTaoStatsRow)
        .sort((a, b) => a.netuid - b.netuid);

      return NextResponse.json(subnets, {
        headers: {
          "X-Data-Source":  "taostats-live",
          "X-Subnet-Count": String(subnets.length),
          "Cache-Control":  "public, s-maxage=60",
        },
      });
    } catch (err) {
      console.error("[/api/subnets] TaoStats fetch failed:", err);
    }
  }

  // ── Priority 3: Stale snapshot (better than nothing) ───────────
  if (snapshot) {
    const enriched = enrichWithMarketData(snapshot.subnets);
    return NextResponse.json(enriched, {
      headers: {
        "X-Data-Source":    "subtensor-snapshot-stale",
        "X-Subnet-Count":  String(enriched.length),
        "X-Snapshot-Age":  String(snapshot.ageSeconds),
        "X-Snapshot-Stale": "true",
        "X-Market-Enriched": String(isMarketCacheFresh()),
        "Cache-Control":   "public, s-maxage=60",
      },
    });
  }

  // ── Priority 4: Static TypeScript snapshot ───────────
  const staticData = netuidFilter != null
    ? SUBNETS_REAL.filter((s) => s.netuid === netuidFilter)
    : SUBNETS_REAL;

  const isApiKeySet = apiKey.length > 0;
  return NextResponse.json(staticData, {
    headers: {
      "X-Data-Source":   isApiKeySet ? "static-snapshot-fallback" : "static-snapshot",
      "X-Subnet-Count":  String(staticData.length),
      "Cache-Control":   "public, s-maxage=300",
    },
  });
}
