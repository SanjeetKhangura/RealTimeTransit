"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { Vehicle } from "@/types/api";

// Marker color by vehicle status.
const STATUS_COLOR: Record<string, string> = {
  in_transit: "#16a34a",
  stopped: "#ca8a04",
  incoming: "#2563eb",
};

const VANCOUVER: [number, number] = [49.2606, -123.114];

// Default export so it can be loaded with next/dynamic({ ssr: false }).
// Leaflet touches `window`, so it must never render on the server.
export default function RouteMap({ vehicles }: { vehicles: Vehicle[] }) {
  const center: [number, number] =
    vehicles.length > 0 ? [vehicles[0].lat, vehicles[0].lon] : VANCOUVER;

  return (
    <div
      aria-hidden
      className="h-80 w-full overflow-hidden rounded-xl border border-foreground/10"
    >
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
