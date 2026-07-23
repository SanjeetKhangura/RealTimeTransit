// Raw shapes the Go API returns. These mirror the Huma DTOs exactly (Huma
// serializes the handler Body struct as the response body).
//
// Fields the real API does not send yet are marked optional. That lets the mock
// stay rich (status, health, next stop) while the real API simply omits them
// and the UI degrades gracefully via the adapters.

export interface RouteWire {
  routeId: string;
  shortName: string;
  longName: string;
  routeType: number | null;
  status?: string; // raw API status: on_time / minor_delays / disrupted / unknown
  healthScore?: number; // 0.0 to 5.0 (0 when no data)
  region?: string; // mock only, not sent by the API
  dataSource?: string; // realtime / scheduled (route detail only)
  lastUpdated?: string | null; // route detail only
}

// Route shape (map polyline). Served by its own endpoint, GET
// /api/routes/{id}/shape, not bundled in the route detail. The API returns the
// points already ordered as [lat, lon] so Leaflet can consume them directly.
export interface ShapePointWire {
  lat: number;
  lon: number;
  sequence: number;
}

export interface RouteShapeWire {
  routeId: string;
  shapeId: string;
  points: ShapePointWire[];
  total: number;
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

// GET /api/routes/{id}/stops?trip_id=... returns one trip's ordered stops.
// trip_id is required; the frontend picks a trip from the schedule endpoint
// first so the realtime delays all belong to the same bus.
export interface TripStopListWire {
  routeId: string;
  tripId: string;
  stops: StopWire[];
  total: number;
}

// GET /api/routes/{id}/trips/schedule: one summary per trip, used to pick the
// active or next-departing trip. startSeconds/endSeconds are seconds since
// midnight in agency-local time; isActive means the trip has live data now.
export interface TripScheduleSummaryWire {
  tripId: string;
  directionId: number | null;
  tripHeadsign: string | null;
  startSeconds: number | null;
  endSeconds: number | null;
  isActive: boolean;
}

export interface TripScheduleListWire {
  routeId: string;
  trips: TripScheduleSummaryWire[];
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

// GET /api/alerts/system (agency-wide) and GET /api/alerts (all active) share
// this shape. Unlike the per-route list there is no routeId.
export interface SystemAlertsWire {
  alerts: AlertWire[];
  total: number;
}

export interface HistoryPointWire {
  bucket: string; // ISO 8601 UTC
  avgDelaySecs: number; // positive late, negative early
  sampleSize: number;
}

export interface RouteHistoryWire {
  routeId: string;
  from: string;
  to: string;
  bucket: string;
  points: HistoryPointWire[];
  total: number;
}
