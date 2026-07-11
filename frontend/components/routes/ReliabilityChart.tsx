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
import { formatHour } from "@/lib/utils/format";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ReliabilityPoint } from "@/types/api";

// Average schedule deviation by time bucket. Recharts is client-only.
export function ReliabilityChart({ points }: { points: ReliabilityPoint[] }) {
  if (points.length === 0) {
    return (
      <EmptyState
        title="No reliability data yet"
        hint="History builds up once ingest has been running for a while."
      />
    );
  }

  const data = points.map((p) => ({
    label: formatHour(p.bucket),
    delay: Math.round((p.avgDelaySeconds / 60) * 10) / 10,
  }));

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
          margin={{ top: 8, right: 12, bottom: 4, left: -16 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis dataKey="label" fontSize={11} interval={2} />
          <YAxis fontSize={11} width={40} tickFormatter={(v) => `${v}m`} />
          <Tooltip formatter={(value) => [`${value} min`, "Avg delay"]} />
          <Line
            type="monotone"
            dataKey="delay"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
