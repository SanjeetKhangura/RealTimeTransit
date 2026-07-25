// The frontend's view of the API. Each function fetches a wire shape and maps
// it to a domain type, so components stay decoupled from the raw API. Every
// function here is now backed by a real Go API endpoint.

import { ApiError, apiGet } from "./client";
import {
  pickTripId,
  toReliabilityPoint,
  toRouteDetail,
  toRouteSummary,
  toServiceAlert,
  toShape,
  toStopAdherence,
  toVehicles,
  tripUpdateToStopAdherence,
} from "./adapters";
import { agencySecondsNow } from "@/lib/utils/format";
import type {
  AlertListWire,
  LiveVehiclesWire,
  RouteHistoryWire,
  RouteListWire,
  RouteShapeWire,
  RouteTripUpdatesWire,
  RouteWire,
  SystemAlertsWire,
  TripScheduleListWire,
  TripStopListWire,
} from "./wire";
import type {
  ReliabilityPoint,
  RouteDetail,
  RouteSummary,
  ServiceAlert,
  StopAdherence,
  Vehicle,
  TripScheduleSummary,
} from "@/types/api";

export async function getRoutes(signal?: AbortSignal): Promise<RouteSummary[]> {
  const wire = await apiGet<RouteListWire>("/api/routes", signal);
  return wire.routes.map(toRouteSummary);
}

export async function getRoute(
  id: string,
  signal?: AbortSignal,
): Promise<RouteDetail> {
  const wire = await apiGet<RouteWire>(`/api/routes/${id}`, signal);
  return toRouteDetail(wire);
}

export async function getLiveVehicles(
  id: string,
  signal?: AbortSignal,
): Promise<Vehicle[]> {
  const wire = await apiGet<LiveVehiclesWire>(`/api/routes/${id}/live`, signal);
  return toVehicles(wire);
}

// Route polyline for the map. A route with no shape yet returns 404, which we
// treat as simply no line rather than an error.
export async function getShape(
  id: string,
  signal?: AbortSignal,
): Promise<[number, number][]> {
  try {
    const wire = await apiGet<RouteShapeWire>(`/api/routes/${id}/shape`, signal);
    return toShape(wire);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return [];
    throw err;
  }
}

// Stops with names, coordinates, and scheduled + realtime times, for the
// schedule table and the map markers. /stops now needs a trip_id, so we first
// read the trip schedule, pick the active or next trip, then fetch its stops.
// That keeps every realtime delay tied to the same bus. Returns [] when the
// route has no trips yet.
export async function getStops(
  id: string,
  signal?: AbortSignal,
): Promise<StopAdherence[]> {
  const schedule = await apiGet<TripScheduleListWire>(
    `/api/routes/${id}/trips/schedule`,
    signal,
  );
  const tripId = pickTripId(schedule.trips, agencySecondsNow());
  if (!tripId) return [];

  const wire = await apiGet<TripStopListWire>(
    `/api/routes/${id}/stops?trip_id=${encodeURIComponent(tripId)}`,
    signal,
  );
  // A trip visits each stop once, but dedupe defensively for loop routes.
  const seen = new Set<string>();
  const out: StopAdherence[] = [];
  for (const s of wire.stops) {
    if (seen.has(s.stopId)) continue;
    seen.add(s.stopId);
    out.push(toStopAdherence(s));
  }
  return out;
}

export async function getAlerts(
  id: string,
  signal?: AbortSignal,
): Promise<ServiceAlert[]> {
  const wire = await apiGet<AlertListWire>(`/api/routes/${id}/alerts`, signal);
  return wire.alerts.map(toServiceAlert);
}

// Agency-wide alerts (not tied to a route), shown on every route alongside the
// route's own alerts.
export async function getSystemAlerts(
  signal?: AbortSignal,
): Promise<ServiceAlert[]> {
  const wire = await apiGet<SystemAlertsWire>("/api/alerts/system", signal);
  return wire.alerts.map(toServiceAlert);
}

// Time-bucketed reliability for the chart.
export async function getHistory(
  id: string,
  signal?: AbortSignal,
): Promise<ReliabilityPoint[]> {
  const wire = await apiGet<RouteHistoryWire>(
    `/api/routes/${id}/history`,
    signal,
  );
  return wire.points.map(toReliabilityPoint);
}

// Secondary per-trip realtime updates. Not used by the schedule table (that
// uses getStops), kept for a future trip-level view.
export async function getTripUpdates(
  id: string,
  signal?: AbortSignal,
): Promise<StopAdherence[]> {
  const wire = await apiGet<RouteTripUpdatesWire>(
    `/api/routes/${id}/trip-updates`,
    signal,
  );
  return wire.tripUpdates.map(tripUpdateToStopAdherence);
}

export async function getTripSchedules(
  routeId: string,
  signal?: AbortSignal,
): Promise<TripScheduleSummary[]> {
  const wire = await apiGet<TripScheduleListWire>(
    `/api/routes/${routeId}/trips/schedule`,
    signal,
  );

  return wire.trips.map((t) => ({
    tripId: t.tripId,
    directionId: t.directionId,
    tripHeadsign: t.tripHeadsign,
    startSeconds: t.startSeconds,
    endSeconds: t.endSeconds,
    isActive: t.isActive,
  }));
}

export async function getTripStops(
  routeId: string,
  tripId: string,
  signal?: AbortSignal,
): Promise<StopAdherence[]> {
  const wire = await apiGet<TripStopListWire>(
    `/api/routes/${routeId}/stops?trip_id=${encodeURIComponent(tripId)}`,
    signal,
  );
  // A trip visits each stop once, but dedupe defensively for loop routes.
  const seen = new Set<string>();
  const out: StopAdherence[] = [];
  for (const s of wire.stops) {
    if (seen.has(s.stopId)) continue;
    seen.add(s.stopId);
    out.push(toStopAdherence(s));
  }
  return out;
}
