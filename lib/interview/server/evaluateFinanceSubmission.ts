import type { BrainSource, WorldSource } from "@/lib/engine/simulation";
import { Simulation } from "@/lib/engine/simulation";
import type { EntitiesData, WorldData } from "@/lib/engine/types";
import {
  countByStatus,
  financeRuntime,
  financeScore,
  processedCount,
} from "@/lib/engine/worlds/finance";
import type {
  InterviewScenarioResult,
  InterviewSubmissionReport,
} from "@/lib/interview/types";
import { financeInterviewSuite } from "./financeSuites";
import { assertInterviewSubmissionBudget } from "./submissionBudget";

const EMPTY_ENTITIES: EntitiesData = { entities: [] };

function worldSource(name: string, finance: unknown): WorldSource {
  return {
    world: {
      name,
      kind: "finance",
      width: 1,
      height: 1,
      tiles: [[2]],
      start: { x: 0, y: 0 },
      goal: { x: 0, y: 0 },
      finance,
    } as WorldData,
    entities: EMPTY_ENTITIES,
  };
}

export function evaluateFinanceScenario(
  scenario: NonNullable<ReturnType<typeof financeInterviewSuite>>[number],
  brain: BrainSource,
): InterviewScenarioResult {
  const simulation = new Simulation(
    worldSource(`Hidden interview case: ${scenario.label}`, scenario.config),
    brain,
    { maxTicks: 12_000 },
  );
  while (!simulation.isDone) simulation.tick();

  const runtime = financeRuntime(simulation.world)!;
  const total = runtime.transactions.length;
  const succeeded = countByStatus(simulation.world, "succeeded");
  const completed = processedCount(simulation.world);
  const successRatio = total > 0 ? succeeded / total : 0;
  const penaltyScore = financeScore(simulation.world);

  const completionPoints = (completed / total) * 15;
  const successPoints = Math.min(25, (successRatio / scenario.minimumSuccessRatio) * 25);
  const timeoutPoints = 20 * Math.max(0, 1 - runtime.timedOut / Math.max(1, scenario.maxTimeouts + 1));
  const priorityPoints = 15 * Math.max(
    0,
    1 - runtime.priorityFailures / Math.max(1, scenario.maxPriorityFailures + 1),
  );
  const overloadPoints = 10 * Math.max(
    0,
    1 - runtime.overloadRejects / Math.max(1, scenario.maxOverloadRejects + 1),
  );
  const efficiencyPoints = 15 * Math.max(
    0,
    1 - Math.max(0, penaltyScore - scenario.scoreBudget) / scenario.scoreBudget,
  );
  const score = Math.round(
    Math.min(
      100,
      completionPoints +
        successPoints +
        timeoutPoints +
        priorityPoints +
        overloadPoints +
        efficiencyPoints,
    ),
  );

  const diagnostics: string[] = [];
  if (completed < total) diagnostics.push("The policy did not finalize the complete stream.");
  if (successRatio < scenario.minimumSuccessRatio) {
    diagnostics.push("Successful completion fell below the scenario service level.");
  }
  if (runtime.timedOut > scenario.maxTimeouts) {
    diagnostics.push("Too many payments expired while waiting or processing.");
  }
  if (runtime.priorityFailures > scenario.maxPriorityFailures) {
    diagnostics.push("Urgent-payment protection failed under pressure.");
  }
  if (runtime.overloadRejects > scenario.maxOverloadRejects) {
    diagnostics.push("The policy routed into exhausted provider capacity.");
  }
  if (penaltyScore > scenario.scoreBudget) {
    diagnostics.push("Combined cost, failure, timeout, overload, and queue penalties were excessive.");
  }
  if (diagnostics.length === 0) {
    diagnostics.push("The policy remained within every scenario guardrail.");
  }

  const passed =
    completed === total &&
    successRatio >= scenario.minimumSuccessRatio &&
    runtime.timedOut <= scenario.maxTimeouts &&
    runtime.priorityFailures <= scenario.maxPriorityFailures &&
    runtime.overloadRejects <= scenario.maxOverloadRejects &&
    penaltyScore <= scenario.scoreBudget;
  const guardrails = [
    {
      label: "Complete stream",
      passed: completed === total,
      actual: `${completed}/${total}`,
      required: `${total}/${total}`,
    },
    {
      label: "Success ratio",
      passed: successRatio >= scenario.minimumSuccessRatio,
      actual: `${(successRatio * 100).toFixed(2)}%`,
      required: `≥ ${(scenario.minimumSuccessRatio * 100).toFixed(2)}%`,
    },
    {
      label: "Timeouts",
      passed: runtime.timedOut <= scenario.maxTimeouts,
      actual: String(runtime.timedOut),
      required: `≤ ${scenario.maxTimeouts}`,
    },
    {
      label: "Priority failures",
      passed: runtime.priorityFailures <= scenario.maxPriorityFailures,
      actual: String(runtime.priorityFailures),
      required: `≤ ${scenario.maxPriorityFailures}`,
    },
    {
      label: "Overload rejects",
      passed: runtime.overloadRejects <= scenario.maxOverloadRejects,
      actual: String(runtime.overloadRejects),
      required: `≤ ${scenario.maxOverloadRejects}`,
    },
    {
      label: "Penalty budget",
      passed: penaltyScore <= scenario.scoreBudget,
      actual: penaltyScore.toFixed(2),
      required: `≤ ${scenario.scoreBudget.toFixed(2)}`,
    },
  ];

  return {
    id: scenario.id,
    label: scenario.label,
    passed,
    score,
    completed,
    total,
    succeeded,
    failedAttempts: runtime.failedAttempts,
    timedOut: runtime.timedOut,
    priorityFailures: runtime.priorityFailures,
    overloadRejects: runtime.overloadRejects,
    penaltyScore: Number(penaltyScore.toFixed(2)),
    metrics: {
      success: `${succeeded}/${total}`,
      timeouts: runtime.timedOut,
      "priority misses": runtime.priorityFailures,
      "failed attempts": runtime.failedAttempts,
      overload: runtime.overloadRejects,
      penalty: Number(penaltyScore.toFixed(2)),
    },
    guardrails,
    diagnostics,
  };
}

export function evaluateFinanceSubmission(
  suiteId: string,
  brain: BrainSource,
  passingScore: number,
): InterviewSubmissionReport {
  assertInterviewSubmissionBudget(brain);
  const suite = financeInterviewSuite(suiteId);
  if (!suite) throw new Error(`Unknown interview suite '${suiteId}'.`);

  const scenarios = suite.map((scenario) => evaluateFinanceScenario(scenario, brain));
  return summarizeFinanceSubmission(suiteId, scenarios, passingScore);
}

export function summarizeFinanceSubmission(
  suiteId: string,
  scenarios: InterviewScenarioResult[],
  passingScore: number,
): InterviewSubmissionReport {
  if (scenarios.length === 0) {
    throw new Error("An interview suite must contain at least one scenario.");
  }
  const overallScore = Math.round(
    scenarios.reduce((sum, scenario) => sum + scenario.score, 0) /
      scenarios.length,
  );
  const scenariosPassed = scenarios.filter((scenario) => scenario.passed).length;

  return {
    suiteId,
    passed:
      overallScore >= passingScore && scenariosPassed === scenarios.length,
    overallScore,
    passingScore,
    scenariosPassed,
    scenarioCount: scenarios.length,
    scenarios,
  };
}
