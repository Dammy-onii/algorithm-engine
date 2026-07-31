import { compileController } from "@/lib/authoring/controllerCompiler";
import type { BrainSource } from "@/lib/engine/simulation";
import type {
  InterviewDemoWorkerEvent,
  InterviewDemoWorkerRequest,
} from "@/lib/interview/demoTypes";
import {
  evaluateFinanceScenario,
  evaluateParkingScenario,
  summarizeFinanceSubmission,
  summarizeParkingSubmission,
} from "@/lib/interview/evaluation/scenarioEvaluation";

const CONTROLLER_BRAIN: BrainSource = {
  goals: { goals: [{ id: "controller", priority: 1 }] },
  states: { initial: "controller", states: [{ id: "controller" }] },
  rules: { rules: [] },
  functions: { functions: [{ id: "hold", action: "wait" }] },
  memory: {},
};

const workerScope = globalThis as unknown as {
  onmessage:
    | ((event: MessageEvent<InterviewDemoWorkerRequest>) => void)
    | null;
  postMessage: (event: InterviewDemoWorkerEvent) => void;
};

workerScope.onmessage = ({ data }) => {
  const { source, suite } = data;

  try {
    workerScope.postMessage({
      type: "suite-start",
      suiteId: suite.suiteId,
      scenarioCount: suite.scenarios.length,
      passingScore: suite.passingScore,
    });

    const results =
      suite.pack === "finance"
        ? suite.scenarios.map((scenario, index) => {
            workerScope.postMessage({
              type: "scenario-start",
              index,
              scenarioCount: suite.scenarios.length,
              label: scenario.label,
            });
            const result = evaluateFinanceScenario(
              scenario,
              CONTROLLER_BRAIN,
              compileController(source),
            );
            workerScope.postMessage({
              type: "scenario-result",
              index,
              scenario: result,
            });
            return result;
          })
        : suite.scenarios.map((scenario, index) => {
            workerScope.postMessage({
              type: "scenario-start",
              index,
              scenarioCount: suite.scenarios.length,
              label: scenario.label,
            });
            const result = evaluateParkingScenario(
              scenario,
              CONTROLLER_BRAIN,
              compileController(source),
            );
            workerScope.postMessage({
              type: "scenario-result",
              index,
              scenario: result,
            });
            return result;
          });

    const report =
      suite.pack === "finance"
        ? summarizeFinanceSubmission(
            suite.suiteId,
            results,
            suite.passingScore,
          )
        : summarizeParkingSubmission(
            suite.suiteId,
            results,
            suite.passingScore,
          );
    workerScope.postMessage({ type: "suite-complete", report });
  } catch (error) {
    workerScope.postMessage({
      type: "error",
      error:
        error instanceof Error
          ? error.message
          : "The Code Controller could not be evaluated.",
    });
  }
};
