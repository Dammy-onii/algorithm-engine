import { describe, expect, it } from "vitest";

import { POST as loadDemoSuite } from "@/app/api/interview/demo-suite/route";
import { compileController } from "@/lib/authoring/controllerCompiler";
import type { BrainSource } from "@/lib/engine/simulation";
import type { InterviewDemoSuite } from "@/lib/interview/demoTypes";
import { evaluateFinanceScenario } from "@/lib/interview/evaluation/scenarioEvaluation";

const controllerBrain: BrainSource = {
  goals: { goals: [{ id: "controller", priority: 1 }] },
  states: { initial: "controller", states: [{ id: "controller" }] },
  rules: { rules: [] },
  functions: { functions: [{ id: "hold", action: "wait" }] },
  memory: {},
};

describe("Demo-mode Code Controller submission", () => {
  it("returns the selected suite only after an explicit POST", async () => {
    const response = await loadDemoSuite(
      new Request("http://localhost/api/interview/demo-suite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: "finance-peak-hour-switch" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const suite = (await response.json()) as InterviewDemoSuite;
    expect(suite.mode).toBe("browser-demo");
    expect(suite.pack).toBe("finance");
    expect(suite.suiteId).toBe("peak-hour-switch-v1");
    expect(suite.scenarios).toHaveLength(8);
  });

  it("runs candidate JavaScript through the real Finance simulation contract", async () => {
    const response = await loadDemoSuite(
      new Request("http://localhost/api/interview/demo-suite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: "finance-interview-routing" }),
      }),
    );
    const suite = (await response.json()) as InterviewDemoSuite;
    if (suite.pack !== "finance") {
      throw new Error("Expected a Finance demo suite.");
    }

    const controller = compileController(`
      class CandidateRouter {
        decide(observation) {
          const facts = observation.domain;
          if (!facts.hasTransaction) return "hold";
          if (facts.canRouteB) return "routeToB";
          if (facts.canRouteC) return "routeToC";
          if (facts.canRouteA) return "routeToA";
          return facts.deadlineRemaining > 1 ? "hold" : "decline";
        }
      }
      return new CandidateRouter();
    `);
    const result = evaluateFinanceScenario(
      suite.scenarios[0],
      controllerBrain,
      controller,
    );

    expect(result.total).toBeGreaterThan(0);
    expect(result.succeeded).toBeGreaterThan(0);
    expect(result.completed).toBe(result.total);
  });

  it("rejects a challenge without a demo interview suite", async () => {
    const response = await loadDemoSuite(
      new Request("http://localhost/api/interview/demo-suite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: "maze-straight-run" }),
      }),
    );
    expect(response.status).toBe(404);
  });
});
