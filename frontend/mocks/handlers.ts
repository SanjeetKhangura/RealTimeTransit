import { http, HttpResponse } from "msw";
import {
  SEED_ROUTES,
  liveVehicles,
  routeAlerts,
  routeShape,
  routeStops,
} from "./fixtures";
import type { LiveVehiclesWire, RouteListWire, RouteWire } from "@/lib/api/wire";
import type { ServiceAlert, StopAdherence } from "@/types/api";

// Mocks emit the real API wire shapes. routes, route-by-id, and live match the
// Go API; stops and alerts are mock-only (not implemented server-side yet).
// "*/" matches any origin so the same handlers work in the browser and in Node.
export const handlers = [
  http.get("*/api/routes", () => {
    const routes: RouteWire[] = SEED_ROUTES.map((r) => ({
      routeId: r.routeId,
      shortName: r.shortName,
      longName: r.longName,
      routeType: r.routeType,
      status: r.status,
      region: r.region,
    }));
    return HttpResponse.json<RouteListWire>({ routes, total: routes.length });
  }),

  http.get("*/api/routes/:id/live", ({ params }) => {
    const id = String(params.id);
    return HttpResponse.json<LiveVehiclesWire>(liveVehicles(id));
  }),

  http.get("*/api/routes/:id/stops", ({ params }) => {
    const id = String(params.id);
    return HttpResponse.json<{ stops: StopAdherence[] }>({
      stops: routeStops(id),
    });
  }),

  http.get("*/api/routes/:id/alerts", ({ params }) => {
    const id = String(params.id);
    return HttpResponse.json<{ alerts: ServiceAlert[] }>({
      alerts: routeAlerts(id),
    });
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
      status: route.status,
      region: route.region,
      healthScore: route.healthScore,
      shape: routeShape(id),
    };
    return HttpResponse.json(detail);
  }),
];
