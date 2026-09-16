import { describe, expect, it } from "vitest";

import { findBrain, findWorld } from "@/lib/content/datasets";
import { getChallenge } from "@/lib/content/registry";
import { challengePassed, evaluateObjectives, metricsFromSim } from "@/lib/authoring/objectives";
import { decompileBrain } from "@/lib/authoring/brainDecompiler";
import { BrainSource, Simulation, WorldSource } from "../simulation";
import type { AgentController } from "../controller";
import type { Observation, WorldData } from "../types";
import { cargoDomain, cargoManhattan, cargoModule, validateCargoData } from "../worlds/cargo";

function cargoWorld(): WorldSource {
  return findWorld("drone-cargo-run").source;
}

function run(sim: Simulation, limit = 800): Simulation {
  let guard = 0;
  while (!sim.isDone && guard < limit) { sim.tick(); guard++; }
  return sim;
}

/** The shipped scaffold: one trip through the pipeline, then nothing. */
function scaffoldBrain(): BrainSource {
  return structuredClone(
    getChallenge("drone-cargo-run")!.scaffoldBrain,
  ) as unknown as BrainSource;
}

/**
 * The scaffold tuned up to take both bonuses. The two levers are coupled, which
 * is the exercise: loosening the grab guard lets the drone pocket crates it
 * flies over (144 ticks → 133), but that costs planned stops the capacity they
 * needed, so the loop replans more and burns more battery — paid for by raising
 * the charge threshold (95 → 50 on landing, still clear of the 50 bonus).
 */
function completedBrain(): BrainSource {
  const brain = scaffoldBrain();
  const rules = brain.rules.rules;
  rules.find((r) => r.id === "grab-it")!.when = "canPickHere";
  for (const id of ["top-up", "keep-charging"]) {
    rules.find((r) => r.id === id)!.when = "atDepot && battery < 135";
  }
  return brain;
}

/** Value-aware routing planner — the Code-mode "good" solution. */
class Planner implements AgentController {
  private plan: Set<number> | null = null;
  reset() { this.plan = null; }
  decide(o: Observation): string {
    const f = o.domain;
    const W = (i: number) => f[`obj${i}Weight`] as number;
    const V = (i: number) => f[`obj${i}Value`] as number;
    const X = (i: number) => f[`obj${i}Col`] as number;
    const Y = (i: number) => f[`obj${i}Row`] as number;
    if (!this.plan) {
      const idx = Array.from({ length: 8 }, (_, i) => i);
      idx.sort((a, b) => V(b) / W(b) - V(a) / W(a) || V(b) - V(a));
      // Every crate comes home — the depot refuels, so there is no reason to
      // leave any. Value only decides the order they are fetched in.
      this.plan = new Set<number>(idx);
    }
    // Bank anything aboard the moment we are home, then top the battery up
    // before setting out again — the level's budget assumes a charging stop.
    if (f.atDepot && (f.carriedCount as number) > 0) return "dropOff";
    if (f.atDepot && !f.sectorClear && (f.battery as number) < 120) return "recharge";

    const px = o.position.x, py = o.position.y;
    const plan = [...this.plan];
    for (const i of plan) {
      if (f[`obj${i}Active`] && X(i) === px && Y(i) === py && W(i) <= (f.capacityLeft as number)) return "pickUp";
    }
    const step = (tx: number, ty: number) => {
      if (ty < py && !f.blockedNorth) return "moveNorth";
      if (ty > py && !f.blockedSouth) return "moveSouth";
      if (tx > px && !f.blockedEast) return "moveEast";
      if (tx < px && !f.blockedWest) return "moveWest";
      return "wait";
    };
    const capLeft = f.capacityLeft as number;
    const targets = plan.filter((i) => f[`obj${i}Active`] && W(i) <= capLeft);
    if (targets.length > 0) {
      targets.sort((a, b) => (Math.abs(X(a) - px) + Math.abs(Y(a) - py)) - (Math.abs(X(b) - px) + Math.abs(Y(b) - py)));
      return step(X(targets[0]), Y(targets[0]));
    }
    if ((f.carriedCount as number) > 0) return f.atDepot ? "dropOff" : step(0, 0);
    if (f.sectorClear) return f.atDepot ? "wait" : step(0, 0);
    return step(0, 0);
  }
}

const emptyBrain: BrainSource = {
  goals: { goals: [] }, states: { initial: "s", states: [{ id: "s" }] },
  rules: { rules: [] }, functions: { functions: [] }, memory: {},
} as BrainSource;

