"use client";

import { useState } from "react";
import { apiGet } from "@/lib/api/client";
import { usePolling } from "@/lib/api/polling";
import { useSavedRoutes } from "@/lib/hooks/useSavedRoutes";
import { RouteCard } from "./RouteCard";
import { RouteSearch } from "./RouteSearch";
import { RouteFilters } from "./RouteFilters";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { StaleBanner } from "@/components/ui/StaleBanner";
import type { RoutesResponse } from "@/types/api";
import type { StatusLevel } from "@/types/domain";

const fetchRoutes = (signal: AbortSignal) =>
  apiGet<RoutesResponse>("/api/routes", signal);

export function RouteList() {
  const { data, error, loading, isStale, lastUpdated, refresh } = usePolling(
    fetchRoutes,
    60_000,
  );
  const { isSaved, toggle, saved } = useSavedRoutes();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusLevel[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);

  function toggleStatus(level: StatusLevel) {
    setStatusFilter((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return <ErrorPanel error={error} onRetry={refresh} />;
  }

  const routes = data?.routes ?? [];
  const q = query.trim().toLowerCase();
  const filtered = routes.filter((r) => {
    if (savedOnly && !saved.includes(r.routeId)) return false;
    if (statusFilter.length > 0 && !statusFilter.includes(r.status)) return false;
    if (!q) return true;
    return (
      r.shortName.toLowerCase().includes(q) ||
      r.longName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <RouteSearch value={query} onChange={setQuery} />
      <RouteFilters
        active={statusFilter}
        onToggle={toggleStatus}
        savedOnly={savedOnly}
        onSavedOnlyChange={setSavedOnly}
        savedCount={saved.length}
      />
      {isStale && <StaleBanner lastUpdated={lastUpdated} onRetry={refresh} />}
      {filtered.length === 0 ? (
        <EmptyState
          title="No routes match"
          hint="Try a different search or clear the filters."
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.routeId}>
              <RouteCard
                route={r}
                saved={isSaved(r.routeId)}
                onToggleSave={toggle}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
