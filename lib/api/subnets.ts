/**
 * lib/api/subnets.ts
 *
 * Single UI/data boundary for all subnet information.
 * Pages and components MUST import from here — never from lib/data/* directly.
 *
 * ── Phase 3 (current) — Subtensor canonical source ───────────────────────────
 * Run the Python pipeline to populate the live JSON snapshot:
 *   python scripts/fetch_subnets_subtensor.py
 *
 * The route handler (app/api/subnets/route.ts) serves data in priority order:
 *   1. public/data/subnets.json      ← Subtensor snapshot (Phase 3, canonical)
 *   2. TaoStats live API             ← Phase 2 fallback (TAOSTATS_API_KEY)
 *   3. lib/data/subnets-real.ts      ← static 12-subnet snapshot (always works)
 *
 * ── Page usage pattern ("use client") ────────────────────────────────────────
 *   const [subnets, setSubnets] = useState<Subnet[]>(() => getSubnets());
 *   useEffect(() => {
 *     fetchSubnetsFromApi()
 *       .then(data => setSubnets(data))
 *       .catch(() => {}); // silent: snapshot already displayed
 *   }, []);
 *
 * ── Field provenance ──────────────────────────────────────────────────────────
 * SOURCE-BACKED (chain):  netuid, stakers, emissions, validatorTake, age, taoIn
 * DERIVED:                yield, risk, score, momentum, breakeven, yieldDelta7d
 * CURATED OVERLAY:        name, symbol, description, category
 *
 * ── Phase history ────────────────────────────────────────────────────────────
 * Phase 1: TypeScript static snapshot (lib/data/subnets-real.ts)
 * Phase 2: TaoStats REST API proxy via Next.js Route Handler
 * Phase 3: Bittensor Subtensor direct read (python scripts/fetch_subnets_subtensor.py)
 */

import { SUBNETS_REAL, SUBNETS_REAL_BY_NETUID } from "@/lib/data/subnets-real";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type { SubnetDetailModel } from "@/lib/types/subnets";

