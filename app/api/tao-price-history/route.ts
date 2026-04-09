/**
 * app/api/tao-price-history/route.ts
 *
 * TAO price history endpoint.
 *
 * Priority:
 *   1. CoinGecko market_chart API  → T1
 *   2. Synthetic random walk       → T4
 */

import { NextRequest } from "next/server";
import { checkApiAuth, rateLimitHeaders } from "@/lib/api/auth-middleware";
import {
  DATA_SOURCES,
  apiResponse,
  type DataSourceId,
} from "@/lib/data-source-policy";

/* ─────────────────────────────────────────────────────────────────── */
/* Synthetic fallback                                                   */
/* ─────────────────────────────────────────────────────────────────── */

function generateSyntheticData(days: number): Array<{ date: string; price: number }> {
  const data: Array<{ date: string; price: number }> = [];
  const now = new Date();
  let price = 320;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const randomChange = (Math.random() - 0.48) * 8;
    price = Math.max(250, Math.min(400, price + randomChange));
    data.push({
      date: date.toISOString().split("T")[0],
      price: Math.round(price * 100) / 100,
    });
  }

  return data;
}

function calculateChanges(
  prices: Array<{ date: string; price: number }>
): { change24h: number; change7d: number; change30d: number } {
  if (prices.length === 0) {
    return { change24h: 0, change7d: 0, change30d: 0 };
  }

  const current = prices[prices.length - 1].price;
  const price24hAgo = prices.length > 1 ? prices[prices.length - 2].price : current;
  const change24h = ((current - price24hAgo) / price24hAgo) * 100;
  const price7dAgo = prices.length > 7 ? prices[prices.length - 8].price : prices[0].price;
  const change7d = ((current - price7dAgo) / price7dAgo) * 100;
  const price30dAgo = prices.length > 30 ? prices[prices.length - 31].price : prices[0].price;
  const change30d = ((current - price30dAgo) / price30dAgo) * 100;

  return {
    change24h: Math.round(change24h * 100) / 100,
    change7d: Math.round(change7d * 100) / 100,
    change30d: Math.round(change30d * 100) / 100,
  };
}

/* ─────────────────────────────────────────────────────────────────── */
/* Route handler                                                        */
/* ─────────────────────────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const auth = await checkApiAuth(request);
  if (auth.errorResponse) return auth.errorResponse;
  const extraHeaders = auth.validation ? rateLimitHeaders(auth.validation) : {};

  const searchParams = request.nextUrl.searchParams;
  const daysParam = searchParams.get("days") ?? "30";
  const days = Math.min(Math.max(parseInt(daysParam) || 30, 1), 365);

  let prices: Array<{ date: string; price: number }> = [];
  let source: DataSourceId = DATA_SOURCES.SYNTHETIC;
  let fetchedAt = new Date().toISOString();

  // ── Tier 1: CoinGecko ─────────────────────────────────────────────
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/bittensor/market_chart?vs_currency=usd&days=${days}`,
      { next: { revalidate: 900 } },
    );
    if (!response.ok) throw new Error(`CoinGecko API returned ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data.prices)) throw new Error("Invalid CoinGecko response structure");

    prices = data.prices.map(([timestamp, price]: [number, number]) => ({
      date: new Date(timestamp).toISOString().split("T")[0],
      price: Math.round(price * 100) / 100,
    }));
    source = DATA_SOURCES.COINGECKO_LIVE;
    fetchedAt = new Date().toISOString();
  } catch (error) {
    // ── Tier 4: Synthetic fallback ──────────────────────────────────
    console.warn("CoinGecko fetch failed, using synthetic data:", error);
    prices = generateSyntheticData(days);
    source = DATA_SOURCES.SYNTHETIC;
  }

  const changes = calculateChanges(prices);
  const cacheMaxAge = days <= 30 ? 900 : 3600;

  return apiResponse(
    { prices, ...changes },
    {
      source,
      fetchedAt,
      ...(source === DATA_SOURCES.SYNTHETIC
        ? { note: "Live price API unavailable — synthetic random walk" }
        : {}),
    },
    {
      cacheControl: `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=3600`,
      extraHeaders,
    },
  );
}
