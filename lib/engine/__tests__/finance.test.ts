import { describe, expect, it } from "vitest";

import { Simulation, BrainSource, WorldSource } from "../simulation";
import { EntitiesData, WorldData } from "../types";
import { findChallenge } from "@/content/challenges";
import { findWorld } from "@/lib/content/datasets";
import { decompileBrain } from "@/lib/authoring/brainDecompiler";
import {
  challengePassed,
  evaluateObjectives,
  metricsFromSim,
} from "@/lib/authoring/objectives";

import fGoals from "@/content/brains/finance/goals.json";
import fStates from "@/content/brains/finance/states.json";
import fRules from "@/content/brains/finance/rules.json";
import fFunctions from "@/content/brains/finance/functions.json";
import fMemory from "@/content/brains/finance/memory.json";
import {
  FinanceConfig,
  createFinanceRuntime,
  financeRuntime,
  financeScore,
  providerStateAt,
  allProcessed,
  countByStatus,
  totalCost,
} from "../worlds/finance";

const entities = { entities: [] } as EntitiesData;

/** Live outcome read straight from the world (not the pre-action SimStep). */
function outcome(s: Simulation) {
  return {
    allProcessed: allProcessed(s.world),
    succeeded: countByStatus(s.world, "succeeded"),
    failed: countByStatus(s.world, "failed"),
    lost: countByStatus(s.world, "lost"),
    declined: countByStatus(s.world, "declined"),
    totalCost: totalCost(s.world),
  };
}

/** Build a finance WorldData (finance is a module-owned extension of WorldData). */
function financeWorld(finance: FinanceConfig): WorldData {
  return {
    name: "Finance Test",
    kind: "finance",
    width: 1,
    height: 1,
    tiles: [[2]],
    start: { x: 0, y: 0 },
    goal: { x: 0, y: 0 },
    finance,
  } as unknown as WorldData;
}

function sim(finance: FinanceConfig, brain: BrainSource): Simulation {
  const source: WorldSource = { world: financeWorld(finance), entities };
  return new Simulation(source, brain);
}

function run(s: Simulation, limit = 500) {
  let guard = 0;
  while (!s.isDone && guard < limit) {
    s.tick();
    guard++;
  }
  return outcome(s);
}

const fn = (id: string, action: string) => ({ id, action });

/** Routes each head payment to the lowest-fee online provider. */
const lowestFeeBrain: BrainSource = {
  goals: { goals: [{ id: "route", priority: 1 }] },
  states: { initial: "operate", states: [{ id: "operate" }] },
  functions: { functions: [fn("route-a", "routeToA"), fn("route-b", "routeToB"), fn("route-c", "routeToC"), fn("hold", "hold")] },
  rules: {
    rules: [
      { id: "a", when: "onlineA && (!onlineB || feeA <= feeB) && (!onlineC || feeA <= feeC)", do: "route-a", priority: 30 },
      { id: "b", when: "onlineB && (!onlineA || feeB < feeA) && (!onlineC || feeB <= feeC)", do: "route-b", priority: 30 },
      { id: "c", when: "onlineC && (!onlineA || feeC < feeA) && (!onlineB || feeC < feeB)", do: "route-c", priority: 30 },
      { id: "idle", when: "always", do: "hold", priority: 0 },
    ],
  },
  memory: {},
};

const expectedCostBrain: BrainSource = {
  ...lowestFeeBrain,
  rules: {
    rules: [
      { id: "a", when: "onlineA && (!onlineB || expectedCostA <= expectedCostB) && (!onlineC || expectedCostA <= expectedCostC)", do: "route-a", priority: 30 },
      { id: "b", when: "onlineB && (!onlineA || expectedCostB < expectedCostA) && (!onlineC || expectedCostB <= expectedCostC)", do: "route-b", priority: 30 },
      { id: "c", when: "onlineC && (!onlineA || expectedCostC < expectedCostA) && (!onlineB || expectedCostC < expectedCostB)", do: "route-c", priority: 30 },
      { id: "idle", when: "always", do: "hold", priority: 0 },
    ],
  },
};

const holdBrain: BrainSource = {
  ...lowestFeeBrain,
  rules: { rules: [{ id: "idle", when: "always", do: "hold", priority: 0 }] },
};

const routeABrain: BrainSource = {
  ...lowestFeeBrain,
  rules: { rules: [{ id: "a", when: "always", do: "route-a", priority: 30 }] },
};

