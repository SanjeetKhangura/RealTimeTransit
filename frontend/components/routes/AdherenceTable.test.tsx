import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdherenceTable } from "./AdherenceTable";
import type { StopAdherence } from "@/types/api";

const stops: StopAdherence[] = [
  {
    stopId: "s1",
    stopName: "Terminal",
    lat: 49.26,
    lon: -123.11,
    scheduledArrival: "3:07 PM", // changed from UTC time to local time since it's already been converted in the adapter
    predictedArrival: null,
    arrivalDelay: 0,
  },
];

describe("AdherenceTable", () => {
  it("renders the scheduled time and N/A for a null predicted value", () => {
    render(<AdherenceTable stops={stops} />);
    expect(screen.getByText("Terminal")).toBeInTheDocument();
    expect(screen.getByText("3:07 PM")).toBeInTheDocument();
    expect(screen.getByText("No prediction available")).toBeInTheDocument();
  });

  it("shows an empty state when there are no stops", () => {
    render(<AdherenceTable stops={[]} />);
    expect(screen.getByText(/no stop data/i)).toBeInTheDocument();
  });
});
