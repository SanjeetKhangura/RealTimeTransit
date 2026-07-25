import type { BunchingPair } from "@/types/api";

interface BunchingBannerProps {
  bunchingPairs: BunchingPair[];
}

export default function BunchingBanner({ bunchingPairs }: BunchingBannerProps) {
  if (bunchingPairs.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <h2 className="font-semibold">Possible Bunching Detected</h2>

        <p className="mt-1 text-sm text-foreground/60">
            {bunchingPairs.length} vehicle pair{bunchingPairs.length > 1 ? "s" : ""} may be bunching on the route{bunchingPairs.length > 1 ? "s" : ""} below.
        </p>

        <div className="mt-3 space-y-2">
            {bunchingPairs.map((pair) => (
                <div key={`${pair.leadingVehicleId}-${pair.followingVehicleId}`} className="text-sm">
                    <span className={`font-medium capitalize ${pair.severity === "alert" ? "text-red-600" : pair.severity === "warning" ? "text-yellow-600" : "text-green-600"}`}>
                        {pair.severity}
                    </span>
                    {": "}vehicles {pair.leadingVehicleId} and {pair.followingVehicleId} are approximately {Math.round(pair.distanceAlongRoute)} meters apart.
                </div>
            ))}
        </div>
    </section>
  );
}