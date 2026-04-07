/**
 * app/api/subnets/route.ts
 *
 * Next.js Route Handler — unified subnet data gateway.
 *
 * Data source priority (highest → lowest):
 *
 *   0. Chain cache (live Subtensor data synced by /api/cron/sync-chain)
 *      Refreshed every 5 min by Vercel cron. Zero external dependencies.
 *
 *   1. public/data/subnets.json  (Subtensor snapshot — Python script)
 *      Written by: python scripts/fetch_subnets_subtensor.py
 *      Served when: file exists and is ≤ SNAPSHOT_MAX_AGE_HOURS old
 *
 *   2. TaoStats REST API  (fallback when chain sources unavailable)
 *      Requires: TAOSTATS_API_KEY env var (server-side only)
 *      Endpoint: api.taostats.io/api/dtao/subnet/latest/v1
 *
 *   3. lib/data/subnets-real.ts  (static TypeScript snapshot — always available)
 *      12 curated subnets with estimated metrics.
 *
 * Query params:
 *   ?netuid=N  → return only that subnet (single-element array)
 *
 * Response headers:
 *   X-Data-Source    chain-live | subtensor-snapshot | taostats-live | static-snapshot
 *   X-Subnet-Count   number of subnets returned
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
} from "@/lib/data/subnets-real-helpers";
import {
  CURATED_METADATA,
  buildFallbackMeta,
} from "@/lib/data/subnets-curated-metadata";
import { getSubnetCache, isSubnetCacheFresh, getSubnetCacheAgeMs, setSubnetCache, fetchSubnetsFromChain } from "@/lib/chain";
import type { ChainSubnet } from "@/lib/chain";

// ── Configuration ─────────────────────────────────────────────────────────────

const TAOSTATS_BASE = "https://api.taostats.io/api";

/** Reject the Subtensor snapshot if it is older than this many hours. */
const SNAPSHOT_MAX_AGE_HOURS = 2;

/** Path to the JSON file written by fetch_subnets_subtensor.py */
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
    const stat = statSync(SUBTENSOR_SNAPSHOT_PATH);
    const ageMs = Date.now() - stat.mtimeMs;
    const ageSeconds = Math.round(ageMs / 1000);

    const isStale = ageMs > SNAPSHOT_MAX_AGE_HOURS * 60 * 60 * 1000;

    if (isStale) {
      console.log(
        `[/api/subnets] Subtensor snapshot is ${Math.round(ageMs / 3600000)}h old — serving stale snapshot`
      );
    }

    const raw = readFileSync(SUBTENSOR_SNAPSHOT_PATH, "utf-8");
    const payload: SubtensorPayload = JSON.parse(raw);

    if (!Array.isArray(payload.subnets) || payload.subnets.length === 0) {
      return null;
    }

    const subnets = (netuidFilter != null
      ? payload.subnets.filter((s) => s.netuid === netuidFilter)
      : payload.subnets).map(hydrateSubnetMetadata);

    return { subnets, ageSeconds, isStale };
  } catch {
    // File doesn't exist or is malformed — fall through to next source
    return null;
  }
}

// ── Source 2: TaoStats live API ───────────────────────────────────────────────

