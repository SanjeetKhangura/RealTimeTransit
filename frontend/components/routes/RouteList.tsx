"use client";

import { useState } from "react";
import { apiGet } from "@/lib/api/client";
import { usePolling } from "@/lib/api/polling";
import { useSavedRoutes } from "@/lib/hooks/useSavedRoutes";
import { RouteCard } from "./RouteCard";
import { RouteSearch } from "./RouteSearch";
import { RouteFilters } from "./RouteFilters";
import { RouteSort, type SortKey } from "./RouteSort";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { StaleBanner } from "@/components/ui/StaleBanner";
import type { RouteSummary, RoutesResponse } from "@/types/api";
import type { StatusLevel } from "@/types/domain";

const fetchRoutes = (signal: AbortSignal) =>
  apiGet<RoutesResponse>("/api/routes", signal);

// numeric:true sorts "2" < "25" < "99" < "250" the way people expect.
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function sortRoutes(routes: RouteSummary[], key: SortKey): RouteSummary[] {
  return [...routes].sort((a, b) => {
    switch (key) {
      case "number-asc":
        return collator.compare(a.shortName, b.shortName);
      case "number-desc":
        return collator.compare(b.shortName, a.shortName);
      case "name":
        return a.longName.localeCompare(b.longName);
      case "region":
        return (
          (a.region ?? "").localeCompare(b.region ?? "") ||
          collator.compare(a.shortName, b.shortName)
        );
      default:
        return 0;
    }
  });
}

export function RouteList() {
  const { data, error, loading, isStale, lastUpdated, refresh } = usePolling(
    fetchRoutes,
    60_000,
  );
  const { isSaved, toggle, saved } = useSavedRoutes();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusLevel[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("number-asc");

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
  const visible = sortRoutes(filtered, sortKey);

  return (
    <div className="space-y-4">
      <RouteSearch value={query} onChange={setQuery} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RouteFilters
          active={statusFilter}
          onToggle={toggleStatus}
          savedOnly={savedOnly}
          onSavedOnlyChange={setSavedOnly}
          savedCount={saved.length}
        />
        <RouteSort value={sortKey} onChange={setSortKey} />
      </div>
      {isStale && <StaleBanner lastUpdated={lastUpdated} onRetry={refresh} />}
      {visible.length === 0 ? (
        <EmptyState
          title="No routes match"
          hint="Try a different search or clear the filters."
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((r) => (
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
