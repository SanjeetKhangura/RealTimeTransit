"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api/client";
import { usePolling } from "@/lib/api/polling";
import { RouteHeader } from "@/components/routes/RouteHeader";
import { RouteMapList } from "@/components/routes/RouteMapList";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { StaleBanner } from "@/components/ui/StaleBanner";
import { formatRelative } from "@/lib/utils/format";
import type { LiveResponse, RouteDetail } from "@/types/api";

const RouteMap = dynamic(() => import("@/components/routes/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-xl border border-foreground/10">
      <Spinner label="Loading map" />
    </div>
  ),
});

export default function RouteDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const detail = usePolling(
    (signal) => apiGet<RouteDetail>(`/api/routes/${id}`, signal),
    30_000,
  );
  const live = usePolling(
    (signal) => apiGet<LiveResponse>(`/api/routes/${id}/live`, signal),
    15_000,
  );

  if (detail.loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!detail.data) {
    return (
      <div className="space-y-4">
        <Link href="/" className="text-sm text-foreground/60">
          &larr; All routes
        </Link>
        <ErrorPanel
          error={detail.error ?? new Error("Route not found")}
          onRetry={detail.refresh}
        />
      </div>
    );
  }

  const vehicles = live.data?.vehicles ?? [];

  return (
    <div className="space-y-4">
      <Link
        href="/"
        className="text-sm text-foreground/60 hover:text-foreground"
      >
        &larr; All routes
      </Link>
      <RouteHeader route={detail.data} />
      {live.isStale && (
        <StaleBanner lastUpdated={live.lastUpdated} onRetry={live.refresh} />
      )}
      <RouteMap vehicles={vehicles} />
      <section aria-label="Live vehicles on this route" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Live vehicles</h2>
          {live.lastUpdated && (
            <span className="text-xs text-foreground/50">
              Updated {formatRelative(live.lastUpdated)}
            </span>
          )}
        </div>
        <RouteMapList vehicles={vehicles} />
      </section>
    </div>
  );
}