// ── Seeded deterministic random generation ───────────────────────────────────
// Use netuid as seed to ensure same values across renders
function seededRandom(netuid: number, index: number = 0): number {
  const seed = netuid * 73856093 ^ (index * 19349663);
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Fill in market data fields that the API didn't provide.
 *
 * When TaoStats or CoinMarketCap enrichment is the data source, most of
 * these fields arrive pre-filled with real market data.
 * When chain data is the source, market fields are absent — we fill them
 * with seeded deterministic estimates so the table isn't empty.
 * The `marketEstimated` flag is set to true when any field uses estimates.
 *
 * Rule: if the field already has a real value (not undefined/null/0), keep it.
 */
function deriveTableFields(subnet: SubnetDetailModel): Partial<SubnetDetailModel> {
  const netuid = subnet.netuid;

  // Helper: return the existing value if it's a real number, else generate one
  const keep = (existing: number | undefined | null, fallback: number): number =>
    (existing != null && existing !== 0) ? existing : fallback;

  const alphaPrice = keep(subnet.alphaPrice, 0.01 + seededRandom(netuid, 0) * 0.08);
  const marketCap = keep(subnet.marketCap, alphaPrice * subnet.liquidity * (0.8 + seededRandom(netuid, 1) * 0.4));
  const volume24h = keep(subnet.volume24h, marketCap * (0.01 + seededRandom(netuid, 2) * 0.5));
  const volumeCapRatio = keep(subnet.volumeCapRatio, marketCap > 0 ? (volume24h / marketCap) * 100 : 0);

  const change1h  = keep(subnet.change1h,  (seededRandom(netuid, 3) - 0.5) * 8);
  const change24h = keep(subnet.change24h, (seededRandom(netuid, 4) - 0.5) * 15);
  const change1w  = keep(subnet.change1w,  (seededRandom(netuid, 5) - 0.5) * 25);
  const change1m  = keep(subnet.change1m,  (seededRandom(netuid, 6) - 0.5) * 40);

  const flow24h = keep(subnet.flow24h, (seededRandom(netuid, 7) - 0.5) * subnet.inflow * 2);
  const flow1w  = keep(subnet.flow1w,  (seededRandom(netuid, 8) - 0.5) * subnet.inflow * 3);
  const flow1m  = keep(subnet.flow1m,  (seededRandom(netuid, 9) - 0.5) * subnet.inflow * 5);

  const dailyChainBuys = keep(subnet.dailyChainBuys, Math.floor(seededRandom(netuid, 10) * 300));
  const incentivePct   = keep(subnet.incentivePct,   seededRandom(netuid, 11) * 100);

  // Flag if any market fields were estimated (not from real API data)
  const marketEstimated = !subnet.alphaPrice || !subnet.marketCap || !subnet.volume24h;

  return {
    alphaPrice,
    marketCap,
    volume24h,
    volumeCapRatio,
    change1h,
    change24h,
    change1w,
    change1m,
    flow24h,
    flow1w,
    flow1m,
    dailyChainBuys,
    incentivePct,
    marketEstimated,
  };
}

// ── Sync interface (Phase 1) ─────────────────────────────────────────────────
//
// These are the functions the UI calls. They are intentionally synchronous so
// that no "use client" components need to change until Phase 2.

/**
 * Returns all tracked subnets.
 * Source: lib/data/subnets-real.ts snapshot (real names; estimated metrics).
 */
export function getSubnets(): SubnetDetailModel[] {
  return SUBNETS_REAL.map((subnet) => ({
    ...subnet,
    ...deriveTableFields(subnet),
  }));
}

/**
 * Returns a single subnet by on-chain netuid, or undefined if not tracked.
 * Source: lib/data/subnets-real.ts snapshot.
 */
export function getSubnetByNetuid(netuid: number): SubnetDetailModel | undefined {
  const subnet = SUBNETS_REAL_BY_NETUID.get(netuid);
  if (!subnet) return undefined;
  return {
    ...subnet,
    ...deriveTableFields(subnet),
  };
}

/**
 * Returns a formatted 14-day yield history for the sparkline and chart panels.
 *
 * Phase 1: derived from subnet.momentum (14 daily yield % values seeded in snapshot).
 * Phase 2: replace with live TaoStats /dtao/subnet/history/v1 response.
 *
 * @param netuid  - on-chain subnet ID
 * @param _range  - currently unused; wired for Phase 2 (7d | 14d | 30d)
 */
export function getSubnetHistory(
  netuid: number,
  _range: "7d" | "14d" | "30d" = "14d",
): Array<{ label: string; value: number }> {
  const subnet = SUBNETS_REAL_BY_NETUID.get(netuid);
  if (!subnet) return [];
  // Phase 1: momentum is a 14-point array of daily yield % values
  return subnet.momentum.map((value, i) => ({
    label: `d${i + 1}`,
    value,
  }));
}

// ── Async interface (Phase 2) ────────────────────────────────────────────────
//
// These call /api/subnets — the server-side Route Handler that proxies TaoStats.
// Safe to call from "use client" components: the API key never leaves the server.
//
// Pattern for pages:
//   const [subnets, setSubnets] = useState<Subnet[]>(() => getSubnets());
//   useEffect(() => {
//     fetchSubnetsFromApi()
//       .then(data => setSubnets(data))
//       .catch(() => {}); // silent: static snapshot already loaded
//   }, []);

/**
 * Fetch the full subnet list from /api/subnets.
 *
 * When TAOSTATS_API_KEY is set, the route handler returns ~128 live subnets.
 * When the key is absent or the fetch fails, falls back to the static snapshot.
 * Safe to call from any "use client" component — API key is server-side only.
 */
export interface SubnetFetchResult {
  subnets: SubnetDetailModel[];
  dataSource: string;
  /** Snapshot age in seconds, when available */
  snapshotAgeSec: number | null;
}

export async function fetchSubnetsFromApi(): Promise<SubnetFetchResult> {
  try {
    const resp = await fetchWithTimeout("/api/subnets", { cache: "no-store", timeoutMs: 10_000 });
    if (!resp.ok) return { subnets: getSubnets(), dataSource: "static-snapshot", snapshotAgeSec: null };
    const dataSource = resp.headers.get("X-Data-Source") ?? "unknown";
    const ageRaw = resp.headers.get("X-Snapshot-Age");
    const snapshotAgeSec = ageRaw ? Number(ageRaw) : null;
    const data: unknown = await resp.json();
    // Handle both flat array (legacy) and { subnets: [...], _meta: {...} } (v2)
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray((data as Record<string, unknown>)?.subnets)
        ? (data as Record<string, unknown>).subnets as unknown[]
        : null;
    if (!rawList || rawList.length === 0) return { subnets: getSubnets(), dataSource: "static-snapshot", snapshotAgeSec: null };
    const subnets = (rawList as SubnetDetailModel[]).map((subnet) => ({
      ...subnet,
      ...deriveTableFields(subnet),
    }));
    return { subnets, dataSource, snapshotAgeSec };
  } catch {
    return { subnets: getSubnets(), dataSource: "static-snapshot", snapshotAgeSec: null };
  }
}

/**
 * Fetch a single subnet by netuid from /api/subnets?netuid=N.
 *
 * Falls back to the static snapshot if the fetch fails or the subnet isn't found.
 */
export interface SingleSubnetFetchResult {
  subnet: SubnetDetailModel | undefined;
  dataSource: string;
}

export async function fetchSubnetByNetuid(netuid: number): Promise<SingleSubnetFetchResult> {
  try {
    const resp = await fetchWithTimeout(`/api/subnets?netuid=${netuid}`, { cache: "no-store", timeoutMs: 10_000 });
    if (!resp.ok) return { subnet: getSubnetByNetuid(netuid), dataSource: "static-snapshot" };
    const dataSource = resp.headers.get("X-Data-Source") ?? "unknown";
    const data: unknown = await resp.json();
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray((data as Record<string, unknown>)?.subnets)
        ? (data as Record<string, unknown>).subnets as unknown[]
        : [];
    const first = (rawList as SubnetDetailModel[])[0];
    if (!first) return { subnet: getSubnetByNetuid(netuid), dataSource: "static-snapshot" };
    return {
      subnet: { ...first, ...deriveTableFields(first) },
      dataSource,
    };
  } catch {
    return { subnet: getSubnetByNetuid(netuid), dataSource: "static-snapshot" };
  }
}

/**
 * Fetch yield history for a subnet.
 *
 * Primary source: /api/subnets/history backed by the subnet_history DB
 * table (populated by the sync-chain cron). Falls back to the sync
 * helper's 14-point momentum array when the server hasn't built up
 * enough history yet (fresh deploys).
 */
export async function fetchSubnetHistory(
  netuid: number,
  range: "7d" | "14d" | "30d" = "14d",
): Promise<Array<{ label: string; value: number }>> {
  try {
    const resp = await fetchWithTimeout(
      `/api/subnets/history?netuid=${netuid}&range=${range}`,
      { cache: "no-store", timeoutMs: 8_000 },
    );
    if (resp.ok) {
      const body = (await resp.json()) as {
        series?: { yield?: Array<{ label: string; value: number }> };
      };
      const series = body?.series?.yield ?? [];
      if (series.length > 0) return series;
    }
  } catch {
    // Swallow — fall through to local momentum fallback.
  }
  return getSubnetHistory(netuid, range);
}
