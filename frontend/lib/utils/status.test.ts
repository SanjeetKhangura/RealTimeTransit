import { describe, it, expect } from "vitest";
import { statusFromDelay, statusMeta } from "./status";

describe("statusFromDelay", () => {
  it("treats small deviations as clear", () => {
    expect(statusFromDelay(0)).toBe("clear");
    expect(statusFromDelay(120)).toBe("clear"); // 2 min
  });

  it("treats moderate deviations as warning", () => {
    expect(statusFromDelay(300)).toBe("warning"); // 5 min
  });

  it("treats large deviations as issue, in either direction", () => {
    expect(statusFromDelay(600)).toBe("issue"); // 10 min late
    expect(statusFromDelay(-600)).toBe("issue"); // 10 min early
  });
});

describe("statusMeta", () => {
  it("returns a label and color class per level", () => {
    expect(statusMeta("clear").label).toBe("On time");
    expect(statusMeta("issue").colorClass).toContain("status-issue");
  });
});
