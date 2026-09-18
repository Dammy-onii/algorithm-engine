/**
 * Cross-challenge grading invariants.
 *
 * These guard the one failure mode that no single level's tests can catch: an
 * objective set that is satisfied by inaction. Six finance levels once passed
 * with zero payments routed, because `allProcessed` is true when every payment
 * has reached a terminal state — and a payment abandoned until it expires is
 * terminal. The cost ceilings were met at a cost of zero, and `failed == 0`
 * held because expiry is counted as `lost`, not `failed`.
 */

import { describe, expect, it } from "vitest";

import { CHALLENGES } from "@/content/challenges";
import { findWorld } from "@/lib/content/datasets";
import {
  challengePassed,
  evaluateObjectives,
  metricsFromSim,
} from "@/lib/authoring/objectives";
import { decompileBrain } from "@/lib/authoring/brainDecompiler";
import { BrainSource, Simulation } from "@/lib/engine/simulation";

/** A policy with no rules at all: it can only ever wait. */
const IDLE_BRAIN = {
  goals: { goals: [] },
  states: { initial: "idle", states: [{ id: "idle" }] },
  rules: { rules: [] },
  functions: { functions: [] },
  memory: {},
} as unknown as BrainSource;

function gradeIdleRun(challenge: (typeof CHALLENGES)[number]) {
  const sim = new Simulation(
    findWorld(challenge.worldKey).source,
    structuredClone(IDLE_BRAIN),
    { maxTicks: 4000 },
  );
  let guard = 0;
  while (!sim.isDone && guard < 4000) {
    sim.tick();
    guard++;
  }
  return evaluateObjectives(
    challenge.objectives ?? [],
    metricsFromSim(sim, decompileBrain(IDLE_BRAIN)),
  );
}

describe("challenge grading integrity", () => {
  it("no challenge can be passed by a policy that does nothing", () => {
    for (const challenge of CHALLENGES) {
      const results = gradeIdleRun(challenge);
      expect(
        challengePassed(results),
        `${challenge.id} is passed by an empty policy`,
      ).toBe(false);
    }
  });

  it("every objective expression evaluates without error", () => {
    for (const challenge of CHALLENGES) {
      for (const result of gradeIdleRun(challenge)) {
        expect(
          result.error,
          `${challenge.id} objective '${result.id}': ${result.error}`,
        ).toBeFalsy();
      }
    }
  });
});
