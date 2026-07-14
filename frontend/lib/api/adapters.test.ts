import { describe, it, expect } from "vitest";
import {
  toReliabilityPoint,
  toRouteDetail,
  toRouteSummary,
  toServiceAlert,
  toShape,
  toStopAdherence,
  toVehicleStatus,
  toVehicles,
  tripUpdateToStopAdherence,
} from "./adapters";
import type {
  AlertWire,
  LiveVehiclesWire,
  StopWire,
  TripUpdateWire,
} from "./wire";

describe("toVehicleStatus", () => {
  it("maps GTFS statuses to the movement enum", () => {
    expect(toVehicleStatus("IN_TRANSIT_TO")).toBe("in_transit");
    expect(toVehicleStatus("STOPPED_AT")).toBe("stopped");
    expect(toVehicleStatus("INCOMING_AT")).toBe("incoming");
  });

  it("falls back to in_transit for unknown or missing values", () => {
    expect(toVehicleStatus(null)).toBe("in_transit");
    expect(toVehicleStatus("SOMETHING_ELSE")).toBe("in_transit");
  });
});

describe("toVehicles", () => {
  it("drops vehicles with no coordinates and maps the rest", () => {
    const wire: LiveVehiclesWire = {
      routeId: "99",
      total: 2,
      vehicles: [
        {
          vehicleId: "a",
          tripId: null,
          lat: 49.2,
          lon: -123.1,
          bearing: 90,
          speed: null,
          currentStatus: "STOPPED_AT",
          currentStopSequence: null,
          stopId: "s1",
          congestionLevel: null,
          lastUpdated: "2026-07-06T00:00:00Z",
        },
        {
          vehicleId: "b",
          tripId: null,
          lat: null,
          lon: null,
          bearing: null,
          speed: null,
          currentStatus: null,
          currentStopSequence: null,
          stopId: null,
          congestionLevel: null,
          lastUpdated: "2026-07-06T00:00:00Z",
        },
      ],
    };
    const out = toVehicles(wire);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      vehicleId: "a",
      routeId: "99",
      lat: 49.2,
      status: "stopped",
    });
  });
});

describe("toRouteSummary", () => {
  it("maps the API status to our status level", () => {
    const s = toRouteSummary({
      routeId: "99",
      shortName: "99",
      longName: "UBC",
      routeType: 3,
      status: "on_time",
      region: "Vancouver",
    });
    expect(s).toMatchObject({ status: "clear", region: "Vancouver" });
  });

  it("leaves status undefined for unknown or missing status", () => {
    expect(
      toRouteSummary({
        routeId: "2",
        shortName: "2",
        longName: "Macdonald",
        routeType: null,
      }).status,
    ).toBeUndefined();
    expect(
      toRouteSummary({
        routeId: "2",
        shortName: "2",
        longName: "Macdonald",
        routeType: null,
        status: "unknown",
      }).status,
    ).toBeUndefined();
  });
});

describe("toRouteDetail", () => {
  it("maps status and dataSource and hides a zero health score", () => {
    const d = toRouteDetail({
      routeId: "99",
      shortName: "99",
      longName: "UBC",
      routeType: 3,
      status: "disrupted",
      healthScore: 0,
      dataSource: "realtime",
      lastUpdated: "2026-07-06T00:00:00Z",
    });
    expect(d.status).toBe("issue");
    expect(d.dataSource).toBe("realtime");
    expect(d.healthScore).toBeUndefined();
    expect(d.lastUpdated).toBe("2026-07-06T00:00:00Z");
  });

  it("keeps a real health score", () => {
    const d = toRouteDetail({
      routeId: "99",
      shortName: "99",
      longName: "UBC",
      routeType: 3,
      status: "on_time",
      healthScore: 4.5,
      dataSource: "scheduled",
      lastUpdated: null,
    });
    expect(d.healthScore).toBe(4.5);
    expect(d.dataSource).toBe("scheduled");
    expect(d.lastUpdated).toBeUndefined();
  });
});

