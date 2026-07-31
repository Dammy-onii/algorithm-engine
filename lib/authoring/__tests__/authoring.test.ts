/**
 * Authoring layer tests (Milestone 2).
 *
 * These prove the central M2 claim: the visual editor is only a *producer* of the
 * same six-layer JSON the engine consumes. If a VisualBrain compiles
 * to a BrainSource the engine accepts and runs, the authoring layer is correct and
 * the engine stays untouched.
 */

import { describe, expect, it } from "vitest";

import { compileBrain, compileCondition, compileBrainToTexts } from "../brainCompiler";
import { decompileBrain } from "../brainDecompiler";
import { summarizeBrain } from "../brainSummarizer";
import { VisualBrain, VisualCondition } from "../types";

import { Simulation, BrainSource, WorldSource } from "@/lib/engine/simulation";
import { EntitiesData, WorldData } from "@/lib/engine/types";

import { CHALLENGES } from "@/content/challenges";
import { WORLDS, findWorld } from "@/lib/content/datasets";

import entities from "@/content/worlds/entities.json";
import maze from "@/content/worlds/maze.json";

// ---------------------------------------------------------------------------
// Condition compilation
// ---------------------------------------------------------------------------

describe("compileCondition", () => {
  it("compiles a single boolean atom, negated or not", () => {
    const plain: VisualCondition = {
      mode: "guided",
      group: { operator: "&&", atoms: [{ flag: "wallAhead", negated: false }] },
    };
    const negated: VisualCondition = {
      mode: "guided",
      group: { operator: "&&", atoms: [{ flag: "wallAhead", negated: true }] },
    };
    expect(compileCondition(plain)).toBe("wallAhead");
    expect(compileCondition(negated)).toBe("!wallAhead");
  });

  it("joins multiple atoms with the group operator", () => {
    const cond: VisualCondition = {
      mode: "guided",
      group: {
        operator: "&&",
        atoms: [
          { flag: "wallAhead", negated: false },
          { flag: "goalVisible", negated: true },
        ],
      },
    };
    expect(compileCondition(cond)).toBe("wallAhead && !goalVisible");
  });

  it("compiles numeric comparisons", () => {
    const cond: VisualCondition = {
      mode: "guided",
      group: {
        operator: "&&",
        atoms: [{ flag: "energy", negated: false, comparison: { op: "<", value: 20 } }],
      },
    };
    expect(compileCondition(cond)).toBe("energy < 20");
  });

  it("falls back to 'always' for empty groups and blank raw expressions", () => {
    expect(compileCondition({ mode: "guided", group: { operator: "&&", atoms: [] } })).toBe("always");
    expect(compileCondition({ mode: "raw", expr: "   " })).toBe("always");
  });

  it("passes raw expressions through untouched", () => {
    expect(compileCondition({ mode: "raw", expr: "energy < 5 || wallAhead" })).toBe(
      "energy < 5 || wallAhead",
    );
  });
});

// ---------------------------------------------------------------------------
// Round-trips
// ---------------------------------------------------------------------------

