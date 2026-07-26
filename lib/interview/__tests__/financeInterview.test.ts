import { describe, expect, it } from "vitest";

import type { BrainSource } from "@/lib/engine/simulation";
import { Simulation } from "@/lib/engine/simulation";
import { evaluateFinanceSubmission } from "@/lib/interview/server/evaluateFinanceSubmission";
import { findChallenge } from "@/content/challenges";
import { findWorld } from "@/lib/content/datasets";
import { decompileBrain } from "@/lib/authoring/brainDecompiler";
import {
  challengePassed,
  evaluateObjectives,
  metricsFromSim,
} from "@/lib/authoring/objectives";
import { POST as submitInterview } from "@/app/api/interview/submit/route";
import type { InterviewStreamEvent } from "@/lib/interview/types";

const functions = {
  functions: [
    { id: "route-a", action: "routeToA" },
    { id: "route-b", action: "routeToB" },
    { id: "route-c", action: "routeToC" },
    { id: "hold", action: "hold" },
    { id: "decline", action: "decline" },
  ],
};

const shell = {
  goals: { goals: [{ id: "route", priority: 1 }] },
  states: { initial: "operate", states: [{ id: "operate" }] },
  functions,
  memory: {},
};

const brittleBrain: BrainSource = {
  ...shell,
  rules: {
    rules: [
      { id: "always-b", when: "onlineB", do: "route-b" },
      { id: "wait", when: "always", do: "hold" },
    ],
  },
};

/**
 * A generic policy used as a regression oracle, not exposed as challenge
 * content. It chooses from live facts and deliberately avoids the last failed
 * provider before applying urgency and expected-cost branches.
 */
const adaptiveBrain: BrainSource = {
  ...shell,
  rules: {
    rules: [
      {
        id: "retry-after-a-via-b",
        when: "retryCount > 0 && lastProviderA && canRouteB && (!canRouteC || healthScoreB >= healthScoreC)",
        do: "route-b",
      },
      {
        id: "retry-after-a-via-c",
        when: "retryCount > 0 && lastProviderA && canRouteC",
        do: "route-c",
      },
      {
        id: "retry-after-b-via-a",
        when: "retryCount > 0 && lastProviderB && canRouteA && (!canRouteC || healthScoreA >= healthScoreC)",
        do: "route-a",
      },
      {
        id: "retry-after-b-via-c",
        when: "retryCount > 0 && lastProviderB && canRouteC",
        do: "route-c",
      },
      {
        id: "retry-after-c-via-b",
        when: "retryCount > 0 && lastProviderC && canRouteB && (!canRouteA || healthScoreB >= healthScoreA)",
        do: "route-b",
      },
      {
        id: "retry-after-c-via-a",
        when: "retryCount > 0 && lastProviderC && canRouteA",
        do: "route-a",
      },
      {
        id: "urgent-a",
        when: "(isPriority || isHighValue || deadlineRemaining <= 5) && canRouteA && (!canRouteB || currentLatencyA <= currentLatencyB) && (!canRouteC || currentLatencyA <= currentLatencyC)",
        do: "route-a",
      },
      {
        id: "urgent-b",
        when: "(isPriority || isHighValue || deadlineRemaining <= 5) && canRouteB && (!canRouteA || currentLatencyB < currentLatencyA) && (!canRouteC || currentLatencyB <= currentLatencyC)",
        do: "route-b",
      },
      {
        id: "urgent-c",
        when: "(isPriority || isHighValue || deadlineRemaining <= 5) && canRouteC",
        do: "route-c",
      },
      {
        id: "value-a",
        when: "canRouteA && (!canRouteB || expectedCostA <= expectedCostB) && (!canRouteC || expectedCostA <= expectedCostC)",
        do: "route-a",
      },
      {
        id: "value-b",
        when: "canRouteB && (!canRouteA || expectedCostB < expectedCostA) && (!canRouteC || expectedCostB <= expectedCostC)",
        do: "route-b",
      },
      {
        id: "value-c",
        when: "canRouteC",
        do: "route-c",
      },
      { id: "wait", when: "always", do: "hold" },
    ],
  },
};

describe("finance interview evaluation", () => {
  it("keeps hidden fixtures server-shaped and rejects a memorized provider", () => {
    const report = evaluateFinanceSubmission(
      "intelligent-routing-v1",
      brittleBrain,
      70,
    );

    expect(report.scenarioCount).toBe(6);
    expect(report.scenariosPassed).toBeLessThan(report.scenarioCount);
    expect(report.passed).toBe(false);
  });

  it("streams hidden cases only after an explicit submission request", async () => {
    const response = await submitInterview(
      new Request("http://localhost/api/interview/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: "finance-interview-routing",
          brain: brittleBrain,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    const events = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as InterviewStreamEvent);
    expect(events[0]?.type).toBe("suite-start");
    expect(events.filter((event) => event.type === "scenario-start")).toHaveLength(6);
    expect(events.filter((event) => event.type === "scenario-result")).toHaveLength(6);
    expect(events.at(-1)?.type).toBe("suite-complete");
  });

  it("runs an adaptive policy across every adversarial production case", () => {
    const report = evaluateFinanceSubmission(
      "production-orchestrator-v1",
      adaptiveBrain,
      75,
    );

    expect(report.overallScore).toBeGreaterThanOrEqual(75);
    expect(
      report.scenarios
        .filter((scenario) => !scenario.passed)
        .map((scenario) => ({
          id: scenario.id,
          score: scenario.score,
          timedOut: scenario.timedOut,
          priorityFailures: scenario.priorityFailures,
          overloadRejects: scenario.overloadRejects,
          penaltyScore: scenario.penaltyScore,
          diagnostics: scenario.diagnostics,
        })),
    ).toEqual([]);
    expect(report.passed).toBe(true);
  });

  it("keeps every visible interview scenario achievable by a general policy", () => {
    for (const id of [
      "finance-interview-routing",
      "finance-peak-hour-switch",
      "finance-production-orchestrator",
    ]) {
      const challenge = findChallenge(id);
      const simulation = new Simulation(
        findWorld(challenge.worldKey).source,
        adaptiveBrain,
        { maxTicks: 12_000 },
      );
      while (!simulation.isDone) simulation.tick();
      const metrics = metricsFromSim(simulation, decompileBrain(adaptiveBrain));
      const objectives = evaluateObjectives(challenge.objectives ?? [], metrics);

      expect(simulation.status, `${id} should terminate successfully`).toBe("reached");
      expect(
        challengePassed(objectives),
        `${id}: ${objectives
          .filter((objective) => !objective.met)
          .map((objective) => objective.label)
          .join(", ")}`,
      ).toBe(true);
    }
  });
});
