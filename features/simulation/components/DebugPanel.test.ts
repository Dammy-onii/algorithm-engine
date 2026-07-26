import { describe, expect, it } from "vitest";

import { formatDebugNumber } from "./DebugPanel";

describe("DebugPanel value formatting", () => {
  it("limits decimal metrics to two readable decimal places", () => {
    expect(formatDebugNumber(6863.700000000001)).toBe("6,863.70");
    expect(formatDebugNumber(12)).toBe("12.00");
  });

  it("formats native percentages and fractional ratios correctly", () => {
    expect(formatDebugNumber(97.456, "percent")).toBe("97.46%");
    expect(formatDebugNumber(0.87456, "percentFraction")).toBe("87.46%");
  });

  it("formats Finance money as Nigerian naira", () => {
    expect(formatDebugNumber(1250.5, "currency")).toBe("₦1,250.50");
  });
});
