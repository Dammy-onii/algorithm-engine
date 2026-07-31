import { describe, expect, it } from "vitest";

import { Simulation, BrainSource, WorldSource } from "../simulation";
import { EntitiesData, WorldData } from "../types";

const entities = { entities: [] } as EntitiesData;

/**
 * A pocket world where the agent spawns facing a wall (north) with the only
 * opening to its right (east). This is the exact "stuck bashing a wall" setup:
 *   row 0: # # #
 *   row 1: # R .
 *   row 2: # # #
 */
function pocketWorld(): WorldData {
  return {
    name: "Pocket",
    width: 3,
    height: 3,
    tiles: [
      [1, 1, 1],
      [1, 2, 0],
      [1, 1, 1],
    ],
    start: { x: 1, y: 1 },
    goal: { x: 2, y: 1 },
    startDirection: "N",
  } as WorldData;
}

const src = (): WorldSource => ({ world: pocketWorld(), entities });

const fns = { functions: [{ id: "step", action: "moveForward" }, { id: "spin", action: "turnRight" }] };
const states = { initial: "go", states: [{ id: "go" }] };
const goals = { goals: [{ id: "g", priority: 1 }] };

describe("action validity — guarded ordered flow", () => {
  it("skips an impossible earlier move for a possible later turn", () => {
    // Unguarded: move forward is the first branch, turning is the fallback.
    const brain: BrainSource = {
      goals,
      states,
      functions: fns,
      rules: {
        rules: [
          { id: "advance", when: "always", do: "step" },
          { id: "turn", when: "always", do: "spin" },
        ],
      },
      memory: {},
    };
    const sim = new Simulation(src(), brain);
    const before = sim.world.agent.direction;
    sim.tick();

    // moveForward is impossible (wall ahead), so the engine runs the turn: the
    // agent rotates from N toward the open east tile instead of looping forever.
    expect(before).toBe("N");
    expect(sim.world.agent.direction).toBe("E");
    expect(sim.world.agent.position).toEqual({ x: 1, y: 1 });
  });

  it("then advances once a move becomes possible", () => {
    const brain: BrainSource = {
      goals,
      states,
      functions: fns,
      rules: {
        rules: [
          { id: "advance", when: "always", do: "step" },
          { id: "turn", when: "always", do: "spin" },
        ],
      },
      memory: {},
    };
    const sim = new Simulation(src(), brain);
    sim.tick(); // turn to face E
    sim.tick(); // now move east into the open tile
    expect(sim.world.agent.position).toEqual({ x: 2, y: 1 });
  });

  it("waits when no branch has a possible action", () => {
    // Only an impossible move is available → the flow has no usable branch.
    const brain: BrainSource = {
      goals,
      states,
      functions: fns,
      rules: { rules: [{ id: "advance", when: "always", do: "step" }] },
      memory: {},
    };
    const sim = new Simulation(src(), brain);
    const step = sim.tick();
    expect(step.trace.action.type).toBe("wait");
    expect(step.trace.ruleId).toBeNull();
    expect(sim.world.agent.position).toEqual({ x: 1, y: 1 }); // blocked, no move
  });

  it("uses authored order, not legacy priority values", () => {
    const brain: BrainSource = {
      goals,
      states,
      functions: fns,
      rules: {
        rules: [
          { id: "turn-first", when: "always", do: "spin", priority: -100 },
          { id: "advance-later", when: "always", do: "step", priority: 999 },
        ],
      },
      memory: {},
    };
    const sim = new Simulation(src(), brain);
    const step = sim.tick();
    expect(step.trace.ruleId).toBe("turn-first");
    expect(step.trace.condition).toBe("always");
    expect(step.trace.reason).toContain("first top-to-bottom rule");
    expect(sim.world.agent.direction).toBe("E");
  });

  it("interrupts an unsafe later primitive in a multi-step brick", () => {
    const brain: BrainSource = {
      goals,
      states,
      functions: {
        functions: [
          { id: "step", action: "moveForward" },
          { id: "right", action: "turnRight" },
          { id: "turn-and-step", steps: ["right", "right", "step"] },
          { id: "spin", action: "turnRight" },
        ],
      },
      rules: {
        rules: [
          // The first two ticks turn N → E → S. The third primitive would walk
          // into the south wall, so it must be interrupted before it applies.
          { id: "turn-and-go", when: "always", do: "turn-and-step" },
          { id: "fallback", when: "always", do: "spin" },
        ],
      },
      memory: {},
    };
    const sim = new Simulation(src(), brain);
    sim.tick();
    sim.tick();
    const third = sim.tick();
    expect(third.trace.action.type).toBe("turnRight");
    expect(sim.world.agent.position).toEqual({ x: 1, y: 1 });
    expect(sim.world.agent.direction).toBe("W");
  });
});
