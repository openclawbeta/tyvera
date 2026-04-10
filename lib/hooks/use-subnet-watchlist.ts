"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "tyvera.subnet-watchlist";

function normalize(list: number[]): number[] {
  return Array.from(new Set(list.filter((n) => Number.isFinite(n) && n >= 0))).sort((a, b) => a - b);
}

export function useSubnetWatchlist() {
  const [watchlist, setWatchlist] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setWatchlist(normalize(parsed.map((v) => Number(v))));
      }
    } catch {
      // ignore malformed local data
    } finally {
      setLoaded(true);
    }
  }, []);

  const persist = useCallback((next: number[]) => {
    const normalized = normalize(next);
    setWatchlist(normalized);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // ignore persistence failure
    }
  }, []);

  const isWatched = useCallback(
    (netuid: number) => watchlist.includes(netuid),
    [watchlist],
  );

  const toggleWatch = useCallback(
    (netuid: number) => {
      if (!Number.isFinite(netuid)) return;
      if (watchlist.includes(netuid)) {
        persist(watchlist.filter((id) => id !== netuid));
      } else {
        persist([...watchlist, netuid]);
      }
    },
    [persist, watchlist],
  );

  return useMemo(
    () => ({ watchlist, loaded, isWatched, toggleWatch }),
    [watchlist, loaded, isWatched, toggleWatch],
  );
}
