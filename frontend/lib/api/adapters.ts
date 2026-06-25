// Maps raw API wire shapes to the UI domain types. Keeping this in one place
// means switching from mocks to the real API is just these mappings, and the
// components never see the wire format.

import type { RouteDetail, RouteSummary, Vehicle } from "@/types/api";
import type { VehicleStatus } from "@/types/domain";
import type { LiveVehiclesWire, RouteWire } from "./wire";

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
