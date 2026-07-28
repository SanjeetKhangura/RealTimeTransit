// Maps raw API wire shapes to the UI domain types. Keeping this in one place
// means switching from mocks to the real API is just these mappings, and the
// components never see the wire format.

import type {
  ReliabilityPoint,
  RouteDetail,
  RouteSummary,
  ServiceAlert,
  StopAdherence,
  Vehicle,
} from "@/types/api";
import type {
  AlertSeverity,
  DataSource,
  StatusLevel,
  VehicleStatus,
} from "@/types/domain";
import type {
  AlertWire,
  HistoryPointWire,
  LiveVehiclesWire,
  RouteShapeWire,
  RouteWire,
  StopWire,
  TripScheduleSummaryWire,
  TripUpdateWire,
} from "./wire";
import { formatGtfsTime } from "@/lib/utils/format";

// API status string to our status level. Unknown or absent leaves no status.
const API_STATUS: Record<string, StatusLevel> = {
  on_time: "clear",
  minor_delays: "warning",
  disrupted: "issue",
};

function statusFromApi(raw: string | undefined): StatusLevel | undefined {
  if (raw && raw in API_STATUS) return API_STATUS[raw];
  return undefined;
}

function dataSourceFromApi(raw: string | undefined): DataSource | undefined {
  return raw === "realtime" || raw === "scheduled" ? raw : undefined;
}

export function toRouteSummary(w: RouteWire): RouteSummary {
  return {
    routeId: w.routeId,
    shortName: w.shortName,
    longName: w.longName,
    routeType: w.routeType,
    status: statusFromApi(w.status),
    region: w.region,
  };
}

export function toRouteDetail(w: RouteWire): RouteDetail {
  return {
    ...toRouteSummary(w),
    // 0 means no data yet (until ingest runs), so hide the rating.
    healthScore: w.healthScore && w.healthScore > 0 ? w.healthScore : undefined,
    dataSource: dataSourceFromApi(w.dataSource),
    lastUpdated: w.lastUpdated ?? undefined,
  };
}

// Route polyline for the map. The API returns [lat, lon] points; sort by
// sequence so the line is drawn in order regardless of the row order.
export function toShape(w: RouteShapeWire): [number, number][] {
  return [...w.points]
    .sort((a, b) => a.sequence - b.sequence)
    .map((p) => [p.lat, p.lon]);
}

// The /stops endpoint needs a trip_id, so pick which trip's schedule to show.
// Prefer a trip that currently has live data; otherwise the next trip to depart
// today; otherwise the earliest trip. nowSeconds is the current time as seconds
// since midnight in agency time.
export function pickTripId(
  trips: TripScheduleSummaryWire[],
  nowSeconds: number,
): string | null {
  if (trips.length === 0) return null;
  const active = trips.find((t) => t.isActive);
  if (active) return active.tripId;
  const scheduled = trips
    .filter(
      (t): t is TripScheduleSummaryWire & { startSeconds: number } =>
        t.startSeconds !== null,
    )
    .sort((a, b) => a.startSeconds - b.startSeconds);
  const next = scheduled.find((t) => t.startSeconds >= nowSeconds);
  if (next) return next.tripId;
  if (scheduled.length > 0) return scheduled[0].tripId;
  return trips[0].tripId;
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
// the map markers. Scheduled Arrival is based on the static scheduled time (arrivalSeconds)
// if no scheduled data is available, fallback to the departure time (departureSeconds).
export function toStopAdherence(s: StopWire): StopAdherence {
  const scheduledArrivalSeconds = s.arrivalSeconds ?? s.departureSeconds;

  return {
    stopId: s.stopId,
    stopName: s.stopName ?? s.stopId,
    lat: s.stopLat ?? undefined,
    lon: s.stopLon ?? undefined,
    scheduledArrival: formatGtfsTime(scheduledArrivalSeconds),
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

export function toReliabilityPoint(p: HistoryPointWire): ReliabilityPoint {
  return {
    bucket: p.bucket,
    avgDelaySeconds: p.avgDelaySecs,
    samples: p.sampleSize,
  };
}
