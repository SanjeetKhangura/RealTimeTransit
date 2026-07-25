"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { usePolling } from "@/lib/api/polling";
import {
  getAlerts,
  getHistory,
  getLiveVehicles,
  getRoute,
  getShape,
  getStops,
  getSystemAlerts,
  getTripSchedules,
  getTripStops,
} from "@/lib/api/transit";
import { RouteHeader } from "@/components/routes/RouteHeader";
import { RouteMapList } from "@/components/routes/RouteMapList";
import { AlertBanner } from "@/components/routes/AlertBanner";
import { AdherenceTable } from "@/components/routes/AdherenceTable";
import { ReliabilityChart } from "@/components/routes/ReliabilityChart";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { StaleBanner } from "@/components/ui/StaleBanner";
import { formatRelative, agencySecondsNow, formatGtfsTime } from "@/lib/utils/format";
import type { DataSource } from "@/types/domain";
import type { TripScheduleSummary } from "@/types/api";
import { AdherenceSummary } from "@/components/routes/AdherenceSummary";

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

function getDirectionKey(trip: TripScheduleSummary): string {
  return trip.directionId === null ? "unknown" : `direction-${trip.directionId}`;
}

function isTripLive(trip: TripScheduleSummary, now: number): boolean {
  if (!trip.isActive || trip.startSeconds === null || trip.endSeconds === null) {
    return false;
  }

  // 5 minutes grace period before the scheduled start time and after the scheduled end time, to account for early/late trips.
  const startGrace = 5 * 60; 
  const endGrace = 5 * 60;

  // The trip is considered live if the current time is within the start and end times, with a grace period before and after.
  const isWithinWindow = (currentSeconds: number) => currentSeconds >= trip.startSeconds! - startGrace && currentSeconds <= trip.endSeconds! + endGrace;

  return isWithinWindow(now) || 
        isWithinWindow(now + 24 * 60 * 60); // Also check for trips that cross midnight
}

