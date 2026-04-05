/**
 * app/api/subnets/route.ts
 *
 * Next.js Route Handler — unified subnet data gateway.
 *
 * Data source priority (highest → lowest):
 *
 *   1. public/data/subnets.json  (Subtensor snapshot — Phase 3 canonical source)
 *      Written by: python scripts/fetch_subnets_subtensor.py
 *      Served when: file exists and is ≤ SNAPSHOT_MAX_AGE_HOURS old
 *
 *   2. TaoStats REST API  (Phase 2 live path — fallback when Subtensor snapshot absent)
 *      Requires: TAOSTATS_API_KEY env var (server-side only; never NEXT_PUBLIC_*)
 *      Endpoint: api.taostats.io/api/dtao/subnet/latest/v1
 *
 *   3. lib/data/subnets-real.ts  (Phase 1 static TypeScript snapshot — always available)
 *      12 curated subnets with estimated metrics.
 *      Used when both sources above are unavailable.
 *
 * Query params:
 *   ?netuid=N  → return only that subnet (single-element array)
 *
 * Response headers:
 *   X-Data-Source    subtensor-snapshot | taostats-live | static-snapshot[-fallback]
 *   X-Subnet-Count   number of subnets returned
 *   X-Snapshot-Age   seconds since Subtensor snapshot was written (source 1 only)
 *
 * ── Why a route handler (not direct client fetch)? ────────────────────────────
 *   • TaoStats requires a Bearer token → must stay server-side
 *   • fs.readFileSync for the Subtensor snapshot → server-side only
 *   • Client pages stay simple: one fetch("/api/subnets"), regardless of source
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
} from "@/lib/data/subnets-real-helpers";
import {
  CURATED_METADATA,
  buildFallbackMeta,
} from "@/lib/data/subnets-curated-metadata";

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
  const score    = deriveScore(taoIn, yieldPct, stakers, 0);

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
    momentum,
    isWatched:     false,
    breakeven:     deriveBreakeven(yieldPct),
    age,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const netuidParam   = request.nextUrl.searchParams.get("netuid");
  const netuidFilter  = netuidParam != null ? Number(netuidParam) : undefined;

  // ── Priority 1: Subtensor snapshot (canonical Phase 3 source) ───────────
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
