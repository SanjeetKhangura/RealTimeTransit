import type { Vehicle } from "@/types/api";

// Accessible text-equivalent of the map. Screen readers get the same vehicle
// data the map shows visually (the map itself is aria-hidden).
const STATUS_LABEL: Record<string, string> = {
  in_transit: "in transit",
  stopped: "stopped",
  incoming: "arriving",
};

export function RouteMapList({ vehicles }: { vehicles: Vehicle[] }) {
  if (vehicles.length === 0) {
    return (
      <p className="text-sm text-foreground/60">
        No vehicles are currently reporting on this route.
      </p>
    );
  }
  return (
    <ul className="space-y-1 text-sm">
      {vehicles.map((v) => (
        <li key={v.vehicleId}>
          Bus {v.vehicleId} is {STATUS_LABEL[v.status] ?? v.status}
          {v.nextStop ? `, next stop ${v.nextStop}` : ""}.
        </li>
      ))}
    </ul>
  );
}
