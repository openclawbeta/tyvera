"use client";

import { useState, useEffect } from "react";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

interface TaoRateResult {
  /** Current TAO/USD price, or null while loading */
  rate: number | null;
  /** Whether the rate is still being fetched */
  loading: boolean;
  /** Whether the returned rate is a fallback estimate */
  fallback: boolean;
}

export function useTaoRate(): TaoRateResult {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchRate() {
      try {
        const res = await fetchWithTimeout("/api/tao-rate", { timeoutMs: 8_000 });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          taoUsd: number | null;
          awaiting?: boolean;
          fallback?: boolean;
        };

        if (!cancelled) {
          if (data.awaiting || data.taoUsd === null || data.taoUsd <= 0) {
            // Server has no price yet — keep loading state, don't show a fake number
            setRate(null);
            setFallback(false);
          } else {
            setRate(data.taoUsd);
            setFallback(!!data.fallback);
          }
        }
      } catch {
        // Network failure — keep null (awaiting), don't inject fake price
        if (!cancelled) {
          setRate(null);
          setFallback(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchRate();
    return () => { cancelled = true; };
  }, []);

  return { rate, loading, fallback };
}
