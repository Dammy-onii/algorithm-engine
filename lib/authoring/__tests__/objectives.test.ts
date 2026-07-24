/**
 * Objectives — grading algorithm quality, not just correctness.
 */

import { describe, expect, it } from "vitest";

import {
  evaluateObjectives,
  challengePassed,
  measureRun,
  RunMetrics,
} from "../objectives";
import { compileBrain } from "../brainCompiler";
import { decompileBrain } from "../brainDecompiler";
import { VisualBrain } from "../types";

import { Simulation, BrainSource } from "@/lib/engine/simulation";
import { EntitiesData, WorldData } from "@/lib/engine/types";
import { CHALLENGES } from "@/challenges/index";
import { findWorld } from "@/app/lib/datasets";

import maze from "@/world/maze.json";
import entities from "@/world/entities.json";

const baseMetrics: RunMetrics = {
  reached: true,
  stuck: false,
  outOfEnergy: false,
  ticks: 18,
  visited: 12,
  energy: 80,
  revisits: 6,
  rules: 2,
  functions: 1,
  states: 1,
  conditions: 0,
};

describe("evaluateObjectives", () => {
  it("marks primary and bonus objectives from the metrics", () => {
    const results = evaluateObjectives(
      [
        { id: "reach", label: "Reach", check: "reached" },
        { id: "swift", label: "Fast", check: "reached && ticks <= 20", bonus: true },
        { id: "tiny", label: "Tiny", check: "rules <= 1", bonus: true },
      ],
      baseMetrics,
    );
    expect(results.map((r) => r.met)).toEqual([true, true, false]);
    expect(results[1].bonus).toBe(true);
  });

  it("records an error for a malformed check instead of throwing", () => {
    const [r] = evaluateObjectives(
      [{ id: "bad", label: "Bad", check: "reached &&" }],
      baseMetrics,
    );
    expect(r.met).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it("challengePassed requires every non-bonus objective", () => {
    const results = evaluateObjectives(
      [
        { id: "reach", label: "Reach", check: "reached" },
        { id: "bonus", label: "Bonus", check: "never", bonus: true },
      ],
      baseMetrics,
    );
    expect(challengePassed(results)).toBe(true);

    const failing = evaluateObjectives(
      [{ id: "reach", label: "Reach", check: "never" }],
      baseMetrics,
    );
    expect(challengePassed(failing)).toBe(false);
  });
});

describe("measureRun + challenge objectives", () => {
  it("a solving brain passes challenge 1's primary objective", () => {
    const c = CHALLENGES.find((x) => x.id === "straight-line")!;
    const visual: VisualBrain = decompileBrain(c.scaffoldBrain as BrainSource);
    // Give the scaffold a working brain: settle on goal, else step forward.
    visual.rules = [
      {
        id: "settle",
        state: null,
        condition: { mode: "raw", expr: "atGoal" },
        functionId: "hold",
        setState: null,
        priority: 100,
        description: "",
      },
      {
        id: "go",
        state: null,
        condition: { mode: "raw", expr: "!wallAhead" },
        functionId: "step",
        setState: null,
        priority: 10,
        description: "",
      },
    ];

    const sim = new Simulation(findWorld(c.worldKey).source, compileBrain(visual));
    const metrics = measureRun(sim, visual);
    const results = evaluateObjectives(c.objectives ?? [], metrics);

    expect(metrics.reached).toBe(true);
    expect(challengePassed(results)).toBe(true);
  });

  it("measures metrics from an unsolved run without throwing", () => {
    const brain: BrainSource = {
      goals: { goals: [] },
      states: { initial: "go", states: [{ id: "go" }] },
      functions: { functions: [{ id: "hold", action: "wait" }] },
      rules: { rules: [{ id: "idle", when: "always", do: "hold" }] },
      memory: {},
    };
    const sim = new Simulation(
      { world: maze as WorldData, entities: entities as EntitiesData },
      brain,
    );
    const visual = decompileBrain(brain);
    const metrics = measureRun(sim, visual, 100);
    expect(metrics.reached).toBe(false);
  });
});
