import type { AgentController } from "@/lib/engine/controller";
import type { BrainSource, WorldSource } from "@/lib/engine/simulation";
import { Simulation } from "@/lib/engine/simulation";
import type { EntitiesData, WorldData } from "@/lib/engine/types";
import {
  countByStatus,
  financeRuntime,
  financeScore,
  processedCount,
} from "@/lib/engine/worlds/finance";
import {
  departedVehicles,
  parkingRuntime,
  parkingScore,
  resolvedParkingVehicles,
} from "@/lib/engine/worlds/parking";
import type {
  FinanceEvaluationScenario,
  ParkingEvaluationScenario,
} from "@/lib/interview/demoTypes";
import type {
  InterviewScenarioResult,
  InterviewSubmissionReport,
} from "@/lib/interview/types";

const EMPTY_ENTITIES: EntitiesData = { entities: [] };

function worldSource(
  name: string,
  kind: "finance" | "parking",
  domainConfig: unknown,
): WorldSource {
  return {
    world: {
      name,
      kind,
      width: 1,
      height: 1,
      tiles: [[2]],
      start: { x: 0, y: 0 },
      goal: { x: 0, y: 0 },
      [kind]: domainConfig,
    } as WorldData,
    entities: EMPTY_ENTITIES,
  };
}