const baseStop: StopWire = {
  stopId: "99-S1",
  stopName: "Terminal",
  stopLat: 49.26,
  stopLon: -123.11,
  stopCode: null,
  stopDesc: null,
  wheelchairBoarding: null,
  stopSequence: 1,
  arrivalSeconds: null,
  departureSeconds: null,
  arrivalDelay: 120,
  arrivalTime: "2026-07-06T22:07:00Z",
};

describe("toStopAdherence", () => {
  it("maps names and coordinates and reconstructs the scheduled time", () => {
    const row = toStopAdherence(baseStop);
    expect(row.stopName).toBe("Terminal");
    expect(row.lat).toBe(49.26);
    expect(row.predictedArrival).toBe("2026-07-06T22:07:00Z");
    expect(row.scheduledArrival).toBe("2026-07-06T22:05:00.000Z");
    expect(row.arrivalDelay).toBe(120);
  });

  it("falls back to the id and leaves times null when data is missing", () => {
    const row = toStopAdherence({
      ...baseStop,
      stopName: null,
      stopLat: null,
      stopLon: null,
      arrivalDelay: null,
      arrivalTime: null,
    });
    expect(row.stopName).toBe("99-S1");
    expect(row.lat).toBeUndefined();
    expect(row.scheduledArrival).toBeNull();
    expect(row.predictedArrival).toBeNull();
  });
});

describe("tripUpdateToStopAdherence", () => {
  const tu: TripUpdateWire = {
    ts: "2026-07-06T00:00:00Z",
    tripId: "t1",
    routeId: "99",
    stopId: "99-S1",
    stopSequence: 1,
    arrivalDelay: 120,
    arrivalTime: "2026-07-06T22:07:00Z",
    departureDelay: null,
    departureTime: null,
    scheduleRelationship: "SCHEDULED",
  };

  it("reconstructs the scheduled time and keeps predicted null", () => {
    const row = tripUpdateToStopAdherence(tu);
    expect(row.stopName).toBe("99-S1");
    expect(row.predictedArrival).toBeNull();
    expect(row.scheduledArrival).toBe("2026-07-06T22:05:00.000Z");
  });

  it("leaves scheduled null when arrival data is missing", () => {
    expect(
      tripUpdateToStopAdherence({ ...tu, arrivalDelay: null, arrivalTime: null })
        .scheduledArrival,
    ).toBeNull();
  });
});

describe("toServiceAlert", () => {
  it("maps effect to severity and copies the text fields", () => {
    const a: AlertWire = {
      alertId: "a1",
      cause: "OTHER_CAUSE",
      effect: "SIGNIFICANT_DELAYS",
      headerText: "Major delays",
      descriptionText: "Big delays",
      startTime: "2026-07-06T00:00:00Z",
      endTime: null,
    };
    expect(toServiceAlert(a)).toMatchObject({
      alertId: "a1",
      severity: "critical",
      header: "Major delays",
      description: "Big delays",
    });
  });

  it("defaults severity and header when fields are missing", () => {
    const out = toServiceAlert({
      alertId: "a2",
      cause: null,
      effect: null,
      headerText: null,
      descriptionText: null,
      startTime: null,
      endTime: null,
    });
    expect(out.severity).toBe("info");
    expect(out.header).toBe("Service alert");
    expect(out.description).toBe("");
  });
});

describe("toShape", () => {
  it("orders points by sequence and maps to [lat, lon]", () => {
    const line = toShape({
      routeId: "99",
      shapeId: "99-shape",
      points: [
        { lat: 49.2, lon: -123.1, sequence: 2 },
        { lat: 49.1, lon: -123.0, sequence: 1 },
      ],
      total: 2,
    });
    expect(line).toEqual([
      [49.1, -123.0],
      [49.2, -123.1],
    ]);
  });

  it("returns an empty line when there are no points", () => {
    expect(
      toShape({ routeId: "99", shapeId: "", points: [], total: 0 }),
    ).toEqual([]);
  });
});

describe("toReliabilityPoint", () => {
  it("renames the wire fields to our domain shape", () => {
    const p = toReliabilityPoint({
      bucket: "2026-07-06T08:00:00Z",
      avgDelaySecs: 90,
      sampleSize: 42,
    });
    expect(p).toEqual({
      bucket: "2026-07-06T08:00:00Z",
      avgDelaySeconds: 90,
      samples: 42,
    });
  });
});
