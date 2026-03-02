"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PortfolioData } from "./types";

const SYNC_INTERVAL_MS = 30_000;

type UsePortfolioReturn = {
  data: PortfolioData | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  lastSync: string | null;
  syncNow: () => void;
};

export function usePortfolio(): UsePortfolioReturn {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio");
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      const json = (await res.json()) as PortfolioData;
      setData(json);
      setLastSync(json.last_sync);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/portfolio", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Sync failed");
      }
      const json = (await res.json()) as PortfolioData;
      setData(json);
      setLastSync(json.last_sync);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, []);

  const syncNow = useCallback(() => {
    void triggerSync();
  }, [triggerSync]);

  // Initial fetch
  useEffect(() => {
    void fetchPortfolio();
  }, [fetchPortfolio]);

  // Auto-sync interval
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      void triggerSync();
    }, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [triggerSync]);

  return { data, loading, syncing, error, lastSync, syncNow };
}
