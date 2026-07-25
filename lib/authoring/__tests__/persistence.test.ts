import { describe, expect, it } from "vitest";

import { VisualBrain } from "../types";
import { upgradePersistedBrain } from "../persistence";

const scaffold: VisualBrain = {
  goals: [],
  initial: "operate",
  states: [{ id: "operate", description: "" }],
  rules: [],
  ruleFolders: [],
  functions: [
    {
      id: "park-standard",
      action: "parkStandard",
      description: "",
      isBuiltIn: true,
    },
    {
      id: "release-vehicle",
      action: "releaseVehicle",
      description: "",
      isBuiltIn: true,
    },
  ],
  derived: [],
  memory: {},
};

describe("persisted brain upgrades", () => {
  it("merges new built-ins and removes only a redundant terminal wait", () => {
    const upgraded = upgradePersistedBrain(
      {
        ...scaffold,
        rules: [
          {
            id: "allocate",
            state: null,
            condition: {
              mode: "raw",
              expr: "hasWaitingVehicle",
            },
            functionId: "park-standard",
            setState: null,
            priority: 0,
            description: "",
          },
          {
            id: "legacy-idle",
            state: null,
            condition: {
              mode: "raw",
              expr: "always",
            },
            functionId: "hold",
            setState: null,
            priority: 0,
            description: "",
          },
        ],
        functions: [scaffold.functions[0]],
      },
      scaffold,
    );

    expect(upgraded.rules.map((rule) => rule.id)).toEqual(["allocate"]);
    expect(upgraded.functions.map((fn) => fn.id)).toEqual([
      "park-standard",
      "release-vehicle",
    ]);
  });
});
