import { describe, expect, it } from "vitest";

import { findWorld } from "@/lib/content/datasets";
import pFunctions from "@/content/brains/parking/functions.json";
import pGoals from "@/content/brains/parking/goals.json";
import pMemory from "@/content/brains/parking/memory.json";
import pRules from "@/content/brains/parking/rules.json";
import pStates from "@/content/brains/parking/states.json";
import { findChallenge } from "@/content/challenges";
import { decompileBrain } from "@/lib/authoring/brainDecompiler";
import {
  challengePassed,
  evaluateObjectives,
  metricsFromSim,
} from "@/lib/authoring/objectives";
import { BrainSource, Simulation, WorldSource } from "../simulation";
import { EntitiesData, WorldData } from "../types";
import {
  ParkingConfig,
  departedVehicles,
  parkingRuntime,
  readyToLeaveVehicles,
} from "../worlds/parking";

const entities = { entities: [] } as EntitiesData;

const parkingBrain: BrainSource = {
  goals: pGoals,
  states: pStates,
  rules: pRules,
  functions: pFunctions,
  memory: pMemory,
} as BrainSource;

function parkingWorld(parking: ParkingConfig): WorldData {
  return {
    name: "Parking Test",
    kind: "parking",
    width: 1,
    height: 1,
    tiles: [[2]],
    start: { x: 0, y: 0 },
    goal: { x: 0, y: 0 },
    parking,
  } as unknown as WorldData;
}

function sim(parking: ParkingConfig, brain: BrainSource): Simulation {
  const source: WorldSource = { world: parkingWorld(parking), entities };
  return new Simulation(source, brain);
}

function run(simulation: Simulation, limit = 500): Simulation {
  let guard = 0;
  while (!simulation.isDone && guard < limit) {
    simulation.tick();
    guard += 1;
  }
  return simulation;
}

const standardBrain: BrainSource = {
  goals: { goals: [{ id: "operate", priority: 1 }] },
  states: { initial: "operate", states: [{ id: "operate" }] },
  rules: {
    rules: [
      { id: "release", when: "hasExitRequest", do: "release-vehicle" },
      { id: "park", when: "hasWaitingVehicle", do: "park-standard" },
      { id: "idle", when: "always", do: "hold" },
    ],
  },
  functions: {
    functions: [
      { id: "park-standard", action: "parkStandard" },
      { id: "release-vehicle", action: "releaseVehicle" },
      { id: "hold", action: "wait" },
    ],
  },
  memory: {},
};

describe("parking — smart facility operations", () => {
  it("authorizes departures and reuses finite capacity", () => {
    const result = run(
      sim(
        {
          spaces: [
            {
              id: "S1",
              kind: "standard",
              row: "north",
              order: 0,
              distanceToExit: 1,
            },
          ],
          vehicles: [
            { id: "car-1", arrivalTick: 0, duration: 2, size: "compact" },
            { id: "car-2", arrivalTick: 1, duration: 2, size: "compact" },
          ],
          maxTicks: 20,
        },
        standardBrain,
      ),
    );

    const runtime = parkingRuntime(result.world)!;
    expect(result.status).toBe("reached");
    expect(runtime.assignments).toBe(2);
    expect(runtime.vehicles[1].waited).toBeGreaterThan(0);
    expect(departedVehicles(result.world)).toHaveLength(2);
  });

  it("keeps an exit request in its bay until a rule authorizes departure", () => {
    const noExitBrain: BrainSource = {
      ...standardBrain,
      rules: {
        rules: [
          { id: "park", when: "hasWaitingVehicle", do: "park-standard" },
          { id: "idle", when: "always", do: "hold" },
        ],
      },
    };
    const result = run(
      sim(
        {
          spaces: [
            {
              id: "S1",
              kind: "standard",
              row: "north",
              order: 0,
              distanceToExit: 1,
            },
          ],
          vehicles: [
            { id: "car-1", arrivalTick: 0, duration: 2, size: "compact" },
            { id: "car-2", arrivalTick: 1, duration: 2, size: "compact" },
          ],
          maxTicks: 8,
        },
        noExitBrain,
      ),
    );

    expect(result.status).toBe("stuck");
    expect(readyToLeaveVehicles(result.world)).toHaveLength(1);
    expect(departedVehicles(result.world)).toHaveLength(0);
    expect(parkingRuntime(result.world)!.vehicles[1].status).toBe("scheduled");
  });

  it("records an allocation violation when a specialised vehicle uses the wrong category", () => {
    const result = run(
      sim(
        {
          spaces: [
            {
              id: "S1",
              kind: "standard",
              row: "north",
              order: 0,
              distanceToExit: 1,
            },
          ],
          vehicles: [
            {
              id: "ev-1",
              arrivalTick: 0,
              duration: 2,
              size: "compact",
              electric: true,
            },
          ],
          maxTicks: 10,
        },
        standardBrain,
      ),
    );

    const runtime = parkingRuntime(result.world)!;
    expect(result.status).toBe("reached");
    expect(runtime.violations).toBe(1);
    expect(runtime.vehicles[0].violation).toBe(true);
  });

  it("the reference parking operator passes all three authored levels", () => {
    const visualBrain = decompileBrain(parkingBrain);
    const levelIds = [
      "parking-first-shift",
      "parking-match-vehicle",
      "parking-priority-access",
    ];

    for (const id of levelIds) {
      const challenge = findChallenge(id);
      const result = run(
        new Simulation(findWorld(challenge.worldKey).source, parkingBrain),
      );
      const metrics = metricsFromSim(result, visualBrain);
      const objectives = evaluateObjectives(challenge.objectives ?? [], metrics);

      expect(result.status, `${id} should complete`).toBe("reached");
      expect(metrics.domain.violations, `${id} should allocate correctly`).toBe(0);
      expect(challengePassed(objectives), `${id} objectives should pass`).toBe(true);
    }
  });
});
