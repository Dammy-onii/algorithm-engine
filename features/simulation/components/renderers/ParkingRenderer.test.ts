import { describe, expect, it } from "vitest";

import {
  parkingBayWaypoint,
  parkingMotionDuration,
} from "./ParkingRenderer";

describe("Parking real-time motion", () => {
  it("finishes each route before the next transport tick", () => {
    expect(parkingMotionDuration(1)).toBe(820);
    expect(parkingMotionDuration(2)).toBe(410);
    expect(parkingMotionDuration(3)).toBe(273);
  });

  it("derives the destination from the actual row and authored slot order", () => {
    expect(parkingBayWaypoint({ row: "north", order: 1 }, 4)).toEqual({
      x: 37.5,
      y: 23,
      rotation: "0deg",
    });
    expect(parkingBayWaypoint({ row: "south", order: 3 }, 4)).toEqual({
      x: 87.5,
      y: 83,
      rotation: "180deg",
    });
  });
});
