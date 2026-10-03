"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Ticking clock — re-renders the component every `intervalMs`. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/**
 * Polling fetcher — keeps factory-floor screens live without websockets.
 * `refresh()` triggers an immediate refetch (call after mutations).
 */
export function usePolling<T>(url: string, intervalMs = 2500) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!alive.current) return;
      if (!res.ok) {
        setError(json?.error ?? "שגיאה בטעינת נתונים");
      } else {
        setData(json as T);
        setError(null);
      }
    } catch {
      if (alive.current) setError("בעיית תקשורת מול השרת — מנסה שוב…");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    alive.current = true;
    refresh();
    const t = setInterval(refresh, intervalMs);
    return () => {
      alive.current = false;
      clearInterval(t);
    };
  }, [refresh, intervalMs]);

  return { data, loading, error, refresh };
}

/** Extracts a Hebrew error message from an API response. */
export async function apiError(res: Response, fallback: string): Promise<string> {
  try {
    const json = await res.json();
    if (json?.error) return json.error as string;
  } catch {
    /* ignore */
  }
  return fallback;
}
