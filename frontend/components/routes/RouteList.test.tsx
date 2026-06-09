import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouteList } from "./RouteList";

// Hits the MSW mock handlers (see mocks/handlers.ts), exercising the real
// fetch + usePolling path end to end.
describe("RouteList", () => {
  it("renders routes returned by the API", async () => {
    render(<RouteList />);
    expect(
      await screen.findByText("UBC / Commercial-Broadway (B-Line)"),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Brentwood Station/)).toBeInTheDocument();
  });
});
