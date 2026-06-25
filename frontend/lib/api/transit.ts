// The frontend's view of the API. Each function fetches a wire shape and maps
// it to a domain type, so components stay decoupled from the raw API.
//
// routes, route-by-id, live, and trip-updates are backed by the real Go API.
// stops (for map markers) and alerts are not implemented server-side yet, so
// they are mock-only for now.

import { apiGet } from "./client";
import {
  toRouteDetail,
  toRouteSummary,
  toStopAdherence,
  toVehicles,
} from "./adapters";
import type {
  LiveVehiclesWire,
  RouteListWire,
  RouteTripUpdatesWire,
  RouteWire,
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

// Real schedule/adherence source: maps trip updates to schedule-table rows.
export async function getTripUpdates(
  id: string,
  signal?: AbortSignal,
): Promise<StopAdherence[]> {
  const wire = await apiGet<RouteTripUpdatesWire>(
    `/api/routes/${id}/trip-updates`,
    signal,
  );
  return wire.tripUpdates.map(toStopAdherence);
}

// Pending backend: mock-only until the API exposes these.
export async function getStops(
  id: string,
  signal?: AbortSignal,
): Promise<StopAdherence[]> {
  const res = await apiGet<{ stops: StopAdherence[] }>(
    `/api/routes/${id}/stops`,
    signal,
  );
  return res.stops;
}

export async function getAlerts(
  id: string,
  signal?: AbortSignal,
): Promise<ServiceAlert[]> {
  const res = await apiGet<{ alerts: ServiceAlert[] }>(
    `/api/routes/${id}/alerts`,
    signal,
  );
  return res.alerts;
}