function RouteDetailView({ id }: { id: string }) {
  const [selectedDirection, setSelectedDirection] = useState<string>("");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const detail = usePolling((signal) => getRoute(id, signal), 30_000);
  const live = usePolling((signal) => getLiveVehicles(id, signal), 15_000);
  // /stops feeds both the map markers (names + coordinates) and the schedule
  // table (scheduled + realtime times).
  const stops = usePolling((signal) => {
    if (!selectedTripId) return Promise.resolve([]);
    return getTripStops(id, selectedTripId, signal);
  }, 30_000, `${id}:${selectedTripId} ?? "none"`);
  const alerts = usePolling((signal) => getAlerts(id, signal), 30_000);
  // Agency-wide alerts are the same on every route, so this is not keyed by id.
  const systemAlerts = usePolling((signal) => getSystemAlerts(signal), 60_000);
  const history = usePolling((signal) => getHistory(id, signal), 600_000);
  // The route shape is static, so fetch it rarely (effectively once per visit).
  const shape = usePolling((signal) => getShape(id, signal), 3_600_000);
  // Trip schedules are used to pick the active trip and fetch its stops.
  const tripSchedules = usePolling((signal) => getTripSchedules(id, signal), 300_000,);

  const directions = useMemo(() => {
    const map = new Map<string, { key: string; label: string }>();
    for (const trip of tripSchedules.data ?? []) {
      const key = getDirectionKey(trip);
      if (!map.has(key)) {
        map.set(key, { key, label: trip.tripHeadsign ?? (trip.directionId === null ? "Unknown direction" : `Direction ${trip.directionId}`) });
      }
    }
    return Array.from(map.values());
  }, [tripSchedules.data]);

  const availableTrips = useMemo(() => {
    return (tripSchedules.data ?? []).filter((t) => getDirectionKey(t) === selectedDirection);
  }, [tripSchedules.data, selectedDirection]);

  // Select the first direction when the trip schedules are loaded or change.
  useEffect(() => {
    if (directions.length === 0) {
      setSelectedDirection("");
      return;
    }

    // If the currently selected direction is still in the list, keep it.
    const directionExists = directions.some((d) => d.key === selectedDirection);
    if (!directionExists) {
      setSelectedDirection(directions[0].key);
    }
  }, [directions, selectedDirection]);

  // Select the first active trip or the first trip when the available trips change.
  useEffect(() => {
    if (availableTrips.length === 0) {
      setSelectedTripId(null);
      return;
    }

    // If the currently selected trip is still in the list, keep it.
    const tripExists = availableTrips.some((t) => t.tripId === selectedTripId);
    
    if (tripExists) {
      return;
    }

    // Prefer an active trip if available.
    const now = agencySecondsNow();
    // Find the first trip that is active or starts in the future, else pick the first trip.
    const defaultTrip = availableTrips.find((t) => isTripLive(t, now)) ?? availableTrips.find(
      (t) => 
        t.startSeconds !== null &&
        t.startSeconds >= now,)
        ?? availableTrips[0];
        setSelectedTripId(defaultTrip.tripId);
  }, [availableTrips, selectedTripId]);

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
  // Use the API's freshness flag when present, else infer from live vehicles.
  const dataSource: DataSource =
    detail.data.dataSource ?? (vehicles.length > 0 ? "realtime" : "scheduled");

  return (
    <div className="space-y-5">
      <Link
        href="/"
        className="text-sm text-foreground/60 hover:text-foreground"
      >
        &larr; All routes
      </Link>
      <RouteHeader route={detail.data} dataSource={dataSource} />

      <AlertBanner alerts={systemAlerts.data ?? []} scopeLabel="Network-wide" />
      <AlertBanner alerts={alerts.data ?? []} />

      {live.isStale && (
        <StaleBanner lastUpdated={live.lastUpdated} onRetry={live.refresh} />
      )}
      <RouteMap vehicles={vehicles} shape={shape.data ?? []} stops={stopList} />

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
        {tripSchedules.loading ? (
          <Skeleton className="h-20 w-full" />
        ) : tripSchedules.error ? (
          <ErrorPanel error={tripSchedules.error} onRetry={tripSchedules.refresh} />
        ) : directions.length === 0 ? (
          <p className="text-sm text-foreground/50">No trips available for this route.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-4">
              <label className="flex min-w-64 flex-col gap-1">
                <span className="text-xs text-foreground/50">Direction</span>
                <select
                  value={selectedDirection}
                  onChange={(e) => {
                    setSelectedDirection(e.target.value);
                    setSelectedTripId(null);
                  }}
                  className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm"
                  >
                  {directions.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-64 flex-col gap-1">
                <span className="text-xs text-foreground/50">Departure</span>

                <select
                  value={selectedTripId ?? ""}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm"
                  disabled={availableTrips.length === 0}
                >
                  {availableTrips.map((t) => (
                    <option key={t.tripId} value={t.tripId}>
                      {formatGtfsTime(t.startSeconds)??"Unknown departure"}
                      {isTripLive(t, agencySecondsNow()) ? " - live)" : ""}
                    </option>
                  ))}
                </select>
                  
              </label>
            </div>

          {stops.loading ? (
            <Skeleton className="h-32 w-full" />
          ) : stops.error ? (
            <ErrorPanel error={stops.error} onRetry={stops.refresh} />
          ) : stopList.length === 0 ? (
            <p className="text-sm text-foreground/50">No stops available for this trip.</p>
          ) : (
            <div className="space-y-4">
              <AdherenceSummary stops={stopList} />
              <AdherenceTable stops={stopList} />
            </div>
        )}
      </>
    )}
      </section>

      <section aria-label="Historical reliability" className="space-y-2">
        <h2 className="text-sm font-semibold">Reliability</h2>
        {history.loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ReliabilityChart points={history.data ?? []} />
        )}
      </section>
    </div>
  );
}
