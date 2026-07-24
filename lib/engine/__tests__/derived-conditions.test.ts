/**
 * Derived conditions — composable perception.
 *
 * These prove the engine can evaluate user-named conditions built from existing
 * observation flags, that nesting works, and that every authoring mistake is
 * caught at load time (on Apply) rather than mid-run.
 */

import { describe, expect, it } from "vitest";

import {
  evaluateCondition,
  referencedIdentifiers,
  assertParsable,
  BUILTIN_FLAGS,
  EvalContext,
} from "../decision/condition";
import { compileDerivedConditions } from "../runtime/loader";
import { Simulation, BrainSource } from "../simulation";
import { EntitiesData, WorldData } from "../types";

import maze from "../../../world/maze.json";
import entities from "../../../world/entities.json";

describe("evaluateCondition with derived conditions", () => {
  const ctx: EvalContext = {
    wallAhead: true,
    wallLeft: true,
    wallRight: true,
    energy: 10,
    always: true,
    never: false,
  };

  it("resolves a derived condition from built-in flags", () => {
    const derived = { deadEnd: "wallAhead && wallLeft && wallRight" };
    expect(evaluateCondition("deadEnd", ctx, derived)).toBe(true);
  });

  it("resolves nested derived conditions", () => {
    const derived = {
      boxedIn: "wallAhead && wallLeft && wallRight",
      trapped: "boxedIn && energy < 20",
    };
    expect(evaluateCondition("trapped", ctx, derived)).toBe(true);
    expect(evaluateCondition("trapped && !always", ctx, derived)).toBe(false);
  });

  it("throws on an unknown identifier", () => {
    expect(() => evaluateCondition("enemyNear", ctx, {})).toThrow(/Unknown identifier/);
  });

  it("throws on a circular derived definition at evaluation", () => {
    const derived = { a: "b", b: "a" };
    expect(() => evaluateCondition("a", ctx, derived)).toThrow(/Circular/);
  });
});

describe("referencedIdentifiers / assertParsable", () => {
  it("lists referenced identifiers, excluding literals", () => {
    expect(referencedIdentifiers("wallAhead && !goalVisible").sort()).toEqual([
      "goalVisible",
      "wallAhead",
    ]);
    expect(referencedIdentifiers("energy < 5 || true")).toEqual(["energy"]);
  });

  it("accepts valid expressions and rejects malformed ones", () => {
    expect(() => assertParsable("a && (b || c)")).not.toThrow();
    expect(() => assertParsable("a &&")).toThrow();
    expect(() => assertParsable("(a || b")).toThrow();
  });
});

describe("compileDerivedConditions (load-time validation)", () => {
  it("compiles a valid set to an id → expr map", () => {
    const map = compileDerivedConditions([
      { id: "deadEnd", expr: "wallAhead && wallLeft && wallRight" },
      { id: "trapped", expr: "deadEnd && energy < 10" },
    ]);
    expect(map.deadEnd).toBe("wallAhead && wallLeft && wallRight");
    expect(map.trapped).toBe("deadEnd && energy < 10");
  });

  it("rejects shadowing a built-in flag", () => {
    for (const flag of BUILTIN_FLAGS.slice(0, 3)) {
      expect(() =>
        compileDerivedConditions([{ id: flag, expr: "true" }]),
      ).toThrow(/shadows a built-in/);
    }
  });

  it("rejects duplicates, empty ids, invalid names and empty expressions", () => {
    expect(() =>
      compileDerivedConditions([
        { id: "x", expr: "wallAhead" },
        { id: "x", expr: "wallLeft" },
      ]),
    ).toThrow(/duplicate/);
    expect(() => compileDerivedConditions([{ id: "", expr: "wallAhead" }])).toThrow(/empty id/);
    expect(() => compileDerivedConditions([{ id: "9bad", expr: "wallAhead" }])).toThrow(/valid name/);
    expect(() => compileDerivedConditions([{ id: "x", expr: "  " }])).toThrow(/empty expression/);
  });

  it("rejects unknown identifiers and cycles", () => {
    expect(() =>
      compileDerivedConditions([{ id: "x", expr: "mysterySensor" }]),
    ).toThrow(/unknown identifier/);
    expect(() =>
      compileDerivedConditions([
        { id: "a", expr: "b" },
        { id: "b", expr: "a" },
      ]),
    ).toThrow(/circular/);
  });
});

describe("derived conditions drive a real run", () => {
  it("a brain using a derived condition solves the maze", () => {
    const brain: BrainSource = {
      goals: { goals: [] },
      states: { initial: "go", states: [{ id: "go" }] },
      conditions: {
        conditions: [
          { id: "clearAhead", expr: "!wallAhead" },
          { id: "openLeft", expr: "!wallLeft" },
          { id: "openRight", expr: "!wallRight" },
          { id: "onGoal", expr: "atGoal" },
        ],
      },
      functions: {
        functions: [
          { id: "step", action: "moveForward" },
          { id: "pivot-left", action: "turnLeft" },
          { id: "pivot-right", action: "turnRight" },
          { id: "hold", action: "wait" },
        ],
      },
      // Corridor follower expressed entirely through derived conditions:
      // prefer straight, else hug the left wall, else turn right, else about-face.
      rules: {
        rules: [
          { id: "settle", when: "onGoal", do: "hold", priority: 100 },
          { id: "advance", when: "clearAhead", do: "step", priority: 60 },
          { id: "hug-left", when: "openLeft", do: "pivot-left", priority: 50 },
          { id: "turn-right", when: "openRight", do: "pivot-right", priority: 40 },
          { id: "dead-end", when: "always", do: "pivot-right", priority: 10 },
        ],
      },
      memory: {},
    };

    const sim = new Simulation(
      { world: maze as WorldData, entities: entities as EntitiesData },
      brain,
    );
    let guard = 0;
    while (!sim.isDone && guard < 5000) {
      sim.tick();
      guard++;
    }
    expect(sim.status).toBe("reached");
  });

  it("rejects a brain whose rule references an unknown condition", () => {
    const brain: BrainSource = {
      goals: { goals: [] },
      states: { initial: "go", states: [{ id: "go" }] },
      functions: { functions: [{ id: "step", action: "moveForward" }] },
      rules: { rules: [{ id: "r", when: "phantomFlag", do: "step" }] },
      memory: {},
    };
    expect(
      () =>
        new Simulation(
          { world: maze as WorldData, entities: entities as EntitiesData },
          brain,
        ),
    ).toThrow(/unknown condition 'phantomFlag'/);
  });
});
