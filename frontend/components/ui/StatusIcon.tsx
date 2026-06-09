import { cn } from "@/lib/utils/cn";
import { statusMeta } from "@/lib/utils/status";
import type { StatusLevel } from "@/types/domain";

export function StatusIcon({
  level,
  className,
}: {
  level: StatusLevel;
  className?: string;
}) {
  const meta = statusMeta(level);
  return (
    <span
      role="img"
      aria-label={meta.label}
      title={meta.label}
      className={cn("leading-none", meta.colorClass, className)}
    >
      {meta.symbol}
    </span>
  );
}
