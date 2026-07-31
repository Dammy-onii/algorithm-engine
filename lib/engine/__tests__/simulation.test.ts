import { describe, expect, it } from "vitest";

import { Simulation, BrainSource, WorldSource } from "../simulation";
import { evaluateCondition } from "../decision/condition";
import { compileFunctionPlans } from "../runtime/loader";
import { EntitiesData, WorldData } from "../types";

import maze from "@/content/worlds/maze.json";
import mazeRooms from "@/content/worlds/maze-rooms.json";
import branchingMaze from "@/content/worlds/maze-proper.json";
import entities from "@/content/worlds/entities.json";

import goals from "@/content/brains/default/goals.json";
import states from "@/content/brains/default/states.json";
import rules from "@/content/brains/default/rules.json";
import functions from "@/content/brains/default/functions.json";
import memory from "@/content/brains/default/memory.json";

import nGoals from "@/content/brains/naive/goals.json";
import nStates from "@/content/brains/naive/states.json";
import nRules from "@/content/brains/naive/rules.json";
import nFunctions from "@/content/brains/naive/functions.json";
import nMemory from "@/content/brains/naive/memory.json";

import dGoals from "@/content/brains/dash/goals.json";
import dStates from "@/content/brains/dash/states.json";
import dRules from "@/content/brains/dash/rules.json";
import dFunctions from "@/content/brains/dash/functions.json";
import dMemory from "@/content/brains/dash/memory.json";

const wallFollower: BrainSource = {
  goals,
  states,
  rules,
  functions,
  memory,
} as BrainSource;

const naive: BrainSource = {
  goals: nGoals,
  states: nStates,
  rules: nRules,
  functions: nFunctions,
  memory: nMemory,
} as BrainSource;

const dash: BrainSource = {
  goals: dGoals,
  states: dStates,
  rules: dRules,
  functions: dFunctions,
  memory: dMemory,
} as BrainSource;

function run(world: WorldData, brain: BrainSource) {
  const source: WorldSource = {
    world,
    entities: entities as EntitiesData,
  };
  const sim = new Simulation(source, brain);
  let guard = 0;
  while (!sim.isDone && guard < 5000) {
    sim.tick();
    guard++;
  }
  return sim;
}

describe("condition evaluator", () => {
  const ctx = {
    wallAhead: true,
    goalVisible: false,
    energy: 3,
    visitedCount: 10,
    always: true,
  };
  it("handles boolean logic and comparisons", () => {
    expect(evaluateCondition("wallAhead && !goalVisible", ctx)).toBe(true);
    expect(evaluateCondition("goalVisible || wallAhead", ctx)).toBe(true);
    expect(evaluateCondition("energy < 5", ctx)).toBe(true);
    expect(evaluateCondition("energy >= 5", ctx)).toBe(false);
    expect(evaluateCondition("(wallAhead && goalVisible) || always", ctx)).toBe(true);
    expect(evaluateCondition("", ctx)).toBe(true);
  });
  it("rejects unknown identifiers", () => {
    expect(() => evaluateCondition("banana", ctx)).toThrow();
  });
});

