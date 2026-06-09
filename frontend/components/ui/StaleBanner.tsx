import { formatRelative } from "@/lib/utils/format";
import { Button } from "./Button";

export function StaleBanner({
  lastUpdated,
  onRetry,
}: {
  lastUpdated: Date | null;
  onRetry?: () => void;
}) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-lg border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-xs text-status-warning"
    >
      <span>
        Showing last known data
        {lastUpdated ? ` from ${formatRelative(lastUpdated)}` : ""}. Reconnecting...
      </span>
      {onRetry && (
        <Button
          variant="ghost"
          onClick={onRetry}
          className="h-6 border-status-warning/30 px-2 py-0 text-xs"
        >
          Retry
        </Button>
      )}
    </div>
  );
}
