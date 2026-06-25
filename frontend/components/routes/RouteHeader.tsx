import { RealtimeStatusIndicator } from "./RealtimeStatusIndicator";
import type { RouteDetail } from "@/types/api";
import type { DataSource } from "@/types/domain";

function Stars({ score }: { score: number }) {
  const full = Math.max(0, Math.min(5, Math.round(score)));
  return (
    <span
      aria-label={`Health rating ${score} out of 5`}
      title={`Health rating ${score} of 5`}
      className="text-status-warning"
    >
      {"★".repeat(full)}
      <span className="text-foreground/20">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export function RouteHeader({
  route,
  dataSource,
}: {
  route: RouteDetail;
  dataSource: DataSource;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="inline-flex min-w-12 justify-center rounded-md bg-foreground/10 px-2 py-1 text-lg font-bold">
          {route.shortName}
        </span>
        <h1 className="text-xl font-semibold">{route.longName}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {route.healthScore !== undefined && <Stars score={route.healthScore} />}
        <RealtimeStatusIndicator dataSource={dataSource} />
      </div>
    </div>
  );
}