export function evaluateFinanceScenario(
  scenario: FinanceEvaluationScenario,
  brain: BrainSource,
  controller?: AgentController,
): InterviewScenarioResult {
  const simulation = new Simulation(
    worldSource(
      `Interview case: ${scenario.label}`,
      "finance",
      scenario.config,
    ),
    brain,
    { maxTicks: 12_000, controller },
  );
  while (!simulation.isDone) simulation.tick();

  const runtime = financeRuntime(simulation.world)!;
  const total = runtime.transactions.length;
  const succeeded = countByStatus(simulation.world, "succeeded");
  const completed = processedCount(simulation.world);
  const successRatio = total > 0 ? succeeded / total : 0;
  const penaltyScore = financeScore(simulation.world);

  const completionPoints = (completed / total) * 15;
  const successPoints = Math.min(
    25,
    (successRatio / scenario.minimumSuccessRatio) * 25,
  );
  const timeoutPoints =
    20 *
    Math.max(
      0,
      1 - runtime.timedOut / Math.max(1, scenario.maxTimeouts + 1),
    );
  const priorityPoints =
    15 *
    Math.max(
      0,
      1 -
        runtime.priorityFailures /
          Math.max(1, scenario.maxPriorityFailures + 1),
    );
  const overloadPoints =
    10 *
    Math.max(
      0,
      1 -
        runtime.overloadRejects /
          Math.max(1, scenario.maxOverloadRejects + 1),
    );
  const efficiencyPoints =
    15 *
    Math.max(
      0,
      1 -
        Math.max(0, penaltyScore - scenario.scoreBudget) /
          scenario.scoreBudget,
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
  if (completed < total) {
    diagnostics.push("The solution did not finalize the complete stream.");
  }
  if (successRatio < scenario.minimumSuccessRatio) {
    diagnostics.push(
      "Successful completion fell below the scenario service level.",
    );
  }
  if (runtime.timedOut > scenario.maxTimeouts) {
    diagnostics.push("Too many payments expired while waiting or processing.");
  }
  if (runtime.priorityFailures > scenario.maxPriorityFailures) {
    diagnostics.push("Urgent-payment protection failed under pressure.");
  }
  if (runtime.overloadRejects > scenario.maxOverloadRejects) {
    diagnostics.push("The solution routed into exhausted provider capacity.");
  }
  if (penaltyScore > scenario.scoreBudget) {
    diagnostics.push(
      "Combined cost, failure, timeout, overload, and queue penalties were excessive.",
    );
  }
  if (diagnostics.length === 0) {
    diagnostics.push("The solution remained within every scenario guardrail.");
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

export function summarizeFinanceSubmission(
  suiteId: string,
  scenarios: InterviewScenarioResult[],
  passingScore: number,
): InterviewSubmissionReport {
  return summarizeSubmission(suiteId, scenarios, passingScore);
}

export function evaluateParkingScenario(
  scenario: ParkingEvaluationScenario,
  brain: BrainSource,
  controller?: AgentController,
): InterviewScenarioResult {
  const simulation = new Simulation(
    worldSource(
      `Interview case: ${scenario.label}`,
      "parking",
      scenario.config,
    ),
    brain,
    { maxTicks: 20_000, controller },
  );
  while (!simulation.isDone) simulation.tick();

  const runtime = parkingRuntime(simulation.world)!;
  const total = runtime.vehicles.length;
  const completed = resolvedParkingVehicles(simulation.world).length;
  const succeeded = departedVehicles(simulation.world).length;
  const departureRatio = total > 0 ? succeeded / total : 0;
  const penaltyScore = parkingScore(simulation.world);

  const completionPoints = (completed / total) * 15;
  const departurePoints = Math.min(
    25,
    (departureRatio / scenario.minimumDepartureRatio) * 25,
  );
  const safetyPoints =
    runtime.hardViolations <= scenario.maxHardViolations ? 20 : 0;
  const patiencePoints =
    15 *
    Math.max(
      0,
      1 - runtime.abandoned / Math.max(1, scenario.maxAbandoned + 1),
    );
  const recoveryPoints =
    10 *
    Math.max(
      0,
      1 -
        runtime.reassignments /
          Math.max(1, scenario.maxReassignments + 1),
    );
  const efficiencyPoints =
    15 *
    Math.max(
      0,
      1 -
        Math.max(0, penaltyScore - scenario.scoreBudget) /
          Math.max(1, scenario.scoreBudget),
    );
  const score = Math.round(
    Math.min(
      100,
      completionPoints +
        departurePoints +
        safetyPoints +
        patiencePoints +
        recoveryPoints +
        efficiencyPoints,
    ),
  );

  const diagnostics: string[] = [];
  if (completed < total) {
    diagnostics.push(
      "The controller did not resolve the complete vehicle stream.",
    );
  }
  if (departureRatio < scenario.minimumDepartureRatio) {
    diagnostics.push(
      "Successful departures fell below the scenario service level.",
    );
  }
  if (runtime.hardViolations > scenario.maxHardViolations) {
    diagnostics.push("A hard allocation constraint was violated.");
  }
  if (runtime.abandoned > scenario.maxAbandoned) {
    diagnostics.push("Too many vehicles exhausted their entrance patience.");
  }
  if (runtime.reassignments > scenario.maxReassignments) {
    diagnostics.push(
      "Closure handling caused excessive inbound rerouting.",
    );
  }
  if (runtime.congestionTicks > scenario.maxCongestionTicks) {
    diagnostics.push("The shared lane remained saturated for too long.");
  }
  if (penaltyScore > scenario.scoreBudget) {
    diagnostics.push(
      "Combined waiting, abandonment, congestion, and service penalties were excessive.",
    );
  }
  if (diagnostics.length === 0) {
    diagnostics.push("The controller remained within every scenario guardrail.");
  }

  const passed =
    completed === total &&
    departureRatio >= scenario.minimumDepartureRatio &&
    runtime.hardViolations <= scenario.maxHardViolations &&
    runtime.abandoned <= scenario.maxAbandoned &&
    runtime.reassignments <= scenario.maxReassignments &&
    runtime.congestionTicks <= scenario.maxCongestionTicks &&
    penaltyScore <= scenario.scoreBudget;
  const guardrails = [
    {
      label: "Resolve stream",
      passed: completed === total,
      actual: `${completed}/${total}`,
      required: `${total}/${total}`,
    },
    {
      label: "Departure ratio",
      passed: departureRatio >= scenario.minimumDepartureRatio,
      actual: `${(departureRatio * 100).toFixed(2)}%`,
      required: `≥ ${(scenario.minimumDepartureRatio * 100).toFixed(2)}%`,
    },
    {
      label: "Hard violations",
      passed: runtime.hardViolations <= scenario.maxHardViolations,
      actual: String(runtime.hardViolations),
      required: `≤ ${scenario.maxHardViolations}`,
    },
    {
      label: "Abandoned vehicles",
      passed: runtime.abandoned <= scenario.maxAbandoned,
      actual: String(runtime.abandoned),
      required: `≤ ${scenario.maxAbandoned}`,
    },
    {
      label: "Reassignments",
      passed: runtime.reassignments <= scenario.maxReassignments,
      actual: String(runtime.reassignments),
      required: `≤ ${scenario.maxReassignments}`,
    },
    {
      label: "Congestion ticks",
      passed: runtime.congestionTicks <= scenario.maxCongestionTicks,
      actual: String(runtime.congestionTicks),
      required: `≤ ${scenario.maxCongestionTicks}`,
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
    penaltyScore: Number(penaltyScore.toFixed(2)),
    metrics: {
      departures: `${succeeded}/${total}`,
      abandoned: runtime.abandoned,
      "hard violations": runtime.hardViolations,
      "preference misses": runtime.preferenceViolations,
      reroutes: runtime.reassignments,
      "congestion ticks": runtime.congestionTicks,
      penalty: Number(penaltyScore.toFixed(2)),
    },
    guardrails,
    diagnostics,
  };
}

export function summarizeParkingSubmission(
  suiteId: string,
  scenarios: InterviewScenarioResult[],
  passingScore: number,
): InterviewSubmissionReport {
  return summarizeSubmission(suiteId, scenarios, passingScore);
}

function summarizeSubmission(
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
  const scenariosPassed = scenarios.filter(
    (scenario) => scenario.passed,
  ).length;

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
