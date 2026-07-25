import type { StatusLevel } from "@/types/domain";

export interface StatusMeta {
  level: StatusLevel;
  label: string;
  // Tailwind v4 color token (see app/globals.css @theme).
  colorClass: string;
  symbol: string;
}

const STATUS_META: Record<StatusLevel, StatusMeta> = {
  clear: {
    level: "clear",
    label: "On time",
    colorClass: "text-status-clear",
    symbol: "●", // filled circle
  },
  warning: {
    level: "warning",
    label: "Minor delays",
    colorClass: "text-status-warning",
    symbol: "▲", // triangle
  },
  issue: {
    level: "issue",
    label: "Disrupted",
    colorClass: "text-status-issue",
    symbol: "■", // square
  },
};

export function statusMeta(level: StatusLevel): StatusMeta {
  return STATUS_META[level];
}

// Map an average schedule deviation (seconds) to a status level.
// Positive or negative both count as deviation.
export function statusFromDelay(avgDelaySeconds: number): StatusLevel {
  const minutes = avgDelaySeconds / 60;
  if (minutes < 3) return "clear";
  if (minutes < 8) return "warning";
  return "issue";
}