describe("simulation engine", () => {
  it("wall-follower brain reaches the goal in the snake maze", () => {
    const sim = run(maze as WorldData, wallFollower);
    expect(sim.status).toBe("reached");
    expect(sim.world.atGoal()).toBe(true);
  });

  it("same engine + same brain solves a DIFFERENT maze with no code change", () => {
    const sim = run(mazeRooms as WorldData, wallFollower);
    expect(sim.status).toBe("reached");
  });

  it("solves the Branching Maze with an ordered right-wall flow", () => {
    const orderedWallFollower: BrainSource = {
      goals: { goals: [{ id: "reach", priority: 1 }] },
      states: { initial: "explore", states: [{ id: "explore" }] },
      functions: {
        functions: [
          { id: "step", action: "moveForward" },
          { id: "right", action: "turnRight" },
          { id: "left", action: "turnLeft" },
          { id: "hold", action: "wait" },
          { id: "right-and-step", steps: ["right", "step"] },
          { id: "left-and-step", steps: ["left", "step"] },
          { id: "turn-around-and-step", steps: ["right", "right", "step"] },
        ],
      },
      rules: {
        rules: [
          { id: "settle", when: "atGoal", do: "hold" },
          { id: "take-right", when: "!wallRight", do: "right-and-step" },
          { id: "go-forward", when: "!wallAhead", do: "step" },
          { id: "take-left", when: "!wallLeft", do: "left-and-step" },
          { id: "dead-end", when: "always", do: "turn-around-and-step" },
        ],
      },
      memory: {},
    };

    const sim = run(branchingMaze as WorldData, orderedWallFollower);
    expect(sim.status).toBe("reached");
    expect(sim.world.atGoal()).toBe(true);
    expect(sim.world.tick).toBeLessThanOrEqual(80);
  });

  it("rejects a domain action when the active world module does not expose it", () => {
    const invalid = structuredClone(wallFollower);
    invalid.functions.functions.push({ id: "pick-up", action: "pickUp" });
    invalid.rules.rules[0].do = "pick-up";
    const source: WorldSource = { world: maze as WorldData, entities: entities as EntitiesData };

    expect(() => new Simulation(source, invalid)).toThrow(/unavailable in world 'maze'/);
  });

  it("rejects a condition flag from a different world before the first tick", () => {
    const invalid = structuredClone(wallFollower);
    invalid.rules.rules[0].when = "onlineA";
    const source: WorldSource = {
      world: maze as WorldData,
      entities: entities as EntitiesData,
    };

    expect(() => new Simulation(source, invalid)).toThrow(
      /onlineA.*unavailable in world 'maze'/,
    );
  });

  it("swapping to the naive brain changes the outcome (proves data-driven brains)", () => {
    const sim = run(maze as WorldData, naive);
    // The naive brain is expected to loop/stall rather than solve the snake.
    expect(sim.status).not.toBe("reached");
  });

  it("multi-step bricks compile to flat action plans (and detect cycles)", () => {
    const plans = compileFunctionPlans([
      { id: "step", action: "moveForward" },
      { id: "pivot-right", action: "turnRight" },
      { id: "about-face", steps: ["pivot-right", "pivot-right"] },
      { id: "dash", steps: ["step", "step", "step"] },
    ]);
    expect(plans["about-face"]).toEqual(["turnRight", "turnRight"]);
    expect(plans["dash"]).toEqual(["moveForward", "moveForward", "moveForward"]);

    expect(() =>
      compileFunctionPlans([{ id: "loop", steps: ["loop"] }]),
    ).toThrow(/cycle/);
    expect(() =>
      compileFunctionPlans([{ id: "bad", steps: ["nope"] }]),
    ).toThrow(/unknown function/);
  });

  it("dash brain (multi-step) reaches the goal and runs a brick across ticks", () => {
    const source: WorldSource = { world: maze as WorldData, entities: entities as EntitiesData };
    const sim = new Simulation(source, dash);

    // The first decision on a clear corridor is `dash` — a 3-action brick, so
    // the same function should run for three consecutive ticks with rising step.
    const s1 = sim.tick();
    const s2 = sim.tick();
    const s3 = sim.tick();
    expect([s1, s2, s3].map((s) => s.trace.functionId)).toEqual([
      "dash",
      "dash",
      "dash",
    ]);
    expect(s1.trace.step).toEqual({ index: 0, total: 3 });
    expect(s3.trace.step).toEqual({ index: 2, total: 3 });

    let guard = 0;
    while (!sim.isDone && guard < 5000) {
      sim.tick();
      guard++;
    }
    expect(sim.status).toBe("reached");
  });

  it("produces a full decision trace each tick", () => {
    const source: WorldSource = { world: maze as WorldData, entities: entities as EntitiesData };
    const sim = new Simulation(source, wallFollower);
    const step = sim.tick();
    expect(step.trace.stateId).toBeTruthy();
    expect(step.trace.action.type).toBeTruthy();
    expect(step.observation.position).toBeDefined();
  });
});
