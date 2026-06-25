import { describe, it, expect } from "vitest";
import {
  toRouteSummary,
  toStopAdherence,
  toVehicleStatus,
  toVehicles,
} from "./adapters";
import type { LiveVehiclesWire, TripUpdateWire } from "./wire";

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
          lastUpdated: "2026-06-10T00:00:00Z",
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
          lastUpdated: "2026-06-10T00:00:00Z",
        },
      ],
    };
    const out = toVehicles(wire);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      vehicleId: "a",
      routeId: "99",
      lat: 49.2,
      lon: -123.1,
      status: "stopped",
    });
  });
});

describe("toRouteSummary", () => {
  it("passes through optional fields when the mock provides them", () => {
    const s = toRouteSummary({
      routeId: "99",
      shortName: "99",
      longName: "UBC",
      routeType: 3,
      status: "clear",
      region: "Vancouver",
    });
    expect(s).toMatchObject({ status: "clear", region: "Vancouver" });
  });

  it("leaves optional fields undefined when the API omits them", () => {
    const s = toRouteSummary({
      routeId: "2",
      shortName: "2",
      longName: "Macdonald",
      routeType: null,
    });
    expect(s.status).toBeUndefined();
    expect(s.routeType).toBeNull();
  });
});

describe("toStopAdherence", () => {
  it("reconstructs the scheduled time from arrival minus delay", () => {
    const tu: TripUpdateWire = {
      ts: "2026-06-25T00:00:00Z",
      tripId: "t1",
      routeId: "99",
      stopId: "99-S1",
      stopSequence: 1,
      arrivalDelay: 120,
      arrivalTime: "2026-06-25T22:07:00Z",
      departureDelay: null,
      departureTime: null,
      scheduleRelationship: "SCHEDULED",
    };
    const row = toStopAdherence(tu);
    expect(row.stopId).toBe("99-S1");
    expect(row.stopName).toBe("99-S1"); // id until the stops table provides names
    expect(row.predictedArrival).toBeNull();
    expect(row.arrivalDelay).toBe(120);
    expect(row.scheduledArrival).toBe("2026-06-25T22:05:00.000Z");
  });

  it("leaves the scheduled time null when arrival data is missing", () => {
    const tu: TripUpdateWire = {
      ts: "2026-06-25T00:00:00Z",
      tripId: "t1",
      routeId: "99",
      stopId: "99-S2",
      stopSequence: 2,
      arrivalDelay: null,
      arrivalTime: null,
      departureDelay: null,
      departureTime: null,
      scheduleRelationship: null,
    };
    expect(toStopAdherence(tu).scheduledArrival).toBeNull();
  });
});
