import type { StatusLevel, VehicleStatus } from "@/types/domain";
import type { ServiceAlert, StopAdherence, Vehicle } from "@/types/api";

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

export function liveVehicles(routeId: string): Vehicle[] {
  const route = findRoute(routeId);
  if (!route) return [];
  return route.vehicles.map((v) => ({
    vehicleId: v.vehicleId,
    routeId: route.routeId,
    lat: jitter(v.lat),
    lon: jitter(v.lon),
    bearing: Math.round(Math.random() * 360),
    status: v.status,
    stopId: v.stopId,
    nextStop: v.nextStop,
  }));
}

// A short polyline through the route's anchor, standing in for the GTFS shape.
export function routeShape(routeId: string): [number, number][] {
  const route = findRoute(routeId);
  if (!route) return [];
  const [lat, lon] = routeBase(route);
  const points: [number, number][] = [];
  for (let i = -3; i <= 3; i++) {
    points.push([lat + i * 0.002, lon + i * 0.01]);
  }
  return points;
}

const STOP_NAMES = ["Terminal", "Central Station", "Main St", "Broadway", "University Loop"];

export function routeStops(routeId: string): StopAdherence[] {
  const route = findRoute(routeId);
  if (!route) return [];
  const [lat, lon] = routeBase(route);
  const now = Date.now();
  const delayByStatus = { clear: 30, warning: 240, issue: 540 } as const;
  return STOP_NAMES.map((name, i) => ({
    stopId: `${routeId}-S${i + 1}`,
    stopName: name,
    lat: lat + (i - 2) * 0.004,
    lon: lon + (i - 2) * 0.012,
    scheduledArrival: new Date(now + i * 5 * 60_000).toISOString(),
    predictedArrival: null, // ML is not serving predictions yet
    arrivalDelay: i === 0 ? 0 : delayByStatus[route.status],
  }));
}

export function routeAlerts(routeId: string): ServiceAlert[] {
  const route = findRoute(routeId);
  if (!route || route.status === "clear") return [];
  const now = Date.now();
  if (route.status === "issue") {
    return [
      {
        alertId: `${routeId}-A1`,
        severity: "critical",
        header: "Major delays",
        description: `Significant delays on the ${route.shortName}. Expect waits of over 10 minutes.`,
        startTime: new Date(now - 30 * 60_000).toISOString(),
        endTime: null,
      },
    ];
  }
  return [
    {
      alertId: `${routeId}-A1`,
      severity: "warning",
      header: "Bus bunching detected",
      description: `Two ${route.shortName} buses are running close together between Central Station and Broadway.`,
      startTime: new Date(now - 15 * 60_000).toISOString(),
      endTime: null,
    },
  ];
}
