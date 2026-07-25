import { describe, expect, it } from "vitest";

import { Simulation, BrainSource, WorldSource } from "../simulation";
import { EntitiesData, WorldData } from "../types";
import { compileBrain } from "@/lib/authoring/brainCompiler";
import { decompileBrain } from "@/lib/authoring/brainDecompiler";
import { findChallenge } from "@/content/challenges";
import { deliveredCount, packageAt, packagesRemaining } from "@/lib/engine/worlds/warehouse";

import warehouse from "@/content/worlds/warehouse-first-delivery.json";
import entities from "@/content/worlds/entities.json";
import goals from "@/content/brains/warehouse/goals.json";
import states from "@/content/brains/warehouse/states.json";
import rules from "@/content/brains/warehouse/rules.json";
import functions from "@/content/brains/warehouse/functions.json";
import memory from "@/content/brains/warehouse/memory.json";

const source: WorldSource = {
  world: warehouse as WorldData,
  entities: entities as EntitiesData,
};

const brain: BrainSource = {
  goals,
  states,
  rules,
  functions,
  memory,
} as BrainSource;

describe("warehouse practice world", () => {
  it("exposes warehouse observations and does not complete by standing on its delivery tile", () => {
    const sim = new Simulation(source, brain);
    const initial = sim.snapshot().observation;

    expect(initial.domain.warehouse).toBe(true);
    expect(initial.domain.packagesRemaining).toBe(1);
    expect(initial.domain.carryingPackage).toBe(false);
    expect(sim.world.ticksAtGoal).toBe(0);
  });

  it("only picks up a package when standing on it with available capacity", () => {
    const sim = new Simulation(source, brain);

    sim.world.apply({ type: "pickUp" });
    expect(sim.world.agent.cargo).toEqual([]);
    expect(packagesRemaining(sim.world)).toBe(1);

    sim.reset();
    // Drive the route until the robot reaches the pick face and loads the order.
    let guard = 0;
    let picked = false;
    while (!sim.isDone && guard < 100) {
      if (sim.tick().trace.action.type === "pickUp") {
        picked = true;
        break;
      }
      guard++;
    }

    expect(picked).toBe(true);
    expect(sim.world.agent.cargo).toEqual(["order-001"]);
    expect(packageAt(sim.world)).toBeNull();
    expect(sim.tick().observation.domain.carryingPackage).toBe(true);
  });

  it("delivers through external warehouse rules and completes only after delivery", () => {
    const sim = new Simulation(source, brain);
    let guard = 0;
    while (!sim.isDone && guard < 100) {
      sim.tick();
      guard++;
    }

    expect(sim.status).toBe("reached");
    expect(deliveredCount(sim.world)).toBe(1);
    expect(packagesRemaining(sim.world)).toBe(0);
    expect(sim.world.agent.cargo).toEqual([]);
    expect(sim.world.ticksAtGoal).toBe(0);
  });

  it("does not deliver cargo at the wrong location", () => {
    const sim = new Simulation(source, brain);
    sim.world.agent.position = { x: 5, y: 3 }; // the pick face
    sim.world.apply({ type: "pickUp" });
    sim.world.agent.position = { x: 9, y: 1 }; // an aisle tile, not a dock
    sim.world.apply({ type: "deliver" });

    expect(sim.world.agent.cargo).toEqual(["order-001"]);
    expect(deliveredCount(sim.world)).toBe(0);
  });

  it("the Studio scaffold becomes a successful warehouse brain when its two interaction rules are authored", () => {
    const challenge = findChallenge("warehouse-first-delivery");
    const visual = decompileBrain(challenge.scaffoldBrain as BrainSource);
    visual.rules = [
      {
        id: "pick-up-order",
        state: null,
        condition: {
          mode: "guided",
          group: { operator: "&&", atoms: [{ flag: "packageHere", negated: false }] },
        },
        functionId: "pick-up",
        setState: null,
        priority: 190,
        description: "Load the package under the robot.",
      },
      {
        id: "deliver-at-station",
        state: null,
        condition: {
          mode: "guided",
          group: {
            operator: "&&",
            atoms: [
              { flag: "deliveryHere", negated: false },
              { flag: "carryingPackage", negated: false },
            ],
          },
        },
        functionId: "deliver",
        setState: null,
        priority: 200,
        description: "Unload cargo at the station.",
      },
      ...visual.rules,
    ];

    const sim = new Simulation(source, compileBrain(visual));
    let guard = 0;
    while (!sim.isDone && guard < 100) {
      sim.tick();
      guard++;
    }

    expect(sim.status).toBe("reached");
    expect(deliveredCount(sim.world)).toBe(1);
  });
});
