import { agencySecondsNow } from "@/lib/utils/format";
import type { StatusLevel, VehicleStatus } from "@/types/domain";
import type {
  AlertListWire,
  HistoryPointWire,
  LiveVehiclesWire,
  RouteHistoryWire,
  RouteShapeWire,
  RouteTripUpdatesWire,
  ShapePointWire,
  StopWire,
  SystemAlertsWire,
  TripScheduleListWire,
  TripScheduleSummaryWire,
  TripStopListWire,
  TripUpdateWire,
  VehiclePositionWire,
} from "@/lib/api/wire";

export interface SeedVehicle {
  vehicleId: string;
  lat: number;
  lon: number;
  status: VehicleStatus;
  stopId: string;
  nextStop: string;
}

export interface SeedRoute {
  routeId: string;
  shortName: string;
  longName: string;
  routeType: number;
  status: StatusLevel;
  healthScore: number; // 0 to 5
  region: string;
  vehicles: SeedVehicle[];
}

// A small set of real TransLink routes with plausible Vancouver coordinates.
export const SEED_ROUTES: SeedRoute[] = [
  {
    routeId: "99",
    shortName: "99",
    longName: "UBC / Commercial-Broadway (B-Line)",
    routeType: 3,
    status: "clear",
    healthScore: 4.5,
    region: "Vancouver",
    vehicles: [
      { vehicleId: "99-1", lat: 49.2627, lon: -123.1139, status: "in_transit", stopId: "1101", nextStop: "Broadway-City Hall" },
      { vehicleId: "99-2", lat: 49.2641, lon: -123.1556, status: "stopped", stopId: "1145", nextStop: "Granville" },
      { vehicleId: "99-3", lat: 49.2655, lon: -123.203, status: "in_transit", stopId: "1188", nextStop: "Alma" },
    ],
  },
  {
    routeId: "25",
    shortName: "25",
    longName: "Brentwood Station / UBC",
    routeType: 3,
    status: "warning",
    healthScore: 3.5,
    region: "Burnaby",
    vehicles: [
      { vehicleId: "25-1", lat: 49.2496, lon: -123.1156, status: "in_transit", stopId: "2210", nextStop: "King Edward" },
      { vehicleId: "25-2", lat: 49.2502, lon: -123.0712, status: "incoming", stopId: "2255", nextStop: "Nanaimo Station" },
    ],
  },
  {
    routeId: "49",
    shortName: "49",
    longName: "Metrotown Station / UBC / Dunbar",
    routeType: 3,
    status: "clear",
    healthScore: 4,
    region: "Vancouver",
    vehicles: [
      { vehicleId: "49-1", lat: 49.2261, lon: -123.1139, status: "in_transit", stopId: "4910", nextStop: "Langara-49th" },
      { vehicleId: "49-2", lat: 49.2268, lon: -123.1556, status: "stopped", stopId: "4955", nextStop: "Dunbar Loop" },
    ],
  },
  {
    routeId: "R4",
    shortName: "R4",
    longName: "41st Avenue RapidBus",
    routeType: 3,
    status: "warning",
    healthScore: 3,
    region: "Vancouver",
    vehicles: [
      { vehicleId: "R4-1", lat: 49.2349, lon: -123.0712, status: "in_transit", stopId: "7041", nextStop: "Joyce-Collingwood" },
      { vehicleId: "R4-2", lat: 49.2336, lon: -123.1556, status: "in_transit", stopId: "7088", nextStop: "Oakridge-41st" },
    ],
  },
  {
    routeId: "2",
    shortName: "2",
    longName: "Macdonald / Downtown",
    routeType: 3,
    status: "issue",
    healthScore: 2,
    region: "Vancouver",
    vehicles: [
      { vehicleId: "2-1", lat: 49.2761, lon: -123.1339, status: "stopped", stopId: "0210", nextStop: "Burrard Station" },
    ],
  },
  {
    routeId: "250",
    shortName: "250",
    longName: "Horseshoe Bay / Vancouver",
    routeType: 3,
    status: "clear",
    healthScore: 4,
    region: "North Shore",
    vehicles: [
      { vehicleId: "250-1", lat: 49.3289, lon: -123.1604, status: "in_transit", stopId: "2510", nextStop: "Park Royal" },
      { vehicleId: "250-2", lat: 49.3712, lon: -123.2715, status: "in_transit", stopId: "2566", nextStop: "Caulfeild" },
    ],
  },
];

