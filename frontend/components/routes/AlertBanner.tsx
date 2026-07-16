import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/Badge";
import type { ServiceAlert } from "@/types/api";
import type { AlertSeverity } from "@/types/domain";

const TONE: Record<AlertSeverity, "neutral" | "warning" | "issue"> = {
  info: "neutral",
  warning: "warning",
  critical: "issue",
};

const BOX: Record<AlertSeverity, string> = {
  info: "border-foreground/15",
  warning: "border-status-warning/30 bg-status-warning/5",
  critical: "border-status-issue/30 bg-status-issue/5",
};

const LABEL: Record<AlertSeverity, string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

export function AlertBanner({
  alerts,
  scopeLabel,
}: {
  alerts: ServiceAlert[];
  // When set (e.g. "Network-wide"), tags each alert so agency-wide notices are
  // distinguishable from the route's own alerts.
  scopeLabel?: string;
}) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a.alertId}
          role={a.severity === "critical" ? "alert" : "status"}
          className={cn("rounded-lg border p-3", BOX[a.severity])}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={TONE[a.severity]}>{LABEL[a.severity]}</Badge>
            {scopeLabel && <Badge tone="neutral">{scopeLabel}</Badge>}
            <span className="text-sm font-medium">{a.header}</span>
          </div>
          <p className="mt-1 text-xs text-foreground/70">{a.description}</p>
        </div>
      ))}
    </div>
  );
}
