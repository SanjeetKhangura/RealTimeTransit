import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RouteCard } from "./RouteCard";
import type { RouteSummary } from "@/types/api";

const route: RouteSummary = {
  routeId: "99",
  shortName: "99",
  longName: "UBC / Commercial-Broadway",
  routeType: 3,
  status: "clear",
};

describe("RouteCard", () => {
  it("renders the route number and name", () => {
    render(<RouteCard route={route} saved={false} onToggleSave={() => {}} />);
    expect(screen.getByText("99")).toBeInTheDocument();
    expect(screen.getByText(/UBC/)).toBeInTheDocument();
  });

  it("calls onToggleSave with the route id when the star is clicked", () => {
    const onToggle = vi.fn();
    render(<RouteCard route={route} saved={false} onToggleSave={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /save route 99/i }));
    expect(onToggle).toHaveBeenCalledWith("99");
  });
});
