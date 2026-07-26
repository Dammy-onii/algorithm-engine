import { describe, expect, it } from "vitest";

import { POST as submitInterview } from "@/app/api/interview/submit/route";
import { findChallenge } from "@/content/challenges";
import { challengePassed, evaluateObjectives, metricsFromSim } from "@/lib/authoring/objectives";
import { decompileBrain } from "@/lib/authoring/brainDecompiler";
import { findWorld } from "@/lib/content/datasets";
import type { BrainSource } from "@/lib/engine/simulation";
import { Simulation } from "@/lib/engine/simulation";
import { evaluateParkingSubmission } from "@/lib/interview/server/evaluateParkingSubmission";
import type { InterviewStreamEvent } from "@/lib/interview/types";

const functions = {
  functions: [
    { id: "standard", action: "parkStandard" },
    { id: "charging", action: "parkCharging" },
    { id: "large", action: "parkLarge" },
    { id: "premium", action: "parkPremium" },
    { id: "accessible", action: "parkAccessible" },
    { id: "reserved", action: "parkReserved" },
    { id: "release", action: "releaseVehicle" },
    { id: "hold", action: "wait" },
  ],
};

const shell = {
  goals: { goals: [{ id: "operate", priority: 1 }] },
  states: { initial: "operate", states: [{ id: "operate" }] },
  functions,
  memory: {},
};

const brittleBrain: BrainSource = {
  ...shell,
  rules: {
    rules: [
      { id: "standard-only", when: "hasWaitingVehicle", do: "standard" },
      { id: "release-late", when: "hasExitRequest", do: "release" },
      { id: "idle", when: "always", do: "hold" },
    ],
  },
};

const adaptiveBrain: BrainSource = {
  ...shell,
  rules: {
    rules: [
      { id: "release-pressure", when: "exitQueueLength >= 3 && exitGateAvailable", do: "release" },
      { id: "reserved", when: "carReserved && reservedAvailable", do: "reserved" },
      { id: "accessible", when: "carAccessible && accessibleAvailable", do: "accessible" },
      { id: "large", when: "carLarge && largeAvailable", do: "large" },
      { id: "vip", when: "carVIP && premiumAvailable", do: "premium" },
      { id: "electric", when: "carElectric && chargingAvailable", do: "charging" },
      { id: "standard", when: "hasWaitingVehicle && !carReserved && !carAccessible && !carLarge && standardAvailable", do: "standard" },
      { id: "release", when: "hasExitRequest && exitGateAvailable", do: "release" },
      { id: "reserved-wait", when: "carReserved", do: "hold" },
      { id: "accessible-wait", when: "carAccessible", do: "hold" },
      { id: "large-wait", when: "carLarge", do: "hold" },
      { id: "idle", when: "always", do: "hold" },
    ],
  },
};

describe("parking interview evaluation", () => {
  it("rejects a standard-only controller across the hidden tutorial suite", () => {
    const report = evaluateParkingSubmission(
      "smart-parking-controller-v1",
      brittleBrain,
      70,
    );
    expect(report.scenarioCount).toBe(6);
    expect(report.passed).toBe(false);
    expect(report.scenariosPassed).toBeLessThan(report.scenarioCount);
  });

  it("streams Parking fixtures only after explicit Submit", async () => {
    const response = await submitInterview(
      new Request("http://localhost/api/interview/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: "parking-interview-controller",
          brain: adaptiveBrain,
        }),
      }),
    );
    expect(response.status).toBe(200);
    const events = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as InterviewStreamEvent);
    expect(events.filter((event) => event.type === "scenario-start")).toHaveLength(6);
    expect(events.filter((event) => event.type === "scenario-result")).toHaveLength(6);
    expect(events.at(-1)?.type).toBe("suite-complete");
  });

  it("runs an adaptive controller across the production hidden suite", () => {
    const report = evaluateParkingSubmission(
      "production-parking-orchestrator-v1",
      adaptiveBrain,
      75,
    );
    expect(
      report.scenarios
        .filter((scenario) => !scenario.passed)
        .map((scenario) => ({
          id: scenario.id,
          score: scenario.score,
          metrics: scenario.metrics,
          diagnostics: scenario.diagnostics,
        })),
    ).toEqual([]);
    expect(report.overallScore).toBeGreaterThanOrEqual(75);
  });

  it("keeps all three visible Parking interview stages achievable", () => {
    for (const id of [
      "parking-interview-controller",
      "parking-interview-operations",
      "parking-interview-orchestrator",
    ]) {
      const challenge = findChallenge(id);
      const simulation = new Simulation(
        findWorld(challenge.worldKey).source,
        adaptiveBrain,
        { maxTicks: 20_000 },
      );
      while (!simulation.isDone) simulation.tick();
      const objectives = evaluateObjectives(
        challenge.objectives ?? [],
        metricsFromSim(simulation, decompileBrain(adaptiveBrain)),
      );
      expect(simulation.status, id).toBe("reached");
      expect(
        challengePassed(objectives),
        `${id}: ${objectives.filter((objective) => !objective.met).map((objective) => objective.label).join(", ")}; ${JSON.stringify(metricsFromSim(simulation, decompileBrain(adaptiveBrain)).domain)}`,
      ).toBe(true);
    }
  });
});
