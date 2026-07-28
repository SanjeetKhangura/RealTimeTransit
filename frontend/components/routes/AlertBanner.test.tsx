import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlertBanner } from "./AlertBanner";
import type { ServiceAlert } from "@/types/api";

const alert: ServiceAlert = {
  alertId: "a1",
  severity: "warning",
  header: "Bus bunching detected",
  description: "Two buses are running close together.",
  startTime: "2026-06-09T12:00:00Z",
  endTime: null,
};

describe("AlertBanner", () => {
  it("renders the alert header and description", () => {
    render(<AlertBanner alerts={[alert]} />);
    expect(screen.getByText("Bus bunching detected")).toBeInTheDocument();
    expect(screen.getByText(/close together/i)).toBeInTheDocument();
  });

  it("renders nothing when there are no alerts", () => {
    const { container } = render(<AlertBanner alerts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the scope label when provided", () => {
    render(<AlertBanner alerts={[alert]} scopeLabel="Network-wide" />);
    expect(screen.getByText("Network-wide")).toBeInTheDocument();
  });

  it("omits the scope label by default", () => {
    render(<AlertBanner alerts={[alert]} />);
    expect(screen.queryByText("Network-wide")).not.toBeInTheDocument();
  });
});
