/**
 * app/api/subnets/route.ts
 *
 * Next.js Route Handler -- unified subnet data gateway.
 *
 * Data source priority (highest to lowest):
 *   0. In-memory cache from cron/sync-chain   → T2 (chain-cache)
 *   1. public/data/subnets.json               → T3 (subtensor-snapshot)
 *   2. Stale subtensor snapshot               → T3 (subtensor-snapshot-stale)
 *   3. lib/data/subnets-real.ts               → T4 (static-snapshot)
 *
 * Market enrichment (best-effort):
 *   Price-engine TAO/USD + on-chain pool ratios → per-subnet alpha prices.
 */

import { NextRequest } from "next/server";
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
import {
  getRootMetricsCache,
  isRootMetricsCacheFresh,
} from "@/lib/chain/root-metrics";
import { isAllowedInternalOrigin } from "@/lib/api/internal-origin";
import {
  DATA_SOURCES,
  apiResponse,
  apiErrorResponse,
} from "@/lib/data-source-policy";

const SNAPSHOT_MAX_AGE_HOURS = 2;
const SUBTENSOR_SNAPSHOT_PATH = join(process.cwd(), "public", "data", "subnets.json");

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

function readSubtensorSnapshot(netuidFilter?: number) {
  try {
    const raw = readFileSync(SUBTENSOR_SNAPSHOT_PATH, "utf-8");
    const payload: SubtensorPayload = JSON.parse(raw);

    if (!Array.isArray(payload.subnets) || payload.subnets.length === 0) {
      return null;
    }

    let ageMs: number;
    let fetchedAt: string;
    if (payload._meta?.fetched_at) {
      fetchedAt = payload._meta.fetched_at;
      ageMs = Date.now() - new Date(fetchedAt).getTime();
    } else {
      const stat = statSync(SUBTENSOR_SNAPSHOT_PATH);
      ageMs = Date.now() - stat.mtimeMs;
      fetchedAt = new Date(stat.mtimeMs).toISOString();
    }

    const ageSeconds = Math.round(ageMs / 1000);
    const isStale = ageMs > SNAPSHOT_MAX_AGE_HOURS * 60 * 60 * 1000;

    const subnets = (netuidFilter != null
      ? payload.subnets.filter((s) => s.netuid === netuidFilter)
      : payload.subnets).map(hydrateSubnetMetadata);

    return { subnets, ageSeconds, isStale, fetchedAt };
  } catch {
    return null;
  }
}

/**
 * Build a SubnetDetailModel entry representing root (netuid 0) from the
 * live root-metrics cache. Returns null if there's no fresh data.
 *
 * Root is modeled as a pseudo-subnet so the rest of the UI stack
 * (including the recommendations engine) can compare it uniformly against
 * alpha subnets. Liquidity and yield are sourced from chain; volatility is
 * zero because root doesn't experience the same 7d swings alpha pools do.
 */
function buildRootSubnetEntry(): SubnetDetailModel | null {
  const root = getRootMetricsCache();
  if (!root) return null;
  if (!isRootMetricsCacheFresh()) return null;

  const yieldPct = root.yield;
  const liquidity = root.liquidity;
  const stakers = root.stakers;

  // Root has existed since genesis — cap age at 365d for scoring parity.
  const age = 365;

  return {
    id: "sn0",
    netuid: 0,
    name: "Root (TAO staking)",
    symbol: "τ",
    score: 0, // Will be computed on the client via deriveScore when needed
    yield: yieldPct,
    rawYield: yieldPct,
    yieldDelta7d: 0,
    inflow: 0,
    inflowPct: 0,
    risk: "LOW",
    liquidity,
    stakers,
    emissions: root.dailyEmission,
    validatorTake: 18,
    description:
      "Root network (netuid 0). Staking here delegates TAO directly to validators " +
      "and earns the root share of network emissions. Lower variance than alpha " +
      "subnets; no alpha token exposure.",
    summary: "TAO root staking — the network-wide baseline yield.",
    thesis: [
      "Lowest-variance yield in Bittensor — you earn the root emission share proportionally.",
      "No alpha token exposure, no subnet-specific risk.",
      "Liquidity figure is the total network stake across all hotkeys.",
    ],
    useCases: ["Baseline TAO yield", "Risk-off parking", "Idle treasury"],
    links: {},
    category: "Infrastructure",
    confidence: 95,
    momentum: Array.from({ length: 14 }, () => yieldPct),
    isWatched: false,
    breakeven: 1,
    age,
  };
}

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

export async function GET(request: NextRequest) {
  const netuidParam = request.nextUrl.searchParams.get("netuid");
  const netuidFilter = netuidParam != null ? Number(netuidParam) : undefined;

  if (!isAllowedInternalOrigin(request)) {
    return apiErrorResponse("This endpoint is for Tyvera frontend use only.", 403);
  }

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
          rawYield,
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

    // Inject live root (netuid 0) when root-metrics cache is fresh.
    // This lets the UI and recommender treat root uniformly with alpha subnets.
    const rootEntry = buildRootSubnetEntry();
    if (rootEntry) {
      chainSubnets = [rootEntry, ...chainSubnets];
    }

    if (netuidFilter != null) {
      chainSubnets = chainSubnets.filter((s) => s.netuid === netuidFilter);
    }

    const enriched = enrichWithMarketData(chainSubnets);

    return apiResponse(
      { subnets: enriched },
      {
        source: DATA_SOURCES.CHAIN_CACHE,
        fetchedAt: chainCache.fetchedAt,
        blockHeight: chainCache.blockHeight,
        snapshotAgeMs: getSubnetCacheAgeMs(),
      },
      {
        extraHeaders: {
          "X-Subnet-Count": String(enriched.length),
          "X-Market-Enriched": String(isMarketCacheFresh()),
          "X-Root-Live": rootEntry ? "true" : "false",
        },
      },
    );
  }

  const snapshot = readSubtensorSnapshot(netuidFilter);
  if (snapshot && !snapshot.isStale) {
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

    return apiResponse(
      { subnets: enriched },
      {
        source: DATA_SOURCES.SUBTENSOR_SNAPSHOT,
        fetchedAt: snapshot.fetchedAt,
        snapshotAgeMs: snapshot.ageSeconds * 1000,
      },
      {
        extraHeaders: {
          "X-Subnet-Count": String(enriched.length),
          "X-Market-Enriched": String(isMarketCacheFresh()),
        },
      },
    );
  }

  if (snapshot) {
    const enriched = enrichWithMarketData(snapshot.subnets);
    return apiResponse(
      { subnets: enriched },
      {
        source: DATA_SOURCES.SUBTENSOR_SNAPSHOT_STALE,
        fetchedAt: snapshot.fetchedAt,
        stale: true,
        fallbackUsed: true,
        snapshotAgeMs: snapshot.ageSeconds * 1000,
      },
      {
        extraHeaders: {
          "X-Subnet-Count": String(enriched.length),
          "X-Market-Enriched": String(isMarketCacheFresh()),
        },
      },
    );
  }

  const staticData = netuidFilter != null
    ? SUBNETS_REAL.filter((s) => s.netuid === netuidFilter)
    : SUBNETS_REAL;

  return apiResponse(
    { subnets: staticData },
    {
      source: DATA_SOURCES.STATIC_SNAPSHOT,
      fetchedAt: new Date(0).toISOString(),
      fallbackUsed: true,
      note: "All dynamic sources unavailable — serving compiled static snapshot",
    },
    {
      extraHeaders: { "X-Subnet-Count": String(staticData.length) },
    },
  );
}
