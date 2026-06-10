import { RouteList } from "@/components/routes/RouteList";

export default function Home() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Routes</h1>
        <p className="text-sm text-foreground/60">
          Search a route to see live status and buses.
        </p>
      </div>
      <RouteList />
    </div>
  );
}
