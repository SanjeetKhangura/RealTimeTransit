"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { StopAdherence, Vehicle } from "@/types/api";

const STATUS_COLOR: Record<string, string> = {
  in_transit: "#16a34a",
  stopped: "#ca8a04",
  incoming: "#2563eb",
};

const VANCOUVER: [number, number] = [49.2606, -123.114];

// The map is decorative (aria-hidden) with a text-equivalent list elsewhere.
// Keep the zoom buttons usable by mouse but out of the keyboard tab order.
function NonFocusableZoom() {
  const map = useMap();
  useEffect(() => {
    map
      .getContainer()
      .querySelectorAll<HTMLElement>(".leaflet-control-zoom a")
      .forEach((el) => el.setAttribute("tabindex", "-1"));
  }, [map]);
  return null;
}

// Frame the route once it loads. Done once so it doesn't fight the user panning
// on each poll; the page remounts (by route id) when the route changes.
function FitBounds({ shape }: { shape: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || shape.length === 0) return;
    map.fitBounds(shape, { padding: [24, 24] });
    fitted.current = true;
  }, [map, shape]);
  return null;
}

// Default export so it can be loaded with next/dynamic({ ssr: false }).
export default function RouteMap({
  vehicles,
  shape = [],
  stops = [],
}: {
  vehicles: Vehicle[];
  shape?: [number, number][];
  stops?: StopAdherence[];
}) {
  const center: [number, number] =
    shape.length > 0
      ? shape[Math.floor(shape.length / 2)]
      : vehicles.length > 0
        ? [vehicles[0].lat, vehicles[0].lon]
        : VANCOUVER;

  return (
    <div
      aria-hidden
      className="h-80 w-full overflow-hidden rounded-xl border border-foreground/10"
    >
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        keyboard={false}
        className="h-full w-full"
      >
        <NonFocusableZoom />
        {shape.length > 1 && <FitBounds shape={shape} />}
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {shape.length > 1 && (
          <Polyline
            positions={shape}
            pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.6 }}
          />
        )}
        {stops.map((s) =>
          s.lat === undefined || s.lon === undefined ? null : (
            <CircleMarker
              key={s.stopId}
              center={[s.lat, s.lon]}
              radius={4}
              pathOptions={{
                color: "#64748b",
                fillColor: "#ffffff",
                fillOpacity: 1,
                weight: 2,
              }}
            >
              <Popup>{s.stopName}</Popup>
            </CircleMarker>
          ),
        )}
        {vehicles.map((v) => (
          <CircleMarker
            key={v.vehicleId}
            center={[v.lat, v.lon]}
            radius={8}
            pathOptions={{
              color: STATUS_COLOR[v.status] ?? "#16a34a",
              fillOpacity: 0.8,
            }}
          >
            <Popup>
              Bus {v.vehicleId}
              {v.nextStop ? ` to ${v.nextStop}` : ""}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
