import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { statusMeta } from "@/lib/utils/status";
import type { RouteSummary } from "@/types/api";

export function RouteCard({
  route,
  saved,
  onToggleSave,
}: {
  route: RouteSummary;
  saved: boolean;
  onToggleSave: (routeId: string) => void;
}) {
  const meta = statusMeta(route.status);
  return (
    <Card className="flex items-center gap-3 p-3 transition hover:border-foreground/25">
      <button
        type="button"
        onClick={() => onToggleSave(route.routeId)}
        aria-pressed={saved}
        aria-label={
          saved ? `Unsave route ${route.shortName}` : `Save route ${route.shortName}`
        }
        className="text-lg leading-none text-status-warning"
      >
        {saved ? "★" : "☆"}
      </button>
      <Link
        href={`/routes/${route.routeId}`}
        className="flex flex-1 items-center gap-3"
      >
        <span className="inline-flex min-w-12 justify-center rounded-md bg-foreground/10 px-2 py-1 text-sm font-bold">
          {route.shortName}
        </span>
        <span className="flex-1 text-sm">{route.longName}</span>
        <span className="flex items-center gap-1 text-xs text-foreground/60">
          <StatusIcon level={route.status} />
          <span className="hidden sm:inline">{meta.label}</span>
        </span>
      </Link>
    </Card>
  );
}
