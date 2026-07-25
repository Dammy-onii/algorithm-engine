import { describe, expect, it } from "vitest";

import { BrainSource, Simulation, WorldSource } from "../simulation";
import { EntitiesData, WorldData } from "../types";
import { compileBrain } from "@/lib/authoring/brainCompiler";
import { decompileBrain } from "@/lib/authoring/brainDecompiler";
import { findChallenge } from "@/content/challenges";
import { deliveredCount, packagesRemaining, warehouseRuntime } from "@/lib/engine/worlds/warehouse";

import entities from "@/content/worlds/entities.json";
import sorting from "@/content/worlds/warehouse-package-sorting.json";
import continuous from "@/content/worlds/warehouse-continuous-operations.json";
import energy from "@/content/worlds/warehouse-energy-management.json";

const operatorBrain: BrainSource = {
  goals: { goals: [{ id: "operate", priority: 1 }] },
  states: { initial: "operate", states: [{ id: "operate" }] },
  functions: {
    functions: [
      { id: "step", action: "moveForward" },
      { id: "pivot-left", action: "turnLeft" },
      { id: "pivot-right", action: "turnRight" },
      { id: "pick-up", action: "pickUp" },
      { id: "deliver", action: "deliver" },
      { id: "charge", action: "charge" },
      { id: "hold", action: "wait" }
    ]
  },
  rules: {
    rules: [
      { id: "charge", when: "chargingHere && energy < 40", do: "charge", priority: 500 },
      { id: "deliver-red", when: "deliveryRedHere && carryingRed", do: "deliver", priority: 400 },
      { id: "deliver-blue", when: "deliveryBlueHere && carryingBlue", do: "deliver", priority: 399 },
      { id: "pick", when: "packageHere && capacityRemaining > 0", do: "pick-up", priority: 300 },
      { id: "move", when: "!wallAhead", do: "step", priority: 60 },
      { id: "follow-left", when: "!wallLeft", do: "pivot-left", priority: 50 },
      { id: "turn", when: "!wallRight", do: "pivot-right", priority: 40 },
      { id: "about-face", when: "always", do: "pivot-right", priority: 10 }
    ]
  },
  memory: {}
};

function makeSim(world: WorldData, brain: BrainSource = operatorBrain) {
  const source: WorldSource = { world, entities: entities as EntitiesData };
  return new Simulation(source, brain);
}

function run(sim: Simulation, limit = 300) {
  const actions: string[] = [];
  while (!sim.isDone && actions.length < limit) {
    actions.push(sim.tick().trace.action.type);
  }
  return actions;
}

describe("warehouse Modes 2–4", () => {
  it("Mode 2 exposes typed package observations and sorts both packages", () => {
    const sim = makeSim(sorting as WorldData);
    let sawRedPackage = false;
    let guard = 0;
    while (!sim.isDone && guard < 300) {
      const step = sim.tick();
      sawRedPackage ||= step.observation.domain.packageRedHere === true;
      guard++;
    }

    expect(sawRedPackage).toBe(true);
    expect(sim.status).toBe("reached");
    expect(deliveredCount(sim.world)).toBe(2);
  });

  it("Mode 3 replaces a collected station package immediately and completes all stock", () => {
    const sim = makeSim(continuous as WorldData);
    let sawReplenishment = false;
    let guard = 0;
    while (!sim.isDone && guard < 300 && !sawReplenishment) {
      sim.tick();
      const warehouse = warehouseRuntime(sim.world)!;
      sawReplenishment = warehouse.stations.some((station) => station.remaining < station.total);
      guard++;
    }

    const warehouse = warehouseRuntime(sim.world)!;
    expect(sawReplenishment).toBe(true);
    expect(warehouse.stations.some((station) => station.remaining === station.total - 1)).toBe(true);
    expect(warehouse.packages.some((pkg) => pkg.stationId && pkg.status === "waiting")).toBe(true);
    expect(packagesRemaining(sim.world)).toBe(6);

    run(sim);
    expect(sim.status).toBe("reached");
    expect(deliveredCount(sim.world)).toBe(6);
    expect(packagesRemaining(sim.world)).toBe(0);
  });

  it("Mode 4 charges at its station and completes before the battery is exhausted", () => {
    const sim = makeSim(energy as WorldData);
    const actions = run(sim);

    expect(actions).toContain("charge");
    expect(sim.status).toBe("reached");
    expect(sim.world.agent.energy).toBeGreaterThan(0);
    expect(deliveredCount(sim.world)).toBe(6);
  });

  it("Studio-authored rules solve each new warehouse stage", () => {
    const authored = (challengeId: string, extraRules: ReturnType<typeof decompileBrain>["rules"]) => {
      const visual = decompileBrain(findChallenge(challengeId).scaffoldBrain as BrainSource);
      visual.rules = [...extraRules, ...visual.rules];
      return compileBrain(visual);
    };
    const deliveries = [
      {
        id: "deliver-red",
        state: null,
        condition: { mode: "guided" as const, group: { operator: "&&" as const, atoms: [{ flag: "deliveryRedHere", negated: false }, { flag: "carryingRed", negated: false }] } },
        functionId: "deliver", setState: null, priority: 400, description: ""
      },
      {
        id: "deliver-blue",
        state: null,
        condition: { mode: "guided" as const, group: { operator: "&&" as const, atoms: [{ flag: "deliveryBlueHere", negated: false }, { flag: "carryingBlue", negated: false }] } },
        functionId: "deliver", setState: null, priority: 399, description: ""
      }
    ];
    const sortingSim = makeSim(sorting as WorldData, authored("warehouse-package-sorting", deliveries));
    run(sortingSim);
    expect(sortingSim.status).toBe("reached");

    const operationsSim = makeSim(continuous as WorldData, authored("warehouse-continuous-operations", [
      ...deliveries,
      {
        id: "pick-with-space",
        state: null,
        condition: { mode: "guided" as const, group: { operator: "&&" as const, atoms: [{ flag: "packageHere", negated: false }, { flag: "capacityRemaining", negated: false, comparison: { op: ">", value: 0 } }] } },
        functionId: "pick-up", setState: null, priority: 390, description: ""
      }
    ]));
    run(operationsSim);
    expect(operationsSim.status).toBe("reached");

    const energySim = makeSim(energy as WorldData, authored("warehouse-energy-management", [{
      id: "charge-low", state: null,
      condition: { mode: "guided" as const, group: { operator: "&&" as const, atoms: [{ flag: "chargingHere", negated: false }, { flag: "energy", negated: false, comparison: { op: "<", value: 40 } }] } },
      functionId: "charge", setState: null, priority: 500, description: ""
    }]));
    run(energySim);
    expect(energySim.status).toBe("reached");
  });
});
