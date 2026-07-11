import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

// The agency timezone. Times are shown in Vancouver time for every viewer,
// not the viewer's local zone, because this is a region-specific transit tool.
export const AGENCY_TZ = "America/Vancouver";

function toDate(value: string | Date): Date {
  return typeof value === "string" ? new Date(value) : value;
}

// e.g. "3:07 PM"
export function formatTime(value: string | Date): string {
  return format(new TZDate(toDate(value), AGENCY_TZ), "h:mm a");
}

// e.g. "Jun 9, 3:07 PM"
export function formatDateTime(value: string | Date): string {
  return format(new TZDate(toDate(value), AGENCY_TZ), "MMM d, h:mm a");
}

// e.g. "3PM", for compact chart axis labels
export function formatHour(value: string | Date): string {
  return format(new TZDate(toDate(value), AGENCY_TZ), "ha");
}

// Short "x ago" string for freshness indicators.
export function formatRelative(value: string | Date, now: number = Date.now()): string {
  const seconds = Math.round((now - toDate(value).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
