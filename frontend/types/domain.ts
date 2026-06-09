// UI-only domain types. Not generated from the API.

export type StatusLevel = "clear" | "warning" | "issue";

export type DataSource = "realtime" | "scheduled";

// GTFS-RT vehicle movement status (current_status in the schema).
export type VehicleStatus = "in_transit" | "stopped" | "incoming";