function findRoute(routeId: string): SeedRoute | undefined {
  return SEED_ROUTES.find((r) => r.routeId === routeId);
}

// Center of a route's seed vehicles, used as an anchor for shape and stops.
function routeBase(route: SeedRoute): [number, number] {
  const lat = route.vehicles.reduce((s, v) => s + v.lat, 0) / route.vehicles.length;
  const lon = route.vehicles.reduce((s, v) => s + v.lon, 0) / route.vehicles.length;
  return [lat, lon];
}

// Small random offset so positions visibly shift between polls in the demo.
function jitter(base: number): number {
  return base + (Math.random() - 0.5) * 0.004;
}

const GTFS_STATUS: Record<VehicleStatus, string> = {
  in_transit: "IN_TRANSIT_TO",
  stopped: "STOPPED_AT",
  incoming: "INCOMING_AT",
};

// Returns the /live response in the real API wire shape, so the adapter runs
// exactly as it will against the Go API.
export function liveVehicles(routeId: string): LiveVehiclesWire {
  const route = findRoute(routeId);
  if (!route) return { routeId, vehicles: [], total: 0 };
  const vehicles: VehiclePositionWire[] = route.vehicles.map((v) => ({
    vehicleId: v.vehicleId,
    tripId: null,
    lat: jitter(v.lat),
    lon: jitter(v.lon),
    bearing: Math.round(Math.random() * 360),
    speed: null,
    currentStatus: GTFS_STATUS[v.status],
    currentStopSequence: null,
    stopId: v.stopId,
    congestionLevel: null,
    lastUpdated: new Date().toISOString(),
    nextStop: v.nextStop,
  }));
  return { routeId, vehicles, total: vehicles.length };
}

// Mock /shape in the real API wire shape: a short polyline through the route's
// anchor, standing in for the GTFS shape. Points are ordered [lat, lon].
export function routeShape(routeId: string): RouteShapeWire {
  const route = findRoute(routeId);
  if (!route) return { routeId, shapeId: "", points: [], total: 0 };
  const [lat, lon] = routeBase(route);
  const points: ShapePointWire[] = [];
  for (let i = -3; i <= 3; i++) {
    points.push({ lat: lat + i * 0.002, lon: lon + i * 0.01, sequence: i + 4 });
  }
  return { routeId, shapeId: `${routeId}-shape`, points, total: points.length };
}

const STOP_NAMES = ["Terminal", "Central Station", "Main St", "Broadway", "University Loop"];
const DELAY_BY_STATUS = { clear: 30, warning: 240, issue: 540 } as const;

// Mock /api/routes/{id}/trips/schedule: a few trips through the day. One is
// marked active so the picker selects it and the schedule table has data, even
// though the real feed reports isActive false until ingest runs continuously.
export function routeTripSchedule(routeId: string): TripScheduleListWire {
  const route = findRoute(routeId);
  if (!route) return { routeId, trips: [], total: 0 };
  const trips: TripScheduleSummaryWire[] = [
    { tripId: `${routeId}-T1`, directionId: 0, tripHeadsign: route.longName, startSeconds: 6 * 3600, endSeconds: 7 * 3600, isActive: true },
    { tripId: `${routeId}-T2`, directionId: 0, tripHeadsign: route.longName, startSeconds: 12 * 3600, endSeconds: 13 * 3600, isActive: false },
    { tripId: `${routeId}-T3`, directionId: 1, tripHeadsign: "Downtown", startSeconds: 18 * 3600, endSeconds: 19 * 3600, isActive: false },
  ];
  return { routeId, trips, total: trips.length };
}

// Mock /api/routes/{id}/stops?trip_id=... in the real API wire shape: one
// trip's ordered stops with names, coordinates, and times.
export function routeStops(routeId: string, tripId: string): TripStopListWire {
  const route = findRoute(routeId);
  if (!route) return { routeId, tripId, stops: [], total: 0 };
  const [lat, lon] = routeBase(route);
  const now = Date.now();
  const delay = DELAY_BY_STATUS[route.status];
  // The API sends the static scheduled time as seconds since midnight, and the
  // adapter reads it from there, so emit it the same way. Scheduled is the
  // predicted arrival minus that stop's delay, which keeps the two columns
  // consistent with each other.
  const baseSeconds = agencySecondsNow(now);
  const stops: StopWire[] = STOP_NAMES.map((name, i) => {
    const stopDelay = i === 0 ? 0 : delay;
    const scheduledSeconds = baseSeconds + i * 300 - stopDelay;
    return {
      stopId: `${routeId}-S${i + 1}`,
      stopName: name,
      stopLat: lat + (i - 2) * 0.004,
      stopLon: lon + (i - 2) * 0.012,
      stopCode: null,
      stopDesc: null,
      wheelchairBoarding: null,
      stopSequence: i + 1,
      arrivalSeconds: scheduledSeconds,
      departureSeconds: scheduledSeconds + 60,
      arrivalDelay: stopDelay,
      arrivalTime: new Date(now + i * 5 * 60_000).toISOString(),
    };
  });
  return { routeId, tripId, stops, total: stops.length };
}

