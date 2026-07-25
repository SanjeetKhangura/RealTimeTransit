import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { statusMeta } from "@/lib/utils/status";
import type { RouteSummary } from "@/types/api";
import { getRouteColoring } from "@/lib/utils/coloring";

export function RouteCard({
  route,
  saved,
  onToggleSave,
}: {
  route: RouteSummary;
  saved: boolean;
  onToggleSave: (routeId: string) => void;
}) {
  const color = getRouteColoring(route);
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
        {color.isNamed ? (
          <span aria-hidden="true" className="h-2 w-16 shrink-0 rounded-full" style={{ backgroundColor: color.color }} />
        ) : color.displayName === 'West Coast Express' ?(
          <span className="inline-flex min-w-12 justify-center rounded-md bg-foreground/10 px-2 py-1 text-sm font-bold" style={{ backgroundColor: color.color}}>
          {route.shortName}
        </span>
        ) : (
          <span className={["inline-flex min-w-12 justify-center rounded-md bg-foreground/10 px-2 py-1 text-sm font-bold", color.displayName.includes('West Coast Express') ? 'style={{ backgroundColor: color.color}}' : ''].join(" ")}>
          {route.shortName}
        </span>
        )
        }
        
        <span className="flex flex-1 flex-col">
          <span className="text-sm">{route.longName}</span>
          {route.region && (
            <span className="text-xs text-foreground/40">{route.region}</span>
          )}
        </span>
        {route.status && (
          <span className="flex items-center gap-1 text-xs text-foreground/60">
            <StatusIcon level={route.status} />
            <span className="hidden sm:inline">
              {statusMeta(route.status).label}
            </span>
          </span>
        )}
      </Link>
    </Card>
  );
}
