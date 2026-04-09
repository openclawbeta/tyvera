/**
 * app/api/tao-price-history/route.ts
 *
 * TAO price history endpoint — chain-only data source.
 *
 * Priority:
 *   1. Price-engine rolling buffer (up to 7 days at 5-min intervals) → T2
 *   2. Synthetic random walk fallback                                 → T4
 *
 * No external API dependencies (no CoinGecko).
 * History is built from the price-engine rolling buffer, populated by cron.
 */

import { NextRequest } from "next/server";
import { checkApiAuth, rateLimitHeaders } from "@/lib/api/auth-middleware";
import {
  DATA_SOURCES,
  apiResponse,
  type DataSourceId,
} from "@/lib/data-source-policy";
import { getTaoPriceHistory, getLatestTaoPrice } from "@/lib/chain/price-engine";

/* ─────────────────────────────────────────────────────────────────── */
/* Synthetic fallback (deterministic)                                   */
/* ─────────────────────────────────────────────────────────────────── */

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateSyntheticData(days: number): Array<{ date: string; price: number }> {
  const data: Array<{ date: string; price: number }> = [];
  const now = new Date();
  const rng = seededRandom(42); // Deterministic seed
  let price = 320;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const randomChange = (rng() - 0.48) * 8;
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

  // ── Tier 2: Price-engine rolling buffer ───────────────────────────
  const history = getTaoPriceHistory();

  if (history.length > 1) {
    // Convert price points to daily format
    // Group by date, take latest price per day
    const dailyMap = new Map<string, number>();
    for (const point of history) {
      const date = point.timestamp.split("T")[0];
      dailyMap.set(date, point.taoUsd);
    }

    // Sort by date and take last N days
    const sortedDays = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-days);

    if (sortedDays.length > 0) {
      prices = sortedDays.map(([date, price]) => ({
        date,
        price: Math.round(price * 100) / 100,
      }));
      source = DATA_SOURCES.CHAIN_CACHE;
      fetchedAt = history[history.length - 1].timestamp;
    }
  }

  // ── Tier 4: Synthetic fallback ────────────────────────────────────
  if (prices.length === 0) {
    // If we have a current price from the engine, anchor the synthetic data to it
    const currentPrice = getLatestTaoPrice();
    const syntheticData = generateSyntheticData(days);

    if (currentPrice.source !== "bootstrap") {
      // Anchor synthetic to actual current price
      const lastSynthetic = syntheticData[syntheticData.length - 1].price;
      const ratio = currentPrice.taoUsd / lastSynthetic;
      prices = syntheticData.map((p) => ({
        date: p.date,
        price: Math.round(p.price * ratio * 100) / 100,
      }));
    } else {
      prices = syntheticData;
    }

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
        ? { note: "Price history from synthetic random walk — engine buffer has insufficient data" }
        : { note: `${prices.length} daily prices from price-engine rolling buffer` }),
    },
    {
      cacheControl: `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=3600`,
      extraHeaders,
    },
  );
}
