"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "rtt:savedRoutes";
const EVENT = "rtt:savedRoutes-changed";

const EMPTY: string[] = [];

// Cache the parsed value so getSnapshot returns a stable reference until the
// stored string actually changes (required by useSyncExternalStore).
let cachedRaw: string | null = null;
let cachedValue: string[] = EMPTY;

function getSnapshot(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedValue = raw ? (JSON.parse(raw) as string[]) : EMPTY;
    } catch {
      cachedValue = EMPTY;
    }
  }
  return cachedValue;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

function write(next: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore quota or availability errors
  }
  window.dispatchEvent(new Event(EVENT));
}

// Persists saved route ids in localStorage. No accounts, no PII.
// useSyncExternalStore keeps server and client renders consistent.
export function useSavedRoutes() {
  const saved = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((routeId: string) => {
    const current = getSnapshot();
    const next = current.includes(routeId)
      ? current.filter((id) => id !== routeId)
      : [...current, routeId];
    write(next);
  }, []);

  const isSaved = useCallback(
    (routeId: string) => saved.includes(routeId),
    [saved],
  );

  return { saved, isSaved, toggle };
}