describe("finance — payment routing", () => {
  it("routes to the cheapest online provider and drains the queue", () => {
    const domain = run(
      sim(
        {
          providers: [
            { id: "A", name: "A", fee: 0.2, successRate: 100, latency: 200, online: true },
            { id: "B", name: "B", fee: 0.1, successRate: 100, latency: 300, online: true },
          ],
          transactions: [
            { id: "t1", amount: 100, type: "consumer" },
            { id: "t2", amount: 100, type: "consumer" },
            { id: "t3", amount: 100, type: "consumer" },
          ],
        },
        lowestFeeBrain,
      ),
    );

    expect(domain.allProcessed).toBe(true);
    expect(domain.succeeded).toBe(3);
    expect(domain.failed).toBe(0);
    expect(domain.totalCost).toBeCloseTo(0.3, 5); // 3 × $0.10
  });

  it("fails payments routed to an offline provider (booking the penalty)", () => {
    const domain = run(
      sim(
        {
          failurePenalty: 5,
          providers: [
            { id: "A", name: "A", fee: 0.1, successRate: 100, latency: 200, online: false },
            { id: "B", name: "B", fee: 0.15, successRate: 100, latency: 300, online: true },
          ],
          transactions: [
            { id: "t1", amount: 100, type: "consumer" },
            { id: "t2", amount: 100, type: "consumer" },
          ],
        },
        routeABrain,
      ),
    );

    expect(domain.failed).toBe(2);
    expect(domain.succeeded).toBe(0);
    expect(domain.totalCost).toBeCloseTo(2 * (0.1 + 5), 5);
  });

  it("expected-cost routing beats naive cheapest when reliability differs", () => {
    const config: FinanceConfig = {
      seed: 42,
      failurePenalty: 5,
      providers: [
        { id: "A", name: "A", fee: 0.1, successRate: 50, latency: 200, online: true },
        { id: "B", name: "B", fee: 0.2, successRate: 100, latency: 300, online: true },
      ],
      transactions: Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, amount: 100, type: "consumer" })),
    };

    const cheap = run(sim(config, lowestFeeBrain));
    const value = run(sim(config, expectedCostBrain));

    // best-value routes to the reliable provider → no failures.
    expect(value.failed).toBe(0);
    expect(Number(cheap.failed)).toBeGreaterThan(0);
    expect(Number(value.totalCost)).toBeLessThan(Number(cheap.totalCost));
  });

  it("is deterministic for a fixed seed", () => {
    const config: FinanceConfig = {
      seed: 7,
      failurePenalty: 5,
      providers: [{ id: "A", name: "A", fee: 0.1, successRate: 60, latency: 200, online: true }],
      transactions: Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, amount: 100 })),
    };
    const a = run(sim(config, routeABrain));
    const b = run(sim(config, routeABrain));
    expect(a.totalCost).toBe(b.totalCost);
    expect(a.failed).toBe(b.failed);
  });

  it("applies scheduled provider health changes deterministically", () => {
    const runtime = createFinanceRuntime(
      financeWorld({
        providers: [
          {
            id: "A",
            name: "A",
            fee: 0.1,
            successRate: 99,
            latency: 200,
            online: true,
            schedule: [{ atTick: 4, online: false }],
          },
        ],
        transactions: [{ id: "t1", amount: 100 }],
      }),
    )!;

    expect(providerStateAt(runtime, "A", 0)?.online).toBe(true);
    expect(providerStateAt(runtime, "A", 3)?.online).toBe(true);
    expect(providerStateAt(runtime, "A", 4)?.online).toBe(false);
  });

  it("updates provider telemetry as queued work starts and completes", () => {
    const simulation = sim(
      {
        processingMode: "queued",
        tickDurationMs: 1000,
        providers: [
          {
            id: "A",
            name: "A",
            fee: 0.1,
            successRate: 100,
            latency: 2000,
            online: true,
            concurrentCapacity: 2,
            congestionLatencyPerItem: 500,
          },
        ],
        transactions: [{ id: "t1", amount: 100 }],
      },
      routeABrain,
    );

    expect(providerStateAt(financeRuntime(simulation.world)!, "A", 0)).toMatchObject({
      active: 0,
      attempts: 0,
      completed: 0,
      observedSuccessRate: 100,
    });

    simulation.tick();
    expect(
      providerStateAt(financeRuntime(simulation.world)!, "A", simulation.world.tick),
    ).toMatchObject({
      active: 1,
      capacityRemaining: 1,
      attempts: 1,
      completed: 0,
      utilization: 50,
      latency: 2500,
    });

    simulation.tick();
    expect(
      providerStateAt(financeRuntime(simulation.world)!, "A", simulation.world.tick),
    ).toMatchObject({
      active: 0,
      attempts: 1,
      completed: 1,
      succeeded: 1,
      failed: 0,
      observedSuccessRate: 100,
      averageLatency: 2000,
    });
  });

  it("the best-value router passes every authored finance level", () => {
    const financeBrain: BrainSource = {
      goals: fGoals,
      states: fStates,
      rules: fRules,
      functions: fFunctions,
      memory: fMemory,
    } as BrainSource;

    const levels = [
      "finance-basic-route",
      "finance-skip-offline",
      "finance-reliability-intro",
      "finance-route-selection",
      "finance-cost-and-reliability",
      "finance-provider-health",
    ];

    for (const id of levels) {
      const challenge = findChallenge(id);
      const s = new Simulation(findWorld(challenge.worldKey).source, financeBrain);
      let guard = 0;
      while (!s.isDone && guard < 500) {
        s.tick();
        guard++;
      }
      const metrics = metricsFromSim(s, decompileBrain(financeBrain));
      const results = evaluateObjectives(challenge.objectives ?? [], metrics);
      expect(s.status, `${id} should reach`).toBe("reached");
      expect(challengePassed(results), `${id} objectives should pass`).toBe(true);
    }
  });

  it("cost-focused challenges reject clean but needlessly expensive routes", () => {
    const cases: Array<{ id: string; brain: BrainSource }> = [
      {
        id: "finance-basic-route",
        brain: routeABrain,
      },
      {
        id: "finance-skip-offline",
        brain: {
          ...lowestFeeBrain,
          rules: {
            rules: [
              { id: "route-c", when: "onlineC", do: "route-c", priority: 1 },
            ],
          },
        },
      },
    ];

    for (const { id, brain } of cases) {
      const challenge = findChallenge(id);
      const simulation = new Simulation(
        findWorld(challenge.worldKey).source,
        brain,
      );
      run(simulation);
      const metrics = metricsFromSim(simulation, decompileBrain(brain));
      const results = evaluateObjectives(challenge.objectives ?? [], metrics);

      expect(metrics.domain.failed, `${id} route remains clean`).toBe(0);
      expect(challengePassed(results), `${id} must enforce its cost claim`).toBe(
        false,
      );
    }
  });

  it("terminates as stuck when the brain never routes (safety net)", () => {
    const s = sim(
      {
        providers: [{ id: "A", name: "A", fee: 0.1, successRate: 100, latency: 200, online: true }],
        transactions: [{ id: "t1", amount: 100 }],
      },
      holdBrain,
    );
    const domain = run(s);
    expect(s.status).toBe("stuck");
    expect(domain.lost).toBe(1);
    expect(domain.succeeded).toBe(0);
  });

  it("does not treat holding every queued payment until timeout as success", () => {
    const s = sim(
      {
        processingMode: "queued",
        timeoutPenalty: 25,
        queuePenaltyPerTick: 1,
        providers: [
          {
            id: "A",
            name: "A",
            fee: 0.1,
            successRate: 100,
            latency: 1000,
            online: true,
            concurrentCapacity: 1,
          },
        ],
        transactions: [
          { id: "t1", amount: 100, deadlineTicks: 3 },
          { id: "t2", amount: 200, deadlineTicks: 4 },
        ],
      },
      holdBrain,
    );

    const domain = run(s);
    const runtime = financeRuntime(s.world);

    expect(s.status).toBe("stuck");
    expect(domain.allProcessed).toBe(true);
    expect(domain.succeeded).toBe(0);
    expect(domain.lost).toBe(2);
    expect(financeScore(s.world)).toBeGreaterThan(0);
    expect(runtime?.lastDecision).toMatchObject({
      action: "hold",
      outcome: "held",
    });
  });

  it("rejects the hold-only exploit in Peak Hour Payment Switch", () => {
    const challenge = findChallenge("finance-peak-hour-switch");
    const s = new Simulation(findWorld(challenge.worldKey).source, holdBrain);

    run(s, 1000);
    const metrics = metricsFromSim(s, decompileBrain(holdBrain));
    const results = evaluateObjectives(challenge.objectives ?? [], metrics);

    expect(s.status).toBe("stuck");
    expect(metrics.domain.succeeded).toBe(0);
    expect(metrics.domain.timedOut).toBe(96);
    expect(challengePassed(results)).toBe(false);
  });
});