describe("cargo world module", () => {
  it("validates the shipped level's world data", () => {
    expect(() => validateCargoData(cargoWorld().world)).not.toThrow();
  });

  it("rejects a target above the total available value", () => {
    const w = JSON.parse(JSON.stringify(cargoWorld().world)) as WorldData & { cargo: { valueTarget: number } };
    w.cargo.valueTarget = 999;
    expect(() => validateCargoData(w)).toThrow(/exceeds the total value/);
  });

  it("rejects an object heavier than capacity", () => {
    const w = JSON.parse(JSON.stringify(cargoWorld().world)) as WorldData & { cargo: { capacity: number } };
    w.cargo.capacity = 1;
    expect(() => validateCargoData(w)).toThrow(/heavier than capacity/);
  });

  it("does not report a mission complete before it starts", () => {
    const sim = new Simulation(cargoWorld(), emptyBrain);
    expect(sim.status).not.toBe("reached");
    expect(cargoDomain(sim.world).deliveredValue).toBe(0);
  });

  it("refuses to pick up more than capacity allows", () => {
    const sim = new Simulation(cargoWorld(), emptyBrain);
    const w = sim.world;
    const domain = cargoDomain(w);
    // Drop the drone onto the heaviest crate with almost no room left.
    const heavy = domain.objects.reduce((a, b) => (b.weight > a.weight ? b : a));
    w.agent.position = { ...heavy.pos };
    domain.load = domain.capacity - 1;
    w.apply({ type: "pickUp" });
    expect(heavy.state).toBe("active"); // did not fit, so not taken
    expect(domain.load).toBe(domain.capacity - 1);
  });

  it("charges more battery per move when carrying more weight", () => {
    const sim = new Simulation(cargoWorld(), emptyBrain);
    const w = sim.world;
    const domain = cargoDomain(w);

    const before = w.agent.energy!;
    w.apply({ type: "moveSouth" }); // empty: costs the base 1
    const emptyCost = before - w.agent.energy!;

    domain.load = 6;
    const mid = w.agent.energy!;
    w.apply({ type: "moveSouth" }); // loaded: base 1 + ceil(6 * 0.5) = 4
    const ladenCost = mid - w.agent.energy!;

    expect(emptyCost).toBe(1);
    expect(ladenCost).toBeGreaterThan(emptyCost);
    expect(ladenCost).toBe(1 + Math.ceil(6 * domain.drainPerWeight));
  });

  it("only completes on a safe homecoming with the sector cleared", () => {
    const sim = run(new Simulation(cargoWorld(), emptyBrain, { controller: new Planner() }));
    const domain = cargoDomain(sim.world);
    expect(sim.status).toBe("reached");
    expect(domain.deliveredCount).toBe(domain.objects.length);
    expect(domain.load).toBe(0);
    expect(sim.world.agent.position).toEqual(domain.depot);
  });

  // --- the planning primitives ---------------------------------------------

  it("runKnapsack selects the best-value set that fits the carry limit", () => {
    const sim = new Simulation(cargoWorld(), emptyBrain);
    const domain = cargoDomain(sim.world);
    sim.world.apply({ type: "runKnapsack" });

    const chosen = domain.plan.map((id) => domain.objects.find((o) => o.id === id)!);
    const weight = chosen.reduce((sum, o) => sum + o.weight, 0);
    const value = chosen.reduce((sum, o) => sum + o.value, 0);

    expect(weight).toBeLessThanOrEqual(domain.capacity);
    // Brute-force the optimum over the 8-crate manifest and match it.
    let best = 0;
    for (let mask = 0; mask < 1 << domain.objects.length; mask++) {
      let w = 0;
      let v = 0;
      domain.objects.forEach((o, i) => {
        if (mask & (1 << i)) { w += o.weight; v += o.value; }
      });
      if (w <= domain.capacity && v > best) best = v;
    }
    expect(value).toBe(best);
  });

  it("planRoute orders the plan into the shortest tour home", () => {
    const sim = new Simulation(cargoWorld(), emptyBrain);
    const domain = cargoDomain(sim.world);
    sim.world.apply({ type: "runKnapsack" });
    sim.world.apply({ type: "planRoute" });

    const at = sim.world.agent.position;
    const legs = domain.plan.map((id) => domain.objects.find((o) => o.id === id)!.pos);
    const tour = (stops: typeof legs) => {
      let total = 0;
      let from = at;
      for (const stop of stops) { total += cargoManhattan(from, stop); from = stop; }
      return total + cargoManhattan(from, domain.depot);
    };
    const permutations = (items: typeof legs): (typeof legs)[] =>
      items.length <= 1
        ? [items]
        : items.flatMap((item, i) =>
            permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
          );
    const shortest = Math.min(...permutations(legs).map(tour));
    expect(tour(legs)).toBe(shortest);
  });

  it("will not fly a plan that has not been selected and routed", () => {
    const challenge = getChallenge("drone-cargo-run")!;
    const fly = challenge.scaffoldBrain.functions.functions.find((f) => f.id === "fly-to-plan-target");
    expect(fly?.action).toBe("flyToPlanTarget");
    expect(cargoModule.actionPreconditions?.flyToPlanTarget).toBe("planRouted && !atPlanTarget");

    // With no plan, the precondition facts that gate it are both false.
    const sim = new Simulation(cargoWorld(), emptyBrain);
    const facts = cargoModule.observe(sim.world);
    expect(facts.hasPlan).toBe(false);
    expect(facts.planRouted).toBe(false);
  });

  it("recharges only while parked on the depot", () => {
    const sim = new Simulation(cargoWorld(), emptyBrain);
    const w = sim.world;
    w.agent.energy = 50;
    w.apply({ type: "recharge" }); // on the depot: +rechargePerTick, then the engine's -1
    expect(w.agent.energy).toBe(50 + cargoDomain(w).rechargePerTick - 1);

    w.agent.position = { x: 3, y: 3 };
    const away = w.agent.energy!;
    w.apply({ type: "recharge" }); // off the depot: no charge, still costs the tick
    expect(w.agent.energy).toBe(away - 1);
  });

  // --- the level's calibration ---------------------------------------------

  it("the shipped scaffold completes the mission", () => {
    const challenge = getChallenge("drone-cargo-run")!;
    const brain = scaffoldBrain();
    const sim = run(new Simulation(cargoWorld(), brain));
    const domain = cargoDomain(sim.world);
    const results = evaluateObjectives(challenge.objectives!, metricsFromSim(sim, decompileBrain(brain)));

    expect(sim.status).toBe("reached");
    expect(challengePassed(results)).toBe(true);
    // The sector is cleared, not just the value floor cleared.
    expect(domain.deliveredCount).toBe(domain.objects.length);
    expect(domain.objects.every((o) => o.state === "delivered")).toBe(true);
    expect(results.every((r) => !r.error)).toBe(true);
  });

  it("a full battery is not enough to leave crates behind", () => {
    // Completion is sector-clear, not target-met: banking past the value target
    // with cargo still on the ground must not end the run.
    const sim = new Simulation(cargoWorld(), emptyBrain);
    const domain = cargoDomain(sim.world);
    for (const o of domain.objects.slice(0, 7)) {
      o.state = "delivered";
      domain.deliveredValue += o.value;
      domain.deliveredCount += 1;
    }
    sim.world.apply({ type: "dropOff" }); // home, empty-handed, target met
    expect(domain.deliveredValue).toBeGreaterThanOrEqual(domain.valueTarget);
    expect(sim.world.status).not.toBe("reached");
  });

  it("the scaffold leaves real headroom — it does not sweep the bonuses", () => {
    const challenge = getChallenge("drone-cargo-run")!;
    const brain = scaffoldBrain();
    const sim = run(new Simulation(cargoWorld(), brain));
    const results = evaluateObjectives(challenge.objectives!, metricsFromSim(sim, decompileBrain(brain)));
    const missed = results.filter((r) => r.bonus && !r.met);
    expect(missed.length).toBeGreaterThan(0);
  });

  it("tuning the charge threshold and the grab guard earns every objective", () => {
    const challenge = getChallenge("drone-cargo-run")!;
    const brain = completedBrain();
    const sim = run(new Simulation(cargoWorld(), brain));
    const results = evaluateObjectives(challenge.objectives!, metricsFromSim(sim, decompileBrain(brain)));

    expect(sim.status).toBe("reached");
    expect(results.every((r) => r.met)).toBe(true);
  });

  it("exposes no action that chooses a crate for the policy", () => {
    // The whole point of this world: selection happens when a policy invokes
    // runKnapsack, never as a side effect of a movement action. Any action that
    // silently picks a target would hand back the decision being assessed.
    expect(cargoModule.domainActions).not.toContain("flyToNearestObject");
    expect(cargoModule.domainActions).toContain("runKnapsack");
    expect(cargoModule.domainActions).toContain("planRoute");

    const sim = new Simulation(cargoWorld(), emptyBrain);
    const before = { ...sim.world.agent.position };
    // flyToPlanTarget is inert until a plan has been selected and routed.
    sim.world.apply({ type: "flyToPlanTarget" });
    expect(sim.world.agent.position).toEqual(before);
    expect(cargoDomain(sim.world).plan).toEqual([]);
  });

  it("the shipped cargo demo brain completes the mission", () => {
    const sim = run(new Simulation(cargoWorld(), findBrain("cargo-planner").source));
    expect(sim.status).toBe("reached");
  });

  it("the recharge branch is what the required objective turns on", () => {
    // Same policy as the shipped one, minus only the charging rules.
    const brain = scaffoldBrain();
    const chargeless = {
      ...brain,
      rules: { rules: brain.rules.rules.filter((r) => r.do !== "charge") },
    } as BrainSource;
    const sim = run(new Simulation(cargoWorld(), chargeless));
    expect(sim.status).toBe("out-of-energy");
  });
});
