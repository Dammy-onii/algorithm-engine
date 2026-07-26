import { describe, expect, it } from "vitest";

import maze from "@/content/worlds/maze-proper.json";
import entities from "@/content/worlds/entities.json";
import {
  FINANCE_CONTROLLER_TEMPLATE,
  MAZE_CONTROLLER_TEMPLATE,
  compileController,
} from "@/lib/authoring/controllerCompiler";
import { findWorld } from "@/lib/content/datasets";
import {
  financeRuntime,
  financeScore,
} from "@/lib/engine/worlds/finance";
import { Simulation, type BrainSource, type WorldSource } from "../simulation";
import type { EntitiesData, WorldData } from "../types";

const emptyBrain: BrainSource = {
  goals: { goals: [{ id: "reach", priority: 1 }] },
  states: { initial: "controller", states: [{ id: "controller" }] },
  rules: { rules: [] },
  functions: { functions: [{ id: "hold", action: "wait" }] },
  memory: {},
};

const PEAK_HOUR_CONTROLLER_SOLUTION = `class PeakHourRouter {
  decide(observation) {
    const facts = observation.domain;
    if (!facts.hasTransaction) return "hold";

    const providers = [
      {
        id: "A",
        action: "routeToA",
        available: facts.canRouteA,
        cost: facts.expectedCostA,
        reliability: facts.successRateA,
        latency: facts.currentLatencyA,
        capacity: facts.capacityRemainingA,
        queue: facts.queueLengthA,
        congestion: facts.congestionA,
        health: facts.healthScoreA,
        wasLast: facts.lastProviderA,
      },
      {
        id: "B",
        action: "routeToB",
        available: facts.canRouteB,
        cost: facts.expectedCostB,
        reliability: facts.successRateB,
        latency: facts.currentLatencyB,
        capacity: facts.capacityRemainingB,
        queue: facts.queueLengthB,
        congestion: facts.congestionB,
        health: facts.healthScoreB,
        wasLast: facts.lastProviderB,
      },
      {
        id: "C",
        action: "routeToC",
        available: facts.canRouteC,
        cost: facts.expectedCostC,
        reliability: facts.successRateC,
        latency: facts.currentLatencyC,
        capacity: facts.capacityRemainingC,
        queue: facts.queueLengthC,
        congestion: facts.congestionC,
        health: facts.healthScoreC,
        wasLast: facts.lastProviderC,
      },
    ].filter((provider) => provider.available);

    if (providers.length === 0) {
      return facts.deadlineRemaining > 2 ? "hold" : "decline";
    }

    // A retry should move away from the provider that just failed whenever an
    // eligible alternative exists.
    const alternatives = providers.filter((provider) => !provider.wasLast);
    const candidates =
      facts.retryCount > 0 && alternatives.length > 0
        ? alternatives
        : providers;

    const urgent =
      facts.isPriority ||
      facts.isPayroll ||
      facts.isHighValue ||
      facts.deadlineRemaining <= 6;

    for (const provider of candidates) {
      provider.rank = urgent
        ? (100 - provider.reliability) * 8 +
          provider.latency / 250 +
          provider.queue * 3 +
          provider.congestion * 18 -
          provider.capacity * 1.5 -
          provider.health / 20
        : provider.cost * 8 +
          (100 - provider.reliability) * 1.5 +
          provider.latency / 1000 +
          provider.queue * 1.5 +
          provider.congestion * 10 -
          provider.capacity -
          provider.health / 50;
    }

    candidates.sort((left, right) => left.rank - right.rank);
    return candidates[0].action;
  }
}

return new PeakHourRouter();`;

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

  it("runs the Finance example against domain facts and clears its visible stream", () => {
    const sim = new Simulation(
      findWorld("finance-interview-routing").source,
      emptyBrain,
      {
        controller: compileController(FINANCE_CONTROLLER_TEMPLATE),
      },
    );

    let guard = 0;
    while (!sim.isDone && guard < 500) {
      sim.tick();
      guard += 1;
    }

    expect(sim.status).toBe("reached");
  });

  it("runs the Peak Hour solution against every visible interview objective", () => {
    const sim = new Simulation(
      findWorld("finance-peak-hour-switch").source,
      emptyBrain,
      {
        controller: compileController(PEAK_HOUR_CONTROLLER_SOLUTION),
      },
    );

    let guard = 0;
    while (!sim.isDone && guard < 1_000) {
      sim.tick();
      guard += 1;
    }

    const runtime = financeRuntime(sim.world);
    expect(runtime).not.toBeNull();
    expect(sim.status).toBe("reached");
    expect(runtime?.timedOut).toBeLessThanOrEqual(2);
    expect(runtime?.priorityFailures).toBeLessThanOrEqual(1);
    expect(runtime?.overloadRejects).toBe(0);
    expect(financeScore(sim.world)).toBeLessThan(100);
  });
});
