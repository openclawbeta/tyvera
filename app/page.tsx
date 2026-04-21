/**
 * app/page.tsx — Server Component wrapper for the landing page.
 *
 * Fetches top-picks + root baseline at request time so the hero never
 * renders with "Loading…" placeholders on first paint. The client
 * component (app/home-client.tsx) uses these values as initial state
 * and still refreshes on mount for longer-running sessions.
 *
 * Cached at the route level for 120s to keep TTFB snappy while ensuring
 * hero numbers stay reasonably fresh.
 */

import HomeClient, { type LandingInitialData } from "./home-client";

export const revalidate = 120; // 2 min route-level cache

interface RawSubnet {
  netuid: number;
  name: string;
  yield: number;
  emissions: number;
  risk: string;
  liquidity: number;
  yieldDelta7d: number;
  thesis?: string[];
  stakers?: number;
  score?: number;
}

function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://tyvera.ai";
}

async function getInitialSubnets(): Promise<RawSubnet[] | null> {
  const base = baseUrl();
  try {
    const res = await fetch(`${base}/api/subnets`, {
      // Satisfy the internal-origin gate on /api/subnets without
      // leaking cookies or credentials.
      headers: { Referer: `${base}/` },
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    const raw = await res.json();
    if (Array.isArray(raw)) return raw as RawSubnet[];
    if (raw && Array.isArray(raw.subnets)) return raw.subnets as RawSubnet[];
    return null;
  } catch {
    return null;
  }
}

function computeInitial(data: RawSubnet[] | null): LandingInitialData {
  const empty: LandingInitialData = {
    featured: [],
    rootAnnual: null,
    topDailyPct: null,
    ticker: [],
  };
  if (!data || data.length === 0) return empty;

  const root = data.find((s) => s.netuid === 0);
  const rootDaily =
    root && root.liquidity > 0 && root.emissions > 0
      ? (root.emissions / root.liquidity) * 100
      : null;
  const rootAnnual = rootDaily != null ? rootDaily * 365 : null;

  const alpha = data
    .filter((s) => s.netuid > 0 && s.emissions > 0 && s.liquidity > 0)
    .map((s) => {
      const dailyYield = (s.emissions / s.liquidity) * 100;
      const annualYield = dailyYield * 365;
      const vsRootPp = rootAnnual != null ? annualYield - rootAnnual : null;
      const thesisLine =
        Array.isArray(s.thesis) && s.thesis.length > 0 ? s.thesis[0] : null;
      return {
        ...s,
        dailyYield,
        annualYield,
        vsRootPp,
        thesisLine,
      };
    })
    .sort((a, b) => b.dailyYield - a.dailyYield);

  const ticker = alpha.slice(0, 12).map((s) => ({
    name: /^SN\d+$/.test(s.name) ? `SN${s.netuid}` : `SN${s.netuid} ${s.name}`,
    yield: `+${s.dailyYield.toFixed(2)}%/day`,
    up: s.dailyYield > 0,
  }));

  return {
    featured: alpha.slice(0, 3),
    rootAnnual,
    topDailyPct: alpha[0]?.dailyYield ?? null,
    ticker,
  };
}

export default async function Page() {
  const data = await getInitialSubnets();
  const initial = computeInitial(data);
  return <HomeClient initial={initial} />;
}
