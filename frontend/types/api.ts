// Interim hand-written API types.
// These will be replaced by `openapi-typescript` output once the Go API
// (Huma) exposes /openapi.json over Tailscale. The shapes mirror the DB
// schema (infra/db/schema-0.0.1.sql) so the swap is low friction.

import type { DataSource, StatusLevel, VehicleStatus } from "@/types/domain";

export interface RouteSummary {
  routeId: string;
  shortName: string;
  longName: string;
  routeType: number;
  status: StatusLevel;
}

export interface RoutesResponse {
  routes: RouteSummary[];
}

export interface RouteDetail extends RouteSummary {
  healthScore: number; // 0 to 5
  dataSource: DataSource;
  lastUpdated: string; // ISO 8601 UTC
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
  lastUpdated: string; // ISO 8601 UTC
  vehicles: Vehicle[];
}