describe("compile / decompile round-trip", () => {
  it("treats world-module action wrappers as locked primitives", () => {
    const finance = decompileBrain(
      CHALLENGES.find(
        (challenge) => challenge.id === "finance-interview-routing",
      )!.scaffoldBrain as BrainSource,
    );

    expect(
      finance.functions.map((fn) => [fn.id, fn.action, fn.isBuiltIn]),
    ).toContainEqual(["route-a", "routeToA", true]);
    expect(finance.functions.every((fn) => fn.isBuiltIn)).toBe(true);
  });

  it("decompile(compile(visual)) preserves the meaningful structure", () => {
    const visual: VisualBrain = {
      goals: [{ id: "reach-goal", priority: 10, description: "Reach it", activeWhen: "" }],
      initial: "explore",
      states: [
        { id: "explore", description: "Look around" },
        { id: "seek", description: "Go for it" },
      ],
      rules: [
        {
          id: "advance",
          state: "explore",
          condition: {
            mode: "guided",
            group: { operator: "&&", atoms: [{ flag: "wallAhead", negated: true }] },
          },
          functionId: "step",
          setState: null,
          priority: 60,
          description: "",
        },
        {
          id: "spot",
          state: "explore",
          condition: {
            mode: "guided",
            group: { operator: "&&", atoms: [{ flag: "goalAhead", negated: false }] },
          },
          functionId: "step",
          setState: "seek",
          priority: 100,
          description: "",
        },
      ],
      functions: [
        { id: "step", description: "", action: "moveForward", isBuiltIn: true },
        { id: "about-face", description: "", steps: ["pivot-right", "pivot-right"], isBuiltIn: false },
        { id: "pivot-right", description: "", action: "turnRight", isBuiltIn: true },
      ],
      derived: [],
      memory: { visits: 0 },
    };

    const round = decompileBrain(compileBrain(visual));

    expect(round.initial).toBe("explore");
    expect(round.states.map((s) => s.id)).toEqual(["explore", "seek"]);
    expect(round.goals.map((g) => g.id)).toEqual(["reach-goal"]);
    expect(round.memory).toEqual({ visits: 0 });

    // Rules keep their authored file order, target state, function and transition.
    expect(round.rules.map((rule) => rule.id)).toEqual(["advance", "spot"]);
    const advance = round.rules.find((r) => r.id === "advance")!;
    expect(advance.state).toBe("explore");
    expect(advance.functionId).toBe("step");
    expect(advance.setState).toBeNull();

    const spot = round.rules.find((r) => r.id === "spot")!;
    expect(spot.setState).toBe("seek");

    // Conditions survive as equivalent expressions.
    expect(compileCondition(advance.condition)).toBe("!wallAhead");
    expect(compileCondition(spot.condition)).toBe("goalAhead");

    // Multi-step user function survives with its steps intact.
    const aboutFace = round.functions.find((f) => f.id === "about-face")!;
    expect(aboutFace.steps).toEqual(["pivot-right", "pivot-right"]);
  });

  it("compileBrainToTexts emits valid JSON for all six layers", () => {
    const visual = decompileBrain(CHALLENGES[0].scaffoldBrain as BrainSource);
    const texts = compileBrainToTexts(visual);
    for (const layer of ["goals", "states", "rules", "functions", "memory"]) {
      expect(() => JSON.parse(texts[layer])).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Challenges: every scaffold must build and run on the untouched engine
// ---------------------------------------------------------------------------

describe("challenge scaffolds", () => {
  it("every challenge references a world that exists in the registry", () => {
    for (const c of CHALLENGES) {
      const keys = WORLDS.map((w) => w.key);
      expect(keys, `challenge ${c.id} → world '${c.worldKey}'`).toContain(c.worldKey);
    }
  });

  it("every scaffold decompiles, recompiles and is accepted by the engine", () => {
    for (const c of CHALLENGES) {
      const visual = decompileBrain(c.scaffoldBrain as BrainSource);
      const compiled = compileBrain(visual);
      const world: WorldSource = findWorld(c.worldKey).source;

      // The engine's loader validates rules→functions and states→transitions.
      expect(() => new Simulation(world, compiled), `challenge ${c.id}`).not.toThrow();
    }
  });

  it("every scaffold can tick without throwing", () => {
    for (const c of CHALLENGES) {
      const compiled = compileBrain(decompileBrain(c.scaffoldBrain as BrainSource));
      const sim = new Simulation(findWorld(c.worldKey).source, compiled);
      for (let i = 0; i < 20 && !sim.isDone; i++) {
        expect(() => sim.tick(), `challenge ${c.id}`).not.toThrow();
      }
    }
  });

  it("every rule in a scaffold references a function the scaffold defines", () => {
    for (const c of CHALLENGES) {
      const fnIds = new Set(c.scaffoldBrain.functions.functions.map((f) => f.id));
      const rules = c.scaffoldBrain.rules.rules as { id: string; do: string }[];
      for (const r of rules) {
        expect(fnIds, `challenge ${c.id} rule ${r.id}`).toContain(r.do);
      }
    }
  });

  it("every availableBrick is a function the scaffold defines", () => {
    for (const c of CHALLENGES) {
      const fnIds = new Set(c.scaffoldBrain.functions.functions.map((f) => f.id));
      for (const brick of c.availableBricks) {
        expect(fnIds, `challenge ${c.id} brick ${brick}`).toContain(brick);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// A brain authored "in the editor" solves a real maze
// ---------------------------------------------------------------------------

describe("authored brain runs on the engine", () => {
  it("a visually-authored corridor follower reaches the goal in the snake maze", () => {
    const visual: VisualBrain = {
      goals: [{ id: "reach-goal", priority: 10, description: "", activeWhen: "" }],
      initial: "explore",
      states: [{ id: "explore", description: "" }],
      rules: [
        {
          // Arriving is not enough — the robot must settle on the goal for
          // `goalHoldTicks` consecutive ticks, so this must outrank everything.
          id: "settle-at-goal",
          state: "explore",
          condition: {
            mode: "guided",
            group: { operator: "&&", atoms: [{ flag: "atGoal", negated: false }] },
          },
          functionId: "hold",
          setState: null,
          priority: 200,
          description: "",
        },
        {
          id: "advance",
          state: "explore",
          condition: {
            mode: "guided",
            group: { operator: "&&", atoms: [{ flag: "wallAhead", negated: true }] },
          },
          functionId: "step",
          setState: null,
          priority: 60,
          description: "",
        },
        {
          id: "hug-left",
          state: "explore",
          condition: {
            mode: "guided",
            group: { operator: "&&", atoms: [{ flag: "wallLeft", negated: true }] },
          },
          functionId: "pivot-left",
          setState: null,
          priority: 50,
          description: "",
        },
        {
          id: "turn-right",
          state: "explore",
          condition: {
            mode: "guided",
            group: { operator: "&&", atoms: [{ flag: "wallRight", negated: true }] },
          },
          functionId: "pivot-right",
          setState: null,
          priority: 40,
          description: "",
        },
        {
          id: "dead-end",
          state: "explore",
          condition: { mode: "raw", expr: "always" },
          functionId: "pivot-right",
          setState: null,
          priority: 10,
          description: "",
        },
      ],
      functions: [
        { id: "step", description: "", action: "moveForward", isBuiltIn: true },
        { id: "pivot-left", description: "", action: "turnLeft", isBuiltIn: true },
        { id: "pivot-right", description: "", action: "turnRight", isBuiltIn: true },
        { id: "hold", description: "", action: "wait", isBuiltIn: true },
      ],
      derived: [],
      memory: {},
    };

    const source: WorldSource = {
      world: maze as WorldData,
      entities: entities as EntitiesData,
    };
    const sim = new Simulation(source, compileBrain(visual));

    let guard = 0;
    while (!sim.isDone && guard < 5000) {
      sim.tick();
      guard++;
    }
    expect(sim.status).toBe("reached");
  });

  it("reaching the goal is not enough — the agent must hold there", () => {
    // Same brain minus the settle rule: it walks over the goal and never settles.
    const noSettle: VisualBrain = {
      goals: [],
      initial: "explore",
      states: [{ id: "explore", description: "" }],
      rules: [
        {
          id: "advance",
          state: "explore",
          condition: { mode: "raw", expr: "!wallAhead" },
          functionId: "step",
          setState: null,
          priority: 60,
          description: "",
        },
        {
          id: "turn",
          state: "explore",
          condition: { mode: "raw", expr: "always" },
          functionId: "pivot-right",
          setState: null,
          priority: 10,
          description: "",
        },
      ],
      functions: [
        { id: "step", description: "", action: "moveForward", isBuiltIn: true },
        { id: "pivot-right", description: "", action: "turnRight", isBuiltIn: true },
      ],
      derived: [],
      memory: {},
    };

    const sim = new Simulation(
      { world: maze as WorldData, entities: entities as EntitiesData },
      compileBrain(noSettle),
    );

    let guard = 0;
    while (!sim.isDone && guard < 3000) {
      sim.tick();
      guard++;
    }
    expect(sim.status).not.toBe("reached");
  });

  it("goalHoldTicks is configurable and reported on each step", () => {
    const visual: VisualBrain = {
      goals: [],
      initial: "go",
      states: [{ id: "go", description: "" }],
      rules: [
        {
          id: "settle",
          state: "go",
          condition: { mode: "raw", expr: "atGoal" },
          functionId: "hold",
          setState: null,
          priority: 100,
          description: "",
        },
        {
          id: "advance",
          state: "go",
          condition: { mode: "raw", expr: "always" },
          functionId: "step",
          setState: null,
          priority: 10,
          description: "",
        },
      ],
      functions: [
        { id: "step", description: "", action: "moveForward", isBuiltIn: true },
        { id: "hold", description: "", action: "wait", isBuiltIn: true },
      ],
      derived: [],
      memory: {},
    };

    const sim = new Simulation(
      { world: maze as WorldData, entities: entities as EntitiesData },
      compileBrain(visual),
      { goalHoldTicks: 5 },
    );
    expect(sim.snapshot().goalHold).toEqual({ current: 0, required: 5 });
  });
});

// ---------------------------------------------------------------------------
// Summarizer
// ---------------------------------------------------------------------------

describe("summarizeBrain", () => {
  it("reports an empty brain as having no rules", () => {
    const visual = decompileBrain(CHALLENGES[0].scaffoldBrain as BrainSource);
    const summary = summarizeBrain(visual);
    expect(summary.isEmpty).toBe(true);
    expect(summary.ruleCount).toBe(0);
  });

  it("counts rules and states for a populated brain", () => {
    const visual = decompileBrain(CHALLENGES[2].scaffoldBrain as BrainSource);
    const summary = summarizeBrain(visual);
    expect(summary.ruleCount).toBeGreaterThan(0);
    expect(summary.stateCount).toBeGreaterThan(0);
    expect(summary.lines.length).toBe(summary.ruleCount);
  });
});
