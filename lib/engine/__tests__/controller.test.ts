import { describe, expect, it } from "vitest";

import maze from "@/content/worlds/maze-proper.json";
import entities from "@/content/worlds/entities.json";
import { MAZE_CONTROLLER_TEMPLATE, compileController } from "@/lib/authoring/controllerCompiler";
import { Simulation, type BrainSource, type WorldSource } from "../simulation";
import type { EntitiesData, WorldData } from "../types";

const emptyBrain: BrainSource = {
  goals: { goals: [{ id: "reach", priority: 1 }] },
  states: { initial: "controller", states: [{ id: "controller" }] },
  rules: { rules: [] },
  functions: { functions: [{ id: "hold", action: "wait" }] },
  memory: {},
};

describe("object-oriented controller mode", () => {
  it("runs a stateful controller once per tick and solves the Branching Maze", () => {
    const source: WorldSource = {
      world: maze as WorldData,
      entities: entities as EntitiesData,
    };
    const sim = new Simulation(source, emptyBrain, {
      controller: compileController(MAZE_CONTROLLER_TEMPLATE),
    });

    let guard = 0;
    while (!sim.isDone && guard < 200) {
      sim.tick();
      guard += 1;
    }

    expect(sim.status).toBe("reached");
    expect(sim.world.atGoal()).toBe(true);
    expect(sim.world.tick).toBeLessThanOrEqual(80);
  });

  it("converts an unsafe controller action to wait", () => {
    const source: WorldSource = {
      world: {
        name: "Blocked",
        width: 3,
        height: 3,
        tiles: [[1, 1, 1], [1, 2, 1], [1, 1, 1]],
        start: { x: 1, y: 1 },
        goal: { x: 1, y: 1 },
        startDirection: "N",
      },
      entities: { entities: [] },
    };
    const sim = new Simulation(source, emptyBrain, {
      controller: { decide: () => "moveForward" },
    });
    const step = sim.tick();
    expect(step.trace.action.type).toBe("wait");
    expect(sim.world.agent.position).toEqual({ x: 1, y: 1 });
  });
});
