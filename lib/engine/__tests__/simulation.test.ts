import { describe, expect, it } from "vitest";

import { Simulation, BrainSource, WorldSource } from "../simulation";
import { evaluateCondition } from "../decision/condition";
import { compileFunctionPlans } from "../runtime/loader";
import { EntitiesData, WorldData } from "../types";

import maze from "../../../world/maze.json";
import mazeRooms from "../../../world/maze-rooms.json";
import entities from "../../../world/entities.json";

import goals from "../../../brain/goals.json";
import states from "../../../brain/states.json";
import rules from "../../../brain/rules.json";
import functions from "../../../brain/functions.json";
import memory from "../../../brain/memory.json";

import nGoals from "../../../brain-naive/goals.json";
import nStates from "../../../brain-naive/states.json";
import nRules from "../../../brain-naive/rules.json";
import nFunctions from "../../../brain-naive/functions.json";
import nMemory from "../../../brain-naive/memory.json";

import dGoals from "../../../brain-dash/goals.json";
import dStates from "../../../brain-dash/states.json";
import dRules from "../../../brain-dash/rules.json";
import dFunctions from "../../../brain-dash/functions.json";
import dMemory from "../../../brain-dash/memory.json";

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
