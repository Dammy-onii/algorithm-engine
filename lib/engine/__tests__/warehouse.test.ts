import { describe, expect, it } from "vitest";

import { findWorld } from "@/lib/content/datasets";
import { getChallenge } from "@/lib/content/registry";
import { evaluateObjectives, metricsFromSim } from "@/lib/authoring/objectives";
import { decompileBrain } from "@/lib/authoring/brainDecompiler";
import { compileBrain } from "@/lib/authoring/brainCompiler";
import { WAREHOUSE_CONTROLLER_STARTER, compileController } from "@/lib/authoring/controllerCompiler";
import { BrainSource, Simulation } from "../simulation";
import type { WorldData } from "../types";
import { STALL_TICKS, validateWarehouseData, warehouseDomain, warehouseStallReason } from "../worlds/warehouse";

const CHALLENGE_ID = "warehouse-load-the-truck";

function run(sim: Simulation, limit = 800): Simulation {
  let guard = 0;
  while (!sim.isDone && guard < limit) { sim.tick(); guard++; }
  return sim;
}

function scaffoldBrain(): BrainSource {
  return structuredClone(getChallenge(CHALLENGE_ID)!.scaffoldBrain) as unknown as BrainSource;
}

type Rule = BrainSource["rules"]["rules"][number];

/** The scaffold with the one fix the level asks for: screen tags at the top. */
function completedBrain(): BrainSource {
  const brain = scaffoldBrain();
  brain.rules.rules.unshift(
    { id: "screen", state: "operate", when: "hasTarget && !targetForRoute", do: "leave-pallet" } as Rule,
  );
  return brain;
}

function grade(sim: Simulation, brain: BrainSource) {
  return evaluateObjectives(
    getChallenge(CHALLENGE_ID)!.objectives ?? [],
    metricsFromSim(sim, decompileBrain(brain)),
  );
}

describe("warehouse module", () => {
  it("the scaffold ships full loads but mis-ships the Harbor pallets", () => {
    const brain = scaffoldBrain();
    const sim = run(new Simulation(findWorld(CHALLENGE_ID).source, brain));
    const domain = warehouseDomain(sim.world);
    // dispatch-full sends the first full truck, so a full truck never blocks the yard.
    expect(domain.truck.trips).toBeGreaterThanOrEqual(1);
    expect(domain.misShips).toBeGreaterThan(0);
    // With the two Harbor pallets aboard, eight pallets fill two trucks exactly:
    // the run finishes, but the mis-ships fail the level.
    expect(sim.world.status).toBe("reached");
    expect(grade(sim, brain).find((r) => r.id === "clean")?.met).toBe(false);
  });

  it("screening and dispatching delivers the order in two trips", () => {
    const brain = completedBrain();
    const sim = run(new Simulation(findWorld(CHALLENGE_ID).source, brain));
    const domain = warehouseDomain(sim.world);
    expect(sim.world.status).toBe("reached");
    expect(domain.misShips).toBe(0);
    expect(domain.truck.trips).toBe(2);
    expect(domain.pallets.filter((p) => !p.forRoute).every((p) => p.state === "waiting")).toBe(true);
    expect(grade(sim, brain).every((r) => r.met)).toBe(true);
    // Leaves a clear battery margin for slower but correct policies.
    expect(sim.world.agent.energy).toBeGreaterThanOrEqual(60);
  });

  it("the truck never sits loaded in the bay: full and final partial loads both leave", () => {
    const sim = run(new Simulation(findWorld(CHALLENGE_ID).source, completedBrain()));
    const domain = warehouseDomain(sim.world);
    // Six pallets at four per trip: a full load, then a partial load of two.
    expect(domain.truck.trips).toBe(2);
    expect(domain.truck.load).toHaveLength(0);
    expect(sim.world.status).toBe("reached");
  });

  it("without dispatch-last the final partial load is stranded and the stall is explained", () => {
    const brain = completedBrain();
    brain.rules.rules = brain.rules.rules.filter((r) => r.id !== "dispatch-last");
    const sim = run(new Simulation(findWorld(CHALLENGE_ID).source, brain));
    const domain = warehouseDomain(sim.world);
    expect(domain.truck.trips).toBe(1);
    expect(domain.truck.load).toHaveLength(2);
    expect(sim.world.status).toBe("stuck");
    expect(warehouseStallReason(sim.world)).toMatch(/2 pallets aboard and nothing left to load/);
  });

  it("the Code mode starter dispatches loads and only lacks the tag check", () => {
    const sim = run(new Simulation(findWorld(CHALLENGE_ID).source, scaffoldBrain(), {
      controller: compileController(WAREHOUSE_CONTROLLER_STARTER),
    }));
    expect(sim.world.status).toBe("reached");
    expect(warehouseDomain(sim.world).misShips).toBeGreaterThan(0);
  });

  it("rules added at the bottom of the scaffold still run (no catch-all)", () => {
    // "+ Add rule" appends; the tag check then has to be moved above lift.
    const brain = scaffoldBrain();
    expect(brain.rules.rules.some((r) => r.when.trim() === "always")).toBe(false);
    brain.rules.rules.push({ id: "screen", state: "operate", when: "hasTarget && !targetForRoute", do: "leave-pallet" } as Rule);
    const screen = brain.rules.rules.pop()!;
    brain.rules.rules.unshift(screen); // what the ↑ arrows do
    const sim = run(new Simulation(findWorld(CHALLENGE_ID).source, compileBrain(decompileBrain(brain))));
    expect(sim.world.status).toBe("reached");
    expect(warehouseDomain(sim.world).misShips).toBe(0);
  });

  it("a slow but valid policy is not starved: waiting for the truck costs no battery", () => {
    const brain = completedBrain();
    brain.rules.rules.find((r) => r.id === "dispatch-full")!.when = "truckAtDock && truckLoad > 0"; // dispatch after every pallet
    const sim = run(new Simulation(findWorld(CHALLENGE_ID).source, brain));
    expect(sim.world.status).toBe("reached");
    expect(warehouseDomain(sim.world).truck.trips).toBe(6);
  });

  it("does not call the yard stuck while the truck is away", () => {
    // Trips longer than the stall window: the idle forklift must not be cut off.
    const source = structuredClone(findWorld(CHALLENGE_ID).source);
    const world = source.world as WorldData & { warehouse: { truck: { tripTicks: number } } };
    world.warehouse.truck.tripTicks = STALL_TICKS * 3;
    world.energy = 400;
    const sim = run(new Simulation(source, completedBrain()));
    expect(sim.world.status).toBe("reached");
  });

  it("rejects pallets on blocked cells", () => {
    const data = structuredClone(findWorld(CHALLENGE_ID).source.world) as WorldData & {
      warehouse: { pallets: Array<{ col: number; row: number; store: string }> };
    };
    data.warehouse.pallets[0] = { col: 1, row: 2, store: "Northgate Market" };
    expect(() => validateWarehouseData(data)).toThrow(/blocked/);
  });
});
