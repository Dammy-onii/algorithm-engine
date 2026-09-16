import { describe, expect, it } from "vitest";

import { findWorld } from "@/lib/content/datasets";
import { getChallenge } from "@/lib/content/registry";
import { evaluateObjectives, challengePassed, metricsFromSim } from "@/lib/authoring/objectives";
import { decompileBrain } from "@/lib/authoring/brainDecompiler";
import { BrainSource, Simulation, WorldSource } from "../simulation";
import type { AgentController } from "../controller";
import { WorldData } from "../types";
import { droneDomain, validateDroneData } from "../worlds/drone";
import { buildObservation } from "../decision/observation";

/** The shipped level's world source. */
function firstSweepWorld(): WorldSource {
  return findWorld("drone-first-sweep").source;
}

function run(simulation: Simulation, limit = 400): Simulation {
  let guard = 0;
  while (!simulation.isDone && guard < limit) {
    simulation.tick();
    guard += 1;
  }
  return simulation;
}

/**
 * The intended visual policy: report when overhead, otherwise close in on a
 * detected vehicle, otherwise keep sweeping. Three rules, using the module's
 * composite `flyToTarget` / `flyToSearch` actions.
 */
const SOLUTION_BRAIN: BrainSource = {
  goals: { goals: [{ id: "find-vehicle", priority: 10 }] },
  states: { initial: "searching", states: [{ id: "searching" }] },
  rules: {
    rules: [
      { id: "report-it", when: "atTarget", do: "report-find" },
      { id: "close-in", when: "targetDetected", do: "fly-to-target" },
      { id: "keep-searching", when: "always", do: "fly-to-search" },
    ],
  },
  functions: {
    functions: [
      { id: "fly-to-search", action: "flyToSearch" },
      { id: "fly-to-target", action: "flyToTarget" },
      { id: "report-find", action: "report" },
      { id: "hover", action: "wait" },
    ],
  },
  memory: {},
} as BrainSource;

