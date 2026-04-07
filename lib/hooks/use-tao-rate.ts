"use client";

import { useState, useEffect } from "react";

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
        const res = await fetch("/api/tao-rate");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { taoUsd: number; fallback: boolean };

        if (!cancelled) {
          setRate(data.taoUsd);
          setFallback(data.fallback);
        }
      } catch {
        // If fetch fails entirely, use client-side fallback
        if (!cancelled) {
          setRate(600);
          setFallback(true);
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
