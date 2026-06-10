import { http, HttpResponse } from "msw";
import {
  SEED_ROUTES,
  liveVehicles,
  routeAlerts,
  routeShape,
  routeStops,
} from "./fixtures";
import type {
  AlertsResponse,
  LiveResponse,
  RouteDetail,
  RouteSummary,
  RoutesResponse,
  StopsResponse,
} from "@/types/api";

// "*/" prefix matches any origin, so the same handlers work in the browser
// (relative URLs) and in Node tests (absolute URLs).
export const handlers = [
  http.get("*/api/routes", () => {
    const routes: RouteSummary[] = SEED_ROUTES.map((r) => ({
      routeId: r.routeId,
      shortName: r.shortName,
      longName: r.longName,
      routeType: r.routeType,
      status: r.status,
      region: r.region,
    }));
    return HttpResponse.json<RoutesResponse>({ routes });
  }),

  http.get("*/api/routes/:id/live", ({ params }) => {
    const id = String(params.id);
    return HttpResponse.json<LiveResponse>({
      dataSource: "realtime",
      lastUpdated: new Date().toISOString(),
      vehicles: liveVehicles(id),
    });
  }),

  http.get("*/api/routes/:id/stops", ({ params }) => {
    const id = String(params.id);
    return HttpResponse.json<StopsResponse>({ stops: routeStops(id) });
  }),

  http.get("*/api/routes/:id/alerts", ({ params }) => {
    const id = String(params.id);
    return HttpResponse.json<AlertsResponse>({ alerts: routeAlerts(id) });
  }),

  http.get("*/api/routes/:id", ({ params }) => {
    const id = String(params.id);
    const route = SEED_ROUTES.find((r) => r.routeId === id);
    if (!route) return new HttpResponse(null, { status: 404 });
    const detail: RouteDetail = {
      routeId: route.routeId,
      shortName: route.shortName,
      longName: route.longName,
      routeType: route.routeType,
      status: route.status,
      region: route.region,
      healthScore: route.healthScore,
      dataSource: "realtime",
      lastUpdated: new Date().toISOString(),
      shape: routeShape(id),
    };
    return HttpResponse.json(detail);
  }),
];
