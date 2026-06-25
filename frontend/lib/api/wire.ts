// Raw shapes the Go API returns. These mirror the Huma DTOs exactly (Huma
// serializes the handler Body struct as the response body).
//
// Fields the real API does not send yet are marked optional. That lets the mock
// stay rich (status, health, shape, next stop) while the real API simply omits
// them and the UI degrades gracefully via the adapters.

import type { StatusLevel } from "@/types/domain";

export interface RouteWire {
  routeId: string;
  shortName: string;
  longName: string;
  routeType: number | null;
  status?: StatusLevel;
  region?: string;
  healthScore?: number;
  shape?: [number, number][];
}

export interface RouteListWire {
  routes: RouteWire[];
  total: number;
}

export interface VehiclePositionWire {
  vehicleId: string;
  tripId: string | null;
  lat: number | null;
  lon: number | null;
  bearing: number | null;
  speed: number | null;
  currentStatus: string | null; // GTFS-RT current_status
  currentStopSequence: number | null;
  stopId: string | null;
  congestionLevel: string | null;
  lastUpdated: string; // ISO 8601 UTC
  nextStop?: string | null;
}

export interface LiveVehiclesWire {
  routeId: string;
  vehicles: VehiclePositionWire[];
  total: number;
}

export interface TripUpdateWire {
  ts: string;
  tripId: string;
  routeId: string;
  stopId: string;
  stopSequence: number | null;
  arrivalDelay: number | null; // seconds
  arrivalTime: string | null; // ISO 8601 UTC
  departureDelay: number | null;
  departureTime: string | null;
  scheduleRelationship: string | null;
}

export interface RouteTripUpdatesWire {
  routeId: string;
  total: number;
  tripUpdates: TripUpdateWire[];
}