describe("drone world module", () => {
  it("validates the shipped level's world data", () => {
    expect(() => validateDroneData(firstSweepWorld().world)).not.toThrow();
  });

  it("rejects a target outside the search area", () => {
    const world = {
      ...firstSweepWorld().world,
      drone: { target: { x: 99, y: 0 } },
    } as unknown as WorldData;
    expect(() => validateDroneData(world)).toThrow(/inside the search area/);
  });

  it("rejects a target sitting under the drone at launch", () => {
    const world = {
      ...firstSweepWorld().world,
      drone: { target: { x: 0, y: 0 }, pad: { x: 0, y: 0 } },
    } as unknown as WorldData;
    expect(() => validateDroneData(world)).toThrow(/under the drone/);
  });

  it("keeps the target hidden until the sensor reaches it", () => {
    const simulation = new Simulation(firstSweepWorld(), SOLUTION_BRAIN);
    const first = simulation.snapshot().observation.domain;

    expect(first.targetDetected).toBe(false);
    // No bearing and no distance leak before detection.
    expect(first.targetNorth).toBe(false);
    expect(first.targetEast).toBe(false);
    expect(first.targetSouth).toBe(false);
    expect(first.targetWest).toBe(false);
    expect(first.targetDistance).toBe(-1);
  });

  it("scans the launch cell's surroundings before the first tick", () => {
    const simulation = new Simulation(firstSweepWorld(), SOLUTION_BRAIN);
    // Launch at (0,0) with radius 1 covers the 2x2 corner block.
    expect(droneDomain(simulation.world).scanned.size).toBe(4);
  });

  it("solves the level with the intended visual policy", () => {
    const simulation = run(new Simulation(firstSweepWorld(), SOLUTION_BRAIN));
    const domain = droneDomain(simulation.world);

    expect(domain.detected).toBe(true);
    expect(domain.reported).toBe(true);
    expect(simulation.status).toBe("reached");
  });

  it("passes the shipped challenge's required objectives", () => {
    const challenge = getChallenge("drone-first-sweep")!;
    const simulation = run(new Simulation(firstSweepWorld(), SOLUTION_BRAIN));
    const brain = decompileBrain(SOLUTION_BRAIN);
    const results = evaluateObjectives(challenge.objectives!, metricsFromSim(simulation, brain));

    expect(challengePassed(results)).toBe(true);
    // Objective expressions must all resolve against the drone's facts.
    expect(results.every((r) => !r.error)).toBe(true);
  });

  it("finishes with battery to spare, so the pad stays optional here", () => {
    const simulation = run(new Simulation(firstSweepWorld(), SOLUTION_BRAIN));
    expect(simulation.world.agent.energy!).toBeGreaterThan(0);
  });

  it("ships a scaffold that already solves the level", () => {
    // The level loads pre-filled, so the scaffold itself is the guarantee:
    // pressing Apply & Run with nothing changed must complete the mission.
    const challenge = getChallenge("drone-first-sweep")!;
    const scaffold = challenge.scaffoldBrain as unknown as BrainSource;
    const simulation = run(new Simulation(firstSweepWorld(), scaffold));

    expect(simulation.status).toBe("reached");
    expect(droneDomain(simulation.world).reported).toBe(true);

    const results = evaluateObjectives(
      challenge.objectives!,
      metricsFromSim(simulation, decompileBrain(scaffold)),
    );
    expect(challengePassed(results)).toBe(true);
    // Pre-filled means the bonuses should land too, or the copy oversells it.
    expect(results.every((r) => r.met)).toBe(true);
  });

  it("puts both bonus objectives within reach of the intended policy", () => {
    const challenge = getChallenge("drone-first-sweep")!;
    const simulation = run(new Simulation(firstSweepWorld(), SOLUTION_BRAIN));
    const brain = decompileBrain(SOLUTION_BRAIN);
    const results = evaluateObjectives(challenge.objectives!, metricsFromSim(simulation, brain));

    // Tuned against the intended three-rule policy. Bonuses must be earnable by
    // a good solution but not free for a wandering one.
    expect(results.find((r) => r.id === "swift")?.met).toBe(true);
    expect(results.find((r) => r.id === "tidy")?.met).toBe(true);
  });

  it("flies the same route as the hand-written cardinal policy", () => {
    // The composites are a shorthand, not a different algorithm: the four-rule
    // manual version must produce the identical run.
    const manual: BrainSource = {
      ...SOLUTION_BRAIN,
      rules: {
        rules: [
          { id: "report-it", when: "atTarget", do: "report-find" },
          { id: "chase-n", when: "targetNorth", do: "fly-north" },
          { id: "chase-e", when: "targetEast", do: "fly-east" },
          { id: "chase-s", when: "targetSouth", do: "fly-south" },
          { id: "chase-w", when: "targetWest", do: "fly-west" },
          { id: "sweep-n", when: "searchNorth", do: "fly-north" },
          { id: "sweep-e", when: "searchEast", do: "fly-east" },
          { id: "sweep-s", when: "searchSouth", do: "fly-south" },
          { id: "sweep-w", when: "searchWest", do: "fly-west" },
        ],
      },
      functions: {
        functions: [
          { id: "fly-north", action: "moveNorth" },
          { id: "fly-east", action: "moveEast" },
          { id: "fly-south", action: "moveSouth" },
          { id: "fly-west", action: "moveWest" },
          { id: "report-find", action: "report" },
        ],
      },
    } as BrainSource;

    const composite = run(new Simulation(firstSweepWorld(), SOLUTION_BRAIN));
    const cardinal = run(new Simulation(firstSweepWorld(), manual));

    expect(composite.status).toBe("reached");
    expect(cardinal.status).toBe("reached");
    expect(composite.world.tick).toBe(cardinal.world.tick);
    expect(composite.world.agent.position).toEqual(cardinal.world.agent.position);
    // Three rules instead of nine, same 16-tick route.
    expect(composite.world.tick).toBe(16);
  });

  it("cannot be solved by sweeping alone — the target must be closed in on", () => {
    // Coverage without the target-bearing rules scans everything and still
    // never reports, so the run runs the battery down instead of succeeding.
    const sweepOnly: BrainSource = {
      ...SOLUTION_BRAIN,
      rules: {
        rules: [
          { id: "report", when: "atTarget", do: "report-find" },
          { id: "keep-searching", when: "searchPending", do: "fly-to-search" },
          { id: "idle", when: "always", do: "hover" },
        ],
      },
    } as BrainSource;

    const simulation = run(new Simulation(firstSweepWorld(), sweepOnly));
    const domain = droneDomain(simulation.world);

    expect(domain.detected).toBe(true);
    expect(domain.reported).toBe(false);
    expect(simulation.status).toBe("out-of-energy");
  });

  it("refuses to report when the drone is not over the target", () => {
    const simulation = new Simulation(firstSweepWorld(), SOLUTION_BRAIN);
    simulation.world.apply({ type: "report" });
    expect(droneDomain(simulation.world).reported).toBe(false);
    expect(simulation.world.status).not.toBe("reached");
  });

  it("recharges only while on the pad", () => {
    const simulation = new Simulation(firstSweepWorld(), SOLUTION_BRAIN);
    const world = simulation.world;
    world.agent.energy = 10;

    // On the pad at launch: gains rechargePerTick, less the shared per-tick drain.
    world.apply({ type: "recharge" });
    expect(world.agent.energy).toBe(15);

    // Step off the pad, and recharging does nothing but burn a tick.
    world.apply({ type: "moveEast" });
    const before = world.agent.energy!;
    world.apply({ type: "recharge" });
    expect(world.agent.energy).toBe(before - 1);
  });

  it("never recharges above the world's capacity", () => {
    const simulation = new Simulation(firstSweepWorld(), SOLUTION_BRAIN);
    const world = simulation.world;
    world.apply({ type: "recharge" });
    expect(world.agent.energy!).toBeLessThanOrEqual(world.energyCapacity!);
  });

  it("blocks movement off the edge of the search area", () => {
    const simulation = new Simulation(firstSweepWorld(), SOLUTION_BRAIN);
    const world = simulation.world;
    const observation = buildObservation(world);

    // Launch corner (0,0): north and west leave the sector.
    expect(observation.domain.blockedNorth).toBe(true);
    expect(observation.domain.blockedWest).toBe(true);

    world.apply({ type: "moveNorth" });
    expect(world.agent.position).toEqual({ x: 0, y: 0 });
    expect(world.lastMoveBlocked).toBe(true);
  });

  it("points the search bearing at ground the sensor has not covered", () => {
    const simulation = new Simulation(firstSweepWorld(), SOLUTION_BRAIN);
    const domain = buildObservation(simulation.world).domain;
    // Exactly one frontier direction is offered at a time.
    const bearings = [
      domain.searchNorth,
      domain.searchEast,
      domain.searchSouth,
      domain.searchWest,
    ];
    expect(bearings.filter(Boolean)).toHaveLength(1);
    // Never back off the edge of the sector.
    expect(domain.searchNorth).toBe(false);
    expect(domain.searchWest).toBe(false);
  });

  it("reports coverage as a percentage of the searchable area", () => {
    const simulation = new Simulation(firstSweepWorld(), SOLUTION_BRAIN);
    const domain = buildObservation(simulation.world).domain;
    // 4 of 36 cells covered from the launch corner.
    expect(domain.coverage).toBeCloseTo((4 / 36) * 100, 5);
    expect(domain.areaCovered).toBe(false);
  });

  it("solves the level from a Code Controller that builds its own map", () => {
    // The code-mode counterpart: identical mission, user-owned strategy.
    class SurveillanceDrone implements AgentController {
      private seen = new Set<string>();
      reset() {
        this.seen.clear();
      }
      decide(observation: import("../types").Observation): string {
        const facts = observation.domain;
        this.seen.add(`${observation.position.x},${observation.position.y}`);

        if (facts.atTarget) return "report";
        if (facts.targetDetected) {
          if (facts.targetNorth) return "moveNorth";
          if (facts.targetSouth) return "moveSouth";
          if (facts.targetEast) return "moveEast";
          return "moveWest";
        }
        if (facts.searchNorth) return "moveNorth";
        if (facts.searchEast) return "moveEast";
        if (facts.searchSouth) return "moveSouth";
        if (facts.searchWest) return "moveWest";
        return "wait";
      }
    }

    const simulation = run(
      new Simulation(firstSweepWorld(), SOLUTION_BRAIN, {
        controller: new SurveillanceDrone(),
      }),
    );

    expect(simulation.status).toBe("reached");
    expect(droneDomain(simulation.world).reported).toBe(true);
  });
});
