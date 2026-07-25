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

// Current time as seconds since midnight in agency time. Trip schedule bounds
// (startSeconds/endSeconds) use this same agency-local scale, so this is what
// we compare against when picking the next-departing trip.
export function agencySecondsNow(now: number = Date.now()): number {
  const d = new TZDate(new Date(now), AGENCY_TZ);
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
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

// Format a GTFS time (seconds since midnight) into a human-readable string. 
// The API returns times in agency-local seconds, which can exceed 24 hours for trips that run past midnight. 
// Show the day offset for those cases.
export function formatGtfsTime(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return null;

  const s = Math.floor(seconds);
  const dayOffset = Math.floor(s / 86400);
  const secondsInDay = s % 86400;
  const h24 = Math.floor(secondsInDay / 3600);
  const m = Math.floor((secondsInDay % 3600) / 60);
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;

  if (dayOffset > 0) 
    return `+${dayOffset}d ${h12}:${m.toString().padStart(2, "0")} ${ampm}`;

  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}
