// Raw shapes the Go API returns. These mirror the Huma DTOs exactly (Huma
// serializes the handler Body struct as the response body).
//
// Fields the real API does not send yet are marked optional. That lets the mock
// stay rich (status, health, shape, next stop) while the real API simply omits
// them and the UI degrades gracefully via the adapters.

export interface RouteWire {
  routeId: string;
  shortName: string;
  longName: string;
  routeType: number | null;
  status?: string; // raw API status: on_time / minor_delays / disrupted / unknown
  healthScore?: number; // 0.0 to 5.0 (0 when no data)
  region?: string; // mock only, not sent by the API
  shape?: [number, number][]; // mock only, not sent by the API
  dataSource?: string; // realtime / scheduled (route detail only)
  lastUpdated?: string | null; // route detail only
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

export interface StopWire {
  stopId: string;
  stopName: string | null;
  stopLat: number | null;
  stopLon: number | null;
  stopCode: string | null;
  stopDesc: string | null;
  wheelchairBoarding: number | null;
  stopSequence: number;
  arrivalSeconds: number | null; // scheduled, seconds since midnight (agency local)
  departureSeconds: number | null;
  arrivalDelay: number | null; // seconds
  arrivalTime: string | null; // realtime predicted arrival, ISO 8601 UTC
}

export interface StopListWire {
  routeId: string;
  stops: StopWire[];
  total: number;
}

export interface AlertWire {
  alertId: string;
  cause: string | null;
  effect: string | null; // GTFS-RT effect enum
  headerText: string | null;
  descriptionText: string | null;
  startTime: string | null;
  endTime: string | null;
}

export interface AlertListWire {
  routeId: string;
  alerts: AlertWire[];
  total: number;
}
