import { Badge } from "@/components/ui/Badge";
import type { DataSource } from "@/types/domain";

export function RealtimeStatusIndicator({
  dataSource,
}: {
  dataSource: DataSource;
}) {
  if (dataSource === "realtime") {
    return <Badge tone="clear">Live</Badge>;
  }
  return <Badge tone="warning">Showing scheduled data (realtime unavailable)</Badge>;
}
