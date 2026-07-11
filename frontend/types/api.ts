// UI-facing domain types the components consume. The raw API response shapes
// live in lib/api/wire.ts and are mapped to these by lib/api/adapters.ts.
// Fields the API does not provide yet are optional so the UI degrades
// gracefully against the real backend and fills in when those land.

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
  routeType: number | null;
  status?: StatusLevel; // pending backend (adherence analytics)
  region?: string; // pending backend
}

export interface RouteDetail extends RouteSummary {
  healthScore?: number; // 0 to 5
  shape?: [number, number][]; // pending backend (not sent by the API yet)
  dataSource?: DataSource;
  lastUpdated?: string; // ISO 8601 UTC
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

export interface StopAdherence {
  stopId: string;
  stopName: string;
  lat?: number; // map marker coordinate; absent from /trip-updates
  lon?: number;
  scheduledArrival: string | null;
  predictedArrival: string | null;
  arrivalDelay: number | null;
}

export interface ServiceAlert {
  alertId: string;
  severity: AlertSeverity;
  header: string;
  description: string;
  startTime: string;
  endTime: string | null;
}
