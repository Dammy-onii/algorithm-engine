import type { BrainSource, WorldSource } from "@/lib/engine/simulation";
import { Simulation } from "@/lib/engine/simulation";
import type { EntitiesData, WorldData } from "@/lib/engine/types";
import {
  departedVehicles,
  parkingRuntime,
  parkingScore,
  resolvedParkingVehicles,
} from "@/lib/engine/worlds/parking";
import type {
  InterviewScenarioResult,
  InterviewSubmissionReport,
} from "@/lib/interview/types";
import {
  parkingInterviewSuite,
  type ParkingInterviewScenario,
} from "./parkingSuites";
import { assertInterviewSubmissionBudget } from "./submissionBudget";

const EMPTY_ENTITIES: EntitiesData = { entities: [] };

function worldSource(name: string, parking: unknown): WorldSource {
  return {
    world: {
      name,
      kind: "parking",
      width: 1,
      height: 1,
      tiles: [[2]],
      start: { x: 0, y: 0 },
      goal: { x: 0, y: 0 },
      parking,
    } as WorldData,
    entities: EMPTY_ENTITIES,
  };
}

export function evaluateParkingScenario(
  scenario: ParkingInterviewScenario,
  brain: BrainSource,
): InterviewScenarioResult {
  const simulation = new Simulation(
    worldSource(`Hidden parking case: ${scenario.label}`, scenario.config),
    brain,
    { maxTicks: 20_000 },
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
      1 - runtime.reassignments / Math.max(1, scenario.maxReassignments + 1),
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
  if (completed < total) diagnostics.push("The controller did not resolve the complete vehicle stream.");
  if (departureRatio < scenario.minimumDepartureRatio) {
    diagnostics.push("Successful departures fell below the scenario service level.");
  }
  if (runtime.hardViolations > scenario.maxHardViolations) {
    diagnostics.push("A hard allocation constraint was violated.");
  }
  if (runtime.abandoned > scenario.maxAbandoned) {
    diagnostics.push("Too many vehicles exhausted their entrance patience.");
  }
  if (runtime.reassignments > scenario.maxReassignments) {
    diagnostics.push("Closure handling caused excessive inbound rerouting.");
  }
  if (runtime.congestionTicks > scenario.maxCongestionTicks) {
    diagnostics.push("The shared lane remained saturated for too long.");
  }
  if (penaltyScore > scenario.scoreBudget) {
    diagnostics.push("Combined waiting, abandonment, congestion, and service penalties were excessive.");
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
    passed: overallScore >= passingScore && scenariosPassed === scenarios.length,
    overallScore,
    passingScore,
    scenariosPassed,
    scenarioCount: scenarios.length,
    scenarios,
  };
}

export function evaluateParkingSubmission(
  suiteId: string,
  brain: BrainSource,
  passingScore: number,
): InterviewSubmissionReport {
  assertInterviewSubmissionBudget(brain);
  const suite = parkingInterviewSuite(suiteId);
  if (!suite) throw new Error(`Unknown Parking interview suite '${suiteId}'.`);
  return summarizeParkingSubmission(
    suiteId,
    suite.map((scenario) => evaluateParkingScenario(scenario, brain)),
    passingScore,
  );
}
