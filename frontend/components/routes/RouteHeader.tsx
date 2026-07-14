import { RealtimeStatusIndicator } from "./RealtimeStatusIndicator";
import type { RouteDetail } from "@/types/api";
import type { DataSource } from "@/types/domain";

function Stars({ score }: { score: number }) {
  // Fill proportionally so a 4.5 reads as four and a half stars rather than
  // rounding up to a full five. The amber layer is clipped over the grey one.
  const pct = (Math.max(0, Math.min(5, score)) / 5) * 100;
  return (
    <span
      role="img"
      aria-label={`Health rating ${score} out of 5`}
      title={`Health rating ${score} of 5`}
      className="relative inline-block leading-none"
    >
      <span className="text-foreground/20">★★★★★</span>
      <span
        aria-hidden
        className="absolute inset-0 overflow-hidden text-status-warning"
        style={{ width: `${pct}%` }}
      >
        ★★★★★
      </span>
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
