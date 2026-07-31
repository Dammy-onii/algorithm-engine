import type { BrainSource } from "@/lib/engine/simulation";
import {
  evaluateParkingScenario,
  summarizeParkingSubmission,
} from "@/lib/interview/evaluation/scenarioEvaluation";
import type { InterviewSubmissionReport } from "@/lib/interview/types";
import { parkingInterviewSuite } from "./parkingSuites";
import { assertInterviewSubmissionBudget } from "./submissionBudget";

export { evaluateParkingScenario, summarizeParkingSubmission };

export function evaluateParkingSubmission(
  suiteId: string,
  brain: BrainSource,
  passingScore: number,
): InterviewSubmissionReport {
  assertInterviewSubmissionBudget(brain);
  const suite = parkingInterviewSuite(suiteId);
  if (!suite) {
    throw new Error(`Unknown Parking interview suite '${suiteId}'.`);
  }
  return summarizeParkingSubmission(
    suiteId,
    suite.map((scenario) => evaluateParkingScenario(scenario, brain)),
    passingScore,
  );
}
