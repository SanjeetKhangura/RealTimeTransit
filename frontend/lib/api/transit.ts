// The frontend's view of the API. Each function fetches a wire shape and maps
// it to a domain type, so components stay decoupled from the raw API. Every
// function here is now backed by a real Go API endpoint.

import { apiGet } from "./client";
import {
  toRouteDetail,
  toRouteSummary,
  toServiceAlert,
  toStopAdherence,
  toVehicles,
  tripUpdateToStopAdherence,
} from "./adapters";
import type {
  AlertListWire,
  LiveVehiclesWire,
  RouteListWire,
  RouteTripUpdatesWire,
  RouteWire,
  StopListWire,
} from "./wire";
import type {
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

// Stops with names, coordinates, and scheduled + realtime times. Feeds the
// schedule table and the map markers.
export async function getStops(
  id: string,
  signal?: AbortSignal,
): Promise<StopAdherence[]> {
  const wire = await apiGet<StopListWire>(`/api/routes/${id}/stops`, signal);
  return wire.stops.map(toStopAdherence);
}

export async function getAlerts(
  id: string,
  signal?: AbortSignal,
): Promise<ServiceAlert[]> {
  const wire = await apiGet<AlertListWire>(`/api/routes/${id}/alerts`, signal);
  return wire.alerts.map(toServiceAlert);
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
