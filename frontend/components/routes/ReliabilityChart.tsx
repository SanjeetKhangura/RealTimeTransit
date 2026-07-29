"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatHour, formatDateTime } from "@/lib/utils/format";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ReliabilityPoint } from "@/types/api";

// Read the accent color from the CSS token so the line matches the rest of the
// UI. Recharts draws client-side; the fallback equals --accent in globals.css.
function accentColor(): string {
  if (typeof window === "undefined") return "#2563eb";
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();
  return v || "#2563eb";
}

// Average schedule deviation by time bucket. Recharts is client-only.
export function ReliabilityChart({ points }: { points: ReliabilityPoint[] }) {
  const lineColor = accentColor();

  if (points.length === 0) {
    return (
      <EmptyState
        title="No reliability data yet"
        hint="History builds up once ingest has been running for a while."
      />
    );
  }

  const data = points.map((p) => ({
    label: new Date(p.bucket).getTime(),
    delay: Math.round((p.avgDelaySeconds / 60) * 10) / 10,
  }))
  .filter((p) => Number.isFinite(p.label)) // Filter out invalid timestamps
  .sort((a, b) => a.label - b.label); // Sort by timestamp

  return (
    <div
      className="h-64 w-full"
      role="img"
      aria-label="Line chart of average bus delay in minutes over time"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          accessibilityLayer
          data={data}
          margin={{ top: 8, right: 16, bottom: 8, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis dataKey="label" type="number" fontSize={11} scale="time" domain={['dataMin', 'dataMax']} tickCount={7} minTickGap={50} tickFormatter={(label) => formatDateTime(new Date(label))} />
          <YAxis fontSize={11} width={58} tickFormatter={(v) => `${v}m`} />
          <Tooltip labelFormatter={(label) => formatDateTime(new Date(label))} formatter={(value) => [`${value} min`, "Avg delay"]} 
              // dynamically style the tooltip, label and item to match the theme
              contentStyle={{backgroundColor: "var(--background)", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "8px", color: "var(--foreground)"}} 
              labelStyle={{color: "var(--foreground)"}} 
              itemStyle={{color: "var(--foreground)"}} 
              />
          <Line
            type="monotone"
            dataKey="delay"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
