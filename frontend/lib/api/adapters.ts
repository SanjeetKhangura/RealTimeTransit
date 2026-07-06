// Maps raw API wire shapes to the UI domain types. Keeping this in one place
// means switching from mocks to the real API is just these mappings, and the
// components never see the wire format.

import type {
  RouteDetail,
  RouteSummary,
  ServiceAlert,
  StopAdherence,
  Vehicle,
} from "@/types/api";
import type { AlertSeverity, VehicleStatus } from "@/types/domain";
import type {
  AlertWire,
  LiveVehiclesWire,
  RouteWire,
  StopWire,
  TripUpdateWire,
} from "./wire";

export function toRouteSummary(w: RouteWire): RouteSummary {
  return {
    routeId: w.routeId,
    shortName: w.shortName,
    longName: w.longName,
    routeType: w.routeType,
    status: w.status,
    region: w.region,
  };
}

export function toRouteDetail(w: RouteWire): RouteDetail {
  return {
    ...toRouteSummary(w),
    healthScore: w.healthScore,
    shape: w.shape,
  };
}

// GTFS-RT current_status to our movement enum.
const STATUS_MAP: Record<string, VehicleStatus> = {
  IN_TRANSIT_TO: "in_transit",
  STOPPED_AT: "stopped",
  INCOMING_AT: "incoming",
};

export function toVehicleStatus(raw: string | null): VehicleStatus {
  if (raw && raw in STATUS_MAP) return STATUS_MAP[raw];
  return "in_transit";
}

// Vehicles without coordinates can't be placed on the map, so drop them.
export function toVehicles(w: LiveVehiclesWire): Vehicle[] {
  const out: Vehicle[] = [];
  for (const v of w.vehicles) {
    if (v.lat === null || v.lon === null) continue;
    out.push({
      vehicleId: v.vehicleId,
      routeId: w.routeId,
      lat: v.lat,
      lon: v.lon,
      bearing: v.bearing,
      status: toVehicleStatus(v.currentStatus),
      stopId: v.stopId,
      nextStop: v.nextStop ?? null,
    });
  }
  return out;
}

// Primary schedule/adherence source. /stops carries names, coordinates, and
// scheduled + realtime arrival times, so it feeds both the schedule table and
// the map markers. Scheduled is reconstructed from the realtime arrival minus
// the delay; the static scheduled time (arrivalSeconds) is also available and
// can replace this once we can verify the timezone handling against the API.
export function toStopAdherence(s: StopWire): StopAdherence {
  let scheduledArrival: string | null = null;
  if (s.arrivalTime && s.arrivalDelay !== null) {
    scheduledArrival = new Date(
      new Date(s.arrivalTime).getTime() - s.arrivalDelay * 1000,
    ).toISOString();
  }
  return {
    stopId: s.stopId,
    stopName: s.stopName ?? s.stopId,
    lat: s.stopLat ?? undefined,
    lon: s.stopLon ?? undefined,
    scheduledArrival,
    predictedArrival: s.arrivalTime ?? null,
    arrivalDelay: s.arrivalDelay,
  };
}

// Secondary: maps a per-trip update to a schedule row. Kept for the
// /trip-updates endpoint; the schedule table uses /stops.
export function tripUpdateToStopAdherence(tu: TripUpdateWire): StopAdherence {
  let scheduledArrival: string | null = null;
  if (tu.arrivalTime && tu.arrivalDelay !== null) {
    scheduledArrival = new Date(
      new Date(tu.arrivalTime).getTime() - tu.arrivalDelay * 1000,
    ).toISOString();
  }
  return {
    stopId: tu.stopId,
    stopName: tu.stopId,
    scheduledArrival,
    predictedArrival: null,
    arrivalDelay: tu.arrivalDelay,
  };
}

// GTFS-RT alert effect to our severity.
const EFFECT_SEVERITY: Record<string, AlertSeverity> = {
  NO_SERVICE: "critical",
  SIGNIFICANT_DELAYS: "critical",
  REDUCED_SERVICE: "warning",
  DETOUR: "warning",
  MODIFIED_SERVICE: "warning",
};

function effectToSeverity(effect: string | null): AlertSeverity {
  if (effect && effect in EFFECT_SEVERITY) return EFFECT_SEVERITY[effect];
  return "info";
}

export function toServiceAlert(a: AlertWire): ServiceAlert {
  return {
    alertId: a.alertId,
    severity: effectToSeverity(a.effect),
    header: a.headerText ?? "Service alert",
    description: a.descriptionText ?? "",
    startTime: a.startTime ?? "",
    endTime: a.endTime ?? null,
  };
}
