"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usePolling } from "@/lib/api/polling";
import {
  getAlerts,
  getLiveVehicles,
  getRoute,
  getStops,
} from "@/lib/api/transit";
import { RouteHeader } from "@/components/routes/RouteHeader";
import { RouteMapList } from "@/components/routes/RouteMapList";
import { AlertBanner } from "@/components/routes/AlertBanner";
import { AdherenceTable } from "@/components/routes/AdherenceTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { StaleBanner } from "@/components/ui/StaleBanner";
import { formatRelative } from "@/lib/utils/format";
import type { DataSource } from "@/types/domain";

const RouteMap = dynamic(() => import("@/components/routes/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-xl border border-foreground/10">
      <Spinner label="Loading map" />
    </div>
  ),
});

// Keying the view by id remounts it when the route changes, so polling restarts
// and fetches the new route's data immediately instead of on the next tick.
export default function RouteDetailsPage() {
  const params = useParams<{ id: string }>();
  return <RouteDetailView key={params.id} id={params.id} />;
}

function RouteDetailView({ id }: { id: string }) {
  const detail = usePolling((signal) => getRoute(id, signal), 30_000);
  const live = usePolling((signal) => getLiveVehicles(id, signal), 15_000);
  const stops = usePolling((signal) => getStops(id, signal), 30_000);
  const alerts = usePolling((signal) => getAlerts(id, signal), 30_000);

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

  const vehicles = live.data ?? [];
  const stopList = stops.data ?? [];
  // No data-source flag from the API yet, so infer it from live vehicles.
  const dataSource: DataSource = vehicles.length > 0 ? "realtime" : "scheduled";

  return (
    <div className="space-y-5">
      <Link
        href="/"
        className="text-sm text-foreground/60 hover:text-foreground"
      >
        &larr; All routes
      </Link>
      <RouteHeader route={detail.data} dataSource={dataSource} />

      <AlertBanner alerts={alerts.data ?? []} />

      {live.isStale && (
        <StaleBanner lastUpdated={live.lastUpdated} onRetry={live.refresh} />
      )}
      <RouteMap vehicles={vehicles} shape={detail.data.shape} stops={stopList} />

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

      <section aria-label="Schedule and adherence" className="space-y-2">
        <h2 className="text-sm font-semibold">Schedule</h2>
        {stops.loading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <AdherenceTable stops={stopList} />
        )}
      </section>
    </div>
  );
}
