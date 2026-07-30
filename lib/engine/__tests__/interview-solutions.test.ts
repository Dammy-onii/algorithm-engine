/**
 * Reference rule solutions for the harder interview stages.
 *
 * These prove the published levels remain solvable with visual rules alone (no
 * Code mode, no composed functions). If a world's schedule, capacity, or
 * objective thresholds change, these fail loudly rather than silently making a
 * stage impossible.
 */

import { describe, expect, it } from "vitest";

import { Simulation, BrainSource } from "../simulation";
import { findWorld } from "@/lib/content/datasets";
import { findChallenge } from "@/content/challenges";
import { decompileBrain } from "@/lib/authoring/brainDecompiler";
import {
  evaluateObjectives,
  metricsFromSim,
  challengePassed,
} from "@/lib/authoring/objectives";

function runBrain(challengeId: string, brain: BrainSource, limit = 3000) {
  const challenge = findChallenge(challengeId);
  const sim = new Simulation(findWorld(challenge.worldKey).source, brain, {
    maxTicks: limit,
    stuckAfterIdleTicks: limit,
  });
  let guard = 0;
  while (!sim.isDone && guard < limit) {
    sim.tick();
    guard++;
  }
  const metrics = metricsFromSim(sim, decompileBrain(brain));
  const results = evaluateObjectives(challenge.objectives ?? [], metrics);
  return { sim, metrics, results, passed: challengePassed(results) };
}

/** 21 — Peak Hour Payment Switch: urgent-first, then cheapest healthy route. */
const peakHourBrain: BrainSource = {
  goals: { goals: [{ id: "switch", priority: 1 }] },
  states: { initial: "operate", states: [{ id: "operate" }] },
  functions: {
    functions: [
      { id: "route-a", action: "routeToA" },
      { id: "route-b", action: "routeToB" },
      { id: "route-c", action: "routeToC" },
      { id: "hold", action: "hold" },
      { id: "decline", action: "decline" },
    ],
  },
  rules: {
    rules: [
      { id: "urgent-b", when: "(isPriority || deadlineRemaining <= 8) && canRouteB", do: "route-b" },
      { id: "urgent-c", when: "(isPriority || deadlineRemaining <= 8) && canRouteC", do: "route-c" },
      { id: "urgent-a", when: "(isPriority || deadlineRemaining <= 8) && canRouteA", do: "route-a" },
      { id: "retry-not-a", when: "retryCount > 0 && lastProviderA && canRouteC", do: "route-c" },
      { id: "retry-not-a2", when: "retryCount > 0 && lastProviderA && canRouteB", do: "route-b" },
      { id: "retry-not-b", when: "retryCount > 0 && lastProviderB && canRouteC", do: "route-c" },
      { id: "retry-not-c", when: "retryCount > 0 && lastProviderC && canRouteB", do: "route-b" },
      { id: "cheap-a", when: "canRouteA && currentLatencyA <= 3000", do: "route-a" },
      { id: "mid-c", when: "canRouteC && currentLatencyC <= 4000", do: "route-c" },
      { id: "safe-b", when: "canRouteB", do: "route-b" },
      { id: "wait", when: "always", do: "hold" },
    ],
  },
  memory: {},
};

/** 24 — Autonomous Parking Operations: constrained vehicles first, then exits. */
const NOT_CONSTRAINED = "!carLarge && !carAccessible && !carReserved";

const parkingOpsBrain: BrainSource = {
  goals: { goals: [{ id: "operate", priority: 1 }] },
  states: { initial: "operate", states: [{ id: "operate" }] },
  functions: {
    functions: [
      { id: "park-standard", action: "parkStandard" },
      { id: "park-charging", action: "parkCharging" },
      { id: "park-large", action: "parkLarge" },
      { id: "park-premium", action: "parkPremium" },
      { id: "park-accessible", action: "parkAccessible" },
      { id: "park-reserved", action: "parkReserved" },
      { id: "release-vehicle", action: "releaseVehicle" },
      { id: "hold", action: "wait" },
    ],
  },
  rules: {
    rules: [
      { id: "reserved", when: "carReserved", do: "park-reserved" },
      { id: "accessible", when: "carAccessible", do: "park-accessible" },
      { id: "large", when: "carLarge", do: "park-large" },
      { id: "release", when: "hasExitRequest", do: "release-vehicle" },
      { id: "electric", when: "carElectric", do: "park-charging" },
      { id: "vip", when: "carVIP", do: "park-premium" },
      { id: "standard", when: NOT_CONSTRAINED, do: "park-standard" },
      { id: "spill-premium", when: NOT_CONSTRAINED, do: "park-premium" },
      { id: "spill-charging", when: NOT_CONSTRAINED, do: "park-charging" },
      { id: "wait", when: "always", do: "hold" },
    ],
  },
  memory: {},
};

describe("interview stage reference solutions", () => {
  it("21 Peak Hour Payment Switch passes every visible objective", () => {
    const run = runBrain("finance-peak-hour-switch", peakHourBrain);
    expect(run.sim.status).toBe("reached");
    expect(run.passed).toBe(true);
    // Comfortably inside the thresholds, not a knife-edge pass.
    expect(Number(run.metrics.domain.overloadRejects)).toBe(0);
    expect(Number(run.metrics.domain.timedOut)).toBeLessThanOrEqual(2);
  });

  it("24 Autonomous Parking Operations passes every visible objective", () => {
    const run = runBrain("parking-interview-operations", parkingOpsBrain);
    expect(run.sim.status).toBe("reached");
    expect(run.passed).toBe(true);
    expect(Number(run.metrics.domain.hardViolations)).toBe(0);
    expect(Number(run.metrics.domain.abandonedCount)).toBeLessThanOrEqual(12);
  });
});
