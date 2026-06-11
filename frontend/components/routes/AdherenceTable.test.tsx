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
    scheduledArrival: "2026-06-09T22:07:00Z", // 3:07 PM in Vancouver
    predictedArrival: null,
    arrivalDelay: 0,
  },
];

describe("AdherenceTable", () => {
  it("renders the scheduled time and N/A for a null predicted value", () => {
    render(<AdherenceTable stops={stops} />);
    expect(screen.getByText("Terminal")).toBeInTheDocument();
    expect(screen.getByText("3:07 PM")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("shows an empty state when there are no stops", () => {
    render(<AdherenceTable stops={[]} />);
    expect(screen.getByText(/no stop data/i)).toBeInTheDocument();
  });
});