// Mock /trip-updates in the real API wire shape (secondary to /stops).
export function routeTripUpdates(routeId: string): RouteTripUpdatesWire {
  const route = findRoute(routeId);
  if (!route) return { routeId, total: 0, tripUpdates: [] };
  const now = Date.now();
  const delay = DELAY_BY_STATUS[route.status];
  const tripUpdates: TripUpdateWire[] = STOP_NAMES.map((_, i) => ({
    ts: new Date(now).toISOString(),
    tripId: `${routeId}-T1`,
    routeId,
    stopId: `${routeId}-S${i + 1}`,
    stopSequence: i + 1,
    arrivalDelay: i === 0 ? 0 : delay,
    arrivalTime: new Date(now + i * 5 * 60_000).toISOString(),
    departureDelay: null,
    departureTime: null,
    scheduleRelationship: "SCHEDULED",
  }));
  return { routeId, total: tripUpdates.length, tripUpdates };
}

// Mock /alerts in the real API wire shape (cause/effect/text).
export function routeAlerts(routeId: string): AlertListWire {
  const route = findRoute(routeId);
  if (!route || route.status === "clear") {
    return { routeId, alerts: [], total: 0 };
  }
  const now = Date.now();
  const alert =
    route.status === "issue"
      ? {
          alertId: `${routeId}-A1`,
          cause: "OTHER_CAUSE",
          effect: "SIGNIFICANT_DELAYS",
          headerText: "Major delays",
          descriptionText: `Significant delays on the ${route.shortName}. Expect waits of over 10 minutes.`,
          startTime: new Date(now - 30 * 60_000).toISOString(),
          endTime: null,
        }
      : {
          alertId: `${routeId}-A1`,
          cause: "OTHER_CAUSE",
          effect: "REDUCED_SERVICE",
          headerText: "Bus bunching detected",
          descriptionText: `Two ${route.shortName} buses are running close together between Central Station and Broadway.`,
          startTime: new Date(now - 15 * 60_000).toISOString(),
          endTime: null,
        };
  return { routeId, alerts: [alert], total: 1 };
}

// Mock /api/alerts/system: agency-wide alerts, not tied to any route. The real
// endpoint returns these from the rows in service_alert_entities that name only
// the agency.
export function systemAlerts(): SystemAlertsWire {
  const now = Date.now();
  return {
    alerts: [
      {
        alertId: "SYS-1",
        cause: "MAINTENANCE",
        effect: "MODIFIED_SERVICE",
        headerText: "Reduced holiday schedule",
        descriptionText:
          "All routes are running on a reduced holiday schedule today. Expect longer waits between buses.",
        startTime: new Date(now - 2 * 3_600_000).toISOString(),
        endTime: null,
      },
    ],
    total: 1,
  };
}

// Mock /history in the real API wire shape: 24 hourly reliability buckets.
export function routeHistory(routeId: string): RouteHistoryWire {
  const route = findRoute(routeId);
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 3_600_000);
  const base = route ? DELAY_BY_STATUS[route.status] : 60;
  const points: HistoryPointWire[] = Array.from({ length: 24 }, (_, i) => {
    const bucket = new Date(from.getTime() + i * 3_600_000);
    const h = bucket.getUTCHours();
    const rush = Math.exp(-((h - 8) ** 2) / 6) + Math.exp(-((h - 17) ** 2) / 6);
    return {
      bucket: bucket.toISOString(),
      avgDelaySecs: Math.round(base * 0.5 + rush * 180),
      sampleSize: 20,
    };
  });
  return {
    routeId,
    from: from.toISOString(),
    to: now.toISOString(),
    bucket: "hour",
    points,
    total: points.length,
  };
}
