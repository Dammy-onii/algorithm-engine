import { describe, expect, it } from "vitest";

import { simulationSpeedForWorld } from "./speed";

describe("simulation playback speed", () => {
  it("uses the finance and parking real-time profiles", () => {
    expect(simulationSpeedForWorld("finance")).toEqual({
      initial: 10,
      maximum: 20,
    });
    expect(simulationSpeedForWorld("parking")).toEqual({
      initial: 5,
      maximum: 15,
    });
  });

  it("keeps movement worlds at the readable default", () => {
    expect(simulationSpeedForWorld("maze")).toEqual({
      initial: 1,
      maximum: 3,
    });
  });
});
