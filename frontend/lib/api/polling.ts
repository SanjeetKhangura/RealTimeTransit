"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PollingState<T> {
  data: T | null; // retained across transient failures (stale-while-error)
  error: Error | null;
  loading: boolean; // true only on the first load
  isStale: boolean; // last poll failed but data is still shown
  lastUpdated: Date | null;
  refresh: () => void;
}

// Polls `fetcher` every `intervalMs`. Keeps the last good data when a poll
// fails, and pauses while the tab is hidden (refreshing on return).
// `refreshKey` can be used to force a refresh when some external state changes.
export function usePolling<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
  refreshKey?: string | number | null,
): PollingState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);
  const hasDataRef = useRef(false);
  const activeController = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    try {
      const result = await fetcherRef.current(controller.signal);
      setData(result);
      hasDataRef.current = true;
      setError(null);
      setIsStale(false);
      setLastUpdated(new Date());
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err as Error);
      if (hasDataRef.current) setIsStale(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  useEffect(() => {
    // Reset state when the refresh key changes, so the UI can show a loading
    // indicator while the new data is fetched.
    setLoading(true);
    setError(null);
    setData(null);

    void load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      activeController.current?.abort();
    };
  }, [load, intervalMs, refreshKey]);

  return { data, error, loading, isStale, lastUpdated, refresh };
}