/**
 * Map one TaoStats dtao/subnet/latest/v1 row to our Subnet interface.
 *
 * TaoStats field notes (verified from API responses):
 *   s.netuid                     → on-chain subnet ID
 *   s.subnet_name / s.name       → subnet name string
 *   s.alpha_token_symbol         → dTAO token ticker
 *   s.tao_in                     → total TAO in pool (may be RAO: ÷1e9)
 *   s.emission_per_day           → daily TAO emitted (may be RAO: ÷1e9)
 *   s.registered_neurons         → total registered miner+validator count
 *   s.max_take                   → max validator take as fraction 0–1
 *   s.blocks_since_registration  → blocks since subnet was created (~7200/day)
 */
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

  const yieldPct = deriveYield(emissionsPerDay, taoIn);
  const momentum = buildMomentum(yieldPct, 0);
  const risk     = deriveRisk(taoIn, stakers, 0);
  const score    = deriveScore(taoIn, yieldPct, stakers, 0, age);
  const confidence = deriveConfidence(taoIn, stakers, 0, age);

  return {
    id:            `sn${netuid}`,
    netuid,
    name:          meta.name,
    symbol:        meta.symbol,
    score,
    yield:         yieldPct,
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

// ── Source 0: Chain cache → SubnetDetailModel mapper ─────────────────────────

function mapChainSubnet(s: ChainSubnet): SubnetDetailModel {
  const meta = CURATED_METADATA[s.netuid] ?? buildFallbackMeta(s.netuid, s.name, s.symbol);

  const yieldPct   = deriveYield(s.emissionPerDay, s.taoIn);
  const momentum   = buildMomentum(yieldPct, 0);
  const risk       = deriveRisk(s.taoIn, s.stakers, 0);
  const score      = deriveScore(s.taoIn, yieldPct, s.stakers, 0, s.ageDays);
  const confidence = deriveConfidence(s.taoIn, s.stakers, 0, s.ageDays);

  return {
    id:            `sn${s.netuid}`,
    netuid:        s.netuid,
    name:          (s.name && !s.name.includes("{")) ? s.name : meta.name,
    symbol:        (s.symbol && !s.symbol.includes("{")) ? s.symbol : meta.symbol,
    score,
    yield:         yieldPct,
    yieldDelta7d:  0,
    inflow:        0,
    inflowPct:     0,
    risk,
    liquidity:     s.taoIn,
    stakers:       s.stakers,
    emissions:     s.emissionPerDay,
    validatorTake: 18,
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
    age:           s.ageDays,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const netuidParam   = request.nextUrl.searchParams.get("netuid");
  const netuidFilter  = netuidParam != null ? Number(netuidParam) : undefined;

  // ── Priority 0: Chain cache (live Subtensor data from cron) ────────────
  const chainCache = getSubnetCache();
  if (chainCache && isSubnetCacheFresh()) {
    const chainSubnets = (netuidFilter != null
      ? chainCache.subnets.filter((s) => s.netuid === netuidFilter)
      : chainCache.subnets
    ).map(mapChainSubnet).sort((a, b) => a.netuid - b.netuid);

    if (chainSubnets.length > 0) {
      const ageMs = getSubnetCacheAgeMs();
      return NextResponse.json(chainSubnets, {
        headers: {
          "X-Data-Source":  "chain-live",
          "X-Subnet-Count": String(chainSubnets.length),
          "X-Block-Height": String(chainCache.blockHeight),
          "X-Cache-Age":    String(Math.round(ageMs / 1000)),
          "Cache-Control":  "public, s-maxage=120",
        },
      });
    }
  }

  // ── Priority 0b: On-demand chain fetch (self-heals cold instances) ─────
  // The cron populates cache in its own serverless instance, which may
  // differ from this one. If cache is cold, fetch directly from chain
  // and warm this instance's cache for subsequent requests.
  try {
    console.log("[/api/subnets] Chain cache cold — attempting on-demand fetch...");
    const freshSnapshot = await fetchSubnetsFromChain();
    if (freshSnapshot && freshSnapshot.subnets.length > 0) {
      setSubnetCache(freshSnapshot);
      const chainSubnets = (netuidFilter != null
        ? freshSnapshot.subnets.filter((s) => s.netuid === netuidFilter)
        : freshSnapshot.subnets
      ).map(mapChainSubnet).sort((a, b) => a.netuid - b.netuid);

      if (chainSubnets.length > 0) {
        return NextResponse.json(chainSubnets, {
          headers: {
            "X-Data-Source":  "chain-on-demand",
            "X-Subnet-Count": String(chainSubnets.length),
            "X-Block-Height": String(freshSnapshot.blockHeight),
            "Cache-Control":  "public, s-maxage=120",
          },
        });
      }
    }
  } catch (err) {
    console.error("[/api/subnets] On-demand chain fetch failed:", err);
    // Fall through to snapshot/TaoStats
  }

  // ── Priority 1: Subtensor snapshot (Python script output) ──────────────
  const snapshot = readSubtensorSnapshot(netuidFilter);
  if (snapshot) {
    return NextResponse.json(snapshot.subnets, {
      headers: {
        "X-Data-Source":   snapshot.isStale ? "subtensor-snapshot-stale" : "subtensor-snapshot",
        "X-Subnet-Count":  String(snapshot.subnets.length),
        "X-Snapshot-Age":  String(snapshot.ageSeconds),
        "X-Snapshot-Stale": String(snapshot.isStale),
        "Cache-Control":   "public, s-maxage=300",
      },
    });
  }

  // ── Priority 2: TaoStats live API ───────────────────────────────────────
  const apiKey = process.env.TAOSTATS_API_KEY ?? "";
  if (apiKey) {
    try {
      const url = netuidFilter != null
        ? `${TAOSTATS_BASE}/dtao/subnet/latest/v1?netuid=${netuidFilter}`
        : `${TAOSTATS_BASE}/dtao/subnet/latest/v1?limit=256`;

      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "User-Agent": "tao-navigator/3.0",
        },
        next: { revalidate: 60 },
      });

      if (!resp.ok) throw new Error(`TaoStats returned HTTP ${resp.status}`);

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
      // Fall through to static snapshot
    }
  }

  // ── Priority 3: Static TypeScript snapshot (always available) ───────────
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
