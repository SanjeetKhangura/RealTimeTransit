import { formatTime } from "@/lib/utils/format";
import { statusFromDelay, statusMeta } from "@/lib/utils/status";
import { EmptyState } from "@/components/ui/EmptyState";
import type { StopAdherence } from "@/types/api";

function delayLabel(seconds: number | null): string {
  if (seconds === null) return "";
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 1) return "on time";
  return minutes > 0 ? `${minutes} min late` : `${Math.abs(minutes)} min early`;
}

// Scheduled times come from the API; the predicted column is null-safe and
// renders "N/A" until ML serves predictions (it populates with no code change).
export function AdherenceTable({ stops }: { stops: StopAdherence[] }) {
  if (stops.length === 0) {
    return (
      <EmptyState
        title="No stop data"
        hint="Schedule data is not available for this route yet."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Scheduled and predicted arrival times by stop
        </caption>
        <thead>
          <tr className="border-b border-foreground/10 text-left text-foreground/60">
            <th scope="col" className="py-2 pr-3 font-medium">Stop</th>
            <th scope="col" className="py-2 pr-3 font-medium">Scheduled</th>
            <th scope="col" className="py-2 pr-3 font-medium">Predicted</th>
            <th scope="col" className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {stops.map((s) => (
            <tr key={s.stopId} className="border-b border-foreground/5">
              <td className="py-2 pr-3">{s.stopName}</td>
              <td className="py-2 pr-3">
                {s.scheduledArrival ?? "N/A"}
              </td>
              <td className="py-2 pr-3 text-foreground/60">
                {s.predictedArrival ? formatTime(s.predictedArrival) : "No prediction available"}
              </td>
              <td className="py-2">
                {s.arrivalDelay === null ? (
                  <span className="text-foreground/40">&mdash;</span>
                ) : (
                  <span className={statusMeta(statusFromDelay(s.arrivalDelay)).colorClass}>
                    {delayLabel(s.arrivalDelay)}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
