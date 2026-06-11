// Interim hand-written API types.
// These will be replaced by `openapi-typescript` output once the Go API
// exposes /openapi.json. Shapes mirror the DB schema so the swap is low
// friction.

import type {
  AlertSeverity,
  DataSource,
  StatusLevel,
  VehicleStatus,
} from "@/types/domain";

export interface RouteSummary {
  routeId: string;
  shortName: string;
  longName: string;
  routeType: number;
  status: StatusLevel;
  region?: string; // optional; used for sorting. API may add this later.
}

export interface RoutesResponse {
  routes: RouteSummary[];
}

export interface RouteDetail extends RouteSummary {
  healthScore: number; // 0 to 5
  dataSource: DataSource;
  lastUpdated: string; // ISO 8601 UTC
  shape: [number, number][]; // route polyline as [lat, lon] points
}

export interface Vehicle {
  vehicleId: string;
  routeId: string;
  lat: number;
  lon: number;
  bearing: number | null;
  status: VehicleStatus;
  stopId: string | null;
  nextStop: string | null;
}

export interface LiveResponse {
  dataSource: DataSource;
  lastUpdated: string;
  vehicles: Vehicle[];
}

export interface StopAdherence {
  stopId: string;
  stopName: string;
  lat: number;
  lon: number;
  scheduledArrival: string | null; // ISO 8601 UTC
  predictedArrival: string | null; // null until ML serves predictions
  arrivalDelay: number | null; // seconds, can be absent
}

export interface StopsResponse {
  stops: StopAdherence[];
}

export interface ServiceAlert {
  alertId: string;
  severity: AlertSeverity;
  header: string;
  description: string;
  startTime: string; // ISO 8601 UTC
  endTime: string | null;
}

export interface AlertsResponse {
  alerts: ServiceAlert[];
}
