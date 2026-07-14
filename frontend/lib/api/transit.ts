// The frontend's view of the API. Each function fetches a wire shape and maps
// it to a domain type, so components stay decoupled from the raw API. Every
// function here is now backed by a real Go API endpoint.

import { ApiError, apiGet } from "./client";
import {
  toReliabilityPoint,
  toRouteDetail,
  toRouteSummary,
  toServiceAlert,
  toShape,
  toStopAdherence,
  toVehicles,
  tripUpdateToStopAdherence,
} from "./adapters";
import type {
  AlertListWire,
  LiveVehiclesWire,
  RouteHistoryWire,
  RouteListWire,
  RouteShapeWire,
  RouteTripUpdatesWire,
  RouteWire,
  StopListWire,
} from "./wire";
import type {
  ReliabilityPoint,
  RouteDetail,
  RouteSummary,
  ServiceAlert,
  StopAdherence,
  Vehicle,
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

// Stops with names, coordinates, and scheduled + realtime times. Feeds the
// schedule table and the map markers.
export async function getStops(
  id: string,
  signal?: AbortSignal,
): Promise<StopAdherence[]> {
  const wire = await apiGet<StopListWire>(`/api/routes/${id}/stops`, signal);
  // /stops returns a row per trip, so keep the first row per stop.
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
