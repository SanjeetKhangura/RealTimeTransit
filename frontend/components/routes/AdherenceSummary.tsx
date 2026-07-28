import type { StopAdherence } from "@/types/api";

interface AdherenceSummaryProps {
  stops: StopAdherence[];
}

export function AdherenceSummary({ stops }: AdherenceSummaryProps) {
    const samples = stops.filter((s) => s.arrivalDelay !== null);

    if (samples.length === 0) {
        return <p className="text-sm text-foreground/50">No adherence data available.</p>;
    }

    // Calculate the percentage of on-time arrivals (within 3 minutes of scheduled time)
    const onTimeCount = samples.filter((s) => (Math.abs(s.arrivalDelay ?? 0)) < 180).length;
    // Calculate the percentage of minor delays (between 3 and 8 minutes late/early)
    const minorDelayCount = samples.filter((s) => Math.abs(s.arrivalDelay ?? 0) >= 180 && Math.abs(s.arrivalDelay ?? 0) < 480).length;
    // Calculate the percentage of major delays (8 minutes or more late/early)
    const majorDelayCount = samples.filter((s) => Math.abs(s.arrivalDelay ?? 0) >= 480).length;
    // Calculate the average delay in seconds by summing the arrival delays and dividing by the number of samples
    const avgDelaySeconds = samples.reduce((sum, s) => sum + (s.arrivalDelay ?? 0), 0) / samples.length;
    // Percentage function to calculate the percentage of a count relative to the total number of samples
    const percentage = (count: number) => Math.round((count / samples.length) * 100);
    
    const avgDelayLabel = (() => {
        if(avgDelaySeconds >= 60)
            return `${Math.round(avgDelaySeconds / 60)} min`;

        if(avgDelaySeconds <= -60)
            return `${Math.round(avgDelaySeconds / 60)} min`;

        return "On time";
    })();

    // Create metrics array to display the adherence summary
    const metrics = [
        { label: "On Time", value: `${percentage(onTimeCount)}%` },
        { label: "Minor Delays", value: `${percentage(minorDelayCount)}%` },
        { label: "Major Delays", value: `${percentage(majorDelayCount)}%` },
        { label: "Average Delay", value: avgDelayLabel },
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-foreground/10 p-4">
                    <p className="text-sm text-foreground/50">{metric.label}</p>
                    <p className="mt-1 text-xl font-semibold">{metric.value}</p>
                </div>
            ))}
        </div>
    );
}