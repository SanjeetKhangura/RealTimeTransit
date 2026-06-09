import { describe, it, expect } from "vitest";
import { formatRelative, formatTime } from "./format";

describe("formatTime", () => {
  it("formats a UTC instant in Vancouver time regardless of machine zone", () => {
    // 22:07 UTC in June is 15:07 PDT (UTC-7).
    expect(formatTime("2026-06-09T22:07:00Z")).toBe("3:07 PM");
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-06-09T12:00:00Z").getTime();

  it("handles seconds, minutes, and hours", () => {
    expect(formatRelative(new Date(now - 2_000), now)).toBe("just now");
    expect(formatRelative(new Date(now - 30_000), now)).toBe("30s ago");
    expect(formatRelative(new Date(now - 90_000), now)).toBe("1m ago");
    expect(formatRelative(new Date(now - 2 * 3_600_000), now)).toBe("2h ago");
  });
});
