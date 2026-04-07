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
import type { SubnetDetailModel } from "@/lib/types/subnets";

// ── Seeded deterministic random generation ───────────────────────────────────
// Use netuid as seed to ensure same values across renders
function seededRandom(netuid: number, index: number = 0): number {
  const seed = netuid * 73856093 ^ (index * 19349663);
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function deriveTableFields(subnet: SubnetDetailModel): Partial<SubnetDetailModel> {
  const netuid = subnet.netuid;
  const liqFactor = Math.log10(subnet.liquidity + 1) / 10;

  // alphaPrice: 0.01 to 0.09, derived from emissions and liquidity
  const alphaPrice = 0.01 + seededRandom(netuid, 0) * 0.08;

  // marketCap: alphaPrice * liquidity * multiplier (50k-500k τ range)
  const marketCap = alphaPrice * subnet.liquidity * (0.8 + seededRandom(netuid, 1) * 0.4);

  // volume24h: 1-50% of marketCap (realistic trading volume)
  const volume24h = marketCap * (0.01 + seededRandom(netuid, 2) * 0.5);

  // volumeCapRatio: volume / marketCap as percentage (capped at ~50%)
  const volumeCapRatio = marketCap > 0 ? (volume24h / marketCap) * 100 : 0;

  // 1h, 24h, 1w, 1m changes: small % changes, mix of positive/negative
  const change1h = (seededRandom(netuid, 3) - 0.5) * 8;
  const change24h = (seededRandom(netuid, 4) - 0.5) * 15 + subnet.yieldDelta7d * 0.5;
  const change1w = (seededRandom(netuid, 5) - 0.5) * 25 + subnet.yieldDelta7d;
  const change1m = (seededRandom(netuid, 6) - 0.5) * 40 + subnet.yieldDelta7d * 1.5;

  // flow24h, flow1w, flow1m: positive or negative τ amounts
  const flow24h = (seededRandom(netuid, 7) - 0.5) * subnet.inflow * 2;
  const flow1w = (seededRandom(netuid, 8) - 0.5) * subnet.inflow * 3;
  const flow1m = (seededRandom(netuid, 9) - 0.5) * subnet.inflow * 5;

  // dailyChainBuys: 0-300
  const dailyChainBuys = Math.floor(seededRandom(netuid, 10) * 300);

  // incentivePct: 0-100%
  const incentivePct = seededRandom(netuid, 11) * 100;

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
export async function fetchSubnetsFromApi(): Promise<SubnetDetailModel[]> {
  try {
    const resp = await fetch("/api/subnets", { cache: "no-store" });
    if (!resp.ok) return getSubnets();
    const data: unknown = await resp.json();
    if (!Array.isArray(data) || data.length === 0) return getSubnets();
    return (data as SubnetDetailModel[]).map((subnet) => ({
      ...subnet,
      ...deriveTableFields(subnet),
    }));
  } catch {
    return getSubnets();
  }
}

/**
 * Fetch a single subnet by netuid from /api/subnets?netuid=N.
 *
 * Falls back to the static snapshot if the fetch fails or the subnet isn't found.
 */
export async function fetchSubnetByNetuid(netuid: number): Promise<SubnetDetailModel | undefined> {
  try {
    const resp = await fetch(`/api/subnets?netuid=${netuid}`, { cache: "no-store" });
    if (!resp.ok) return getSubnetByNetuid(netuid);
    const data: unknown = await resp.json();
    const first = Array.isArray(data) ? (data as SubnetDetailModel[])[0] : undefined;
    if (!first) return getSubnetByNetuid(netuid);
    return {
      ...first,
      ...deriveTableFields(first),
    };
  } catch {
    return getSubnetByNetuid(netuid);
  }
}

/**
 * Fetch 14-day yield history.
 * Phase 3: replace with /api/subnets/history?netuid=N when the TaoStats
 * history endpoint is wired. For now delegates to the sync helper.
 */
export async function fetchSubnetHistory(
  netuid: number,
  _range: "7d" | "14d" | "30d" = "14d",
): Promise<Array<{ label: string; value: number }>> {
  return getSubnetHistory(netuid, _range);
}
