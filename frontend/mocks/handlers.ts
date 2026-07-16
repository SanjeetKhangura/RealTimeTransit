import { http, HttpResponse } from "msw";
import {
  SEED_ROUTES,
  liveVehicles,
  routeAlerts,
  routeHistory,
  routeShape,
  routeStops,
  routeTripUpdates,
  systemAlerts,
} from "./fixtures";
import type {
  AlertListWire,
  LiveVehiclesWire,
  RouteHistoryWire,
  RouteListWire,
  RouteShapeWire,
  RouteTripUpdatesWire,
  RouteWire,
  StopListWire,
  SystemAlertsWire,
} from "@/lib/api/wire";

// Our seed statuses to the API's status strings, so the mock matches the API.
const API_STATUS = {
  clear: "on_time",
  warning: "minor_delays",
  issue: "disrupted",
} as const;

// Mocks emit the real API wire shapes so the adapters run the same way they
// will against the Go API. "*/" matches any origin, so the same handlers work
// in the browser and in Node.
export const handlers = [
  http.get("*/api/routes", () => {
    const routes: RouteWire[] = SEED_ROUTES.map((r) => ({
      routeId: r.routeId,
      shortName: r.shortName,
      longName: r.longName,
      routeType: r.routeType,
      status: API_STATUS[r.status],
      healthScore: r.healthScore,
      region: r.region,
    }));
    return HttpResponse.json<RouteListWire>({ routes, total: routes.length });
  }),

  http.get("*/api/alerts/system", () => {
    return HttpResponse.json<SystemAlertsWire>(systemAlerts());
  }),

  http.get("*/api/routes/:id/live", ({ params }) => {
    const id = String(params.id);
    return HttpResponse.json<LiveVehiclesWire>(liveVehicles(id));
  }),

  http.get("*/api/routes/:id/stops", ({ params }) => {
    const id = String(params.id);
    return HttpResponse.json<StopListWire>(routeStops(id));
  }),

  http.get("*/api/routes/:id/trip-updates", ({ params }) => {
    const id = String(params.id);
    return HttpResponse.json<RouteTripUpdatesWire>(routeTripUpdates(id));
  }),

  http.get("*/api/routes/:id/alerts", ({ params }) => {
    const id = String(params.id);
    return HttpResponse.json<AlertListWire>(routeAlerts(id));
  }),

  http.get("*/api/routes/:id/history", ({ params }) => {
    const id = String(params.id);
    return HttpResponse.json<RouteHistoryWire>(routeHistory(id));
  }),

  http.get("*/api/routes/:id/shape", ({ params }) => {
    const id = String(params.id);
    return HttpResponse.json<RouteShapeWire>(routeShape(id));
  }),

  http.get("*/api/routes/:id", ({ params }) => {
    const id = String(params.id);
    const route = SEED_ROUTES.find((r) => r.routeId === id);
    if (!route) return new HttpResponse(null, { status: 404 });
    const detail: RouteWire = {
      routeId: route.routeId,
      shortName: route.shortName,
      longName: route.longName,
      routeType: route.routeType,
      status: API_STATUS[route.status],
      healthScore: route.healthScore,
      region: route.region,
      dataSource: "realtime",
      lastUpdated: new Date().toISOString(),
    };
    return HttpResponse.json(detail);
  }),
];
