import type { BrainSource } from "@/lib/engine/simulation";
import {
  evaluateFinanceScenario,
  summarizeFinanceSubmission,
} from "@/lib/interview/evaluation/scenarioEvaluation";
import type { InterviewSubmissionReport } from "@/lib/interview/types";
import { financeInterviewSuite } from "./financeSuites";
import { assertInterviewSubmissionBudget } from "./submissionBudget";

export { evaluateFinanceScenario, summarizeFinanceSubmission };

export function evaluateFinanceSubmission(
  suiteId: string,
  brain: BrainSource,
  passingScore: number,
): InterviewSubmissionReport {
  assertInterviewSubmissionBudget(brain);
  const suite = financeInterviewSuite(suiteId);
  if (!suite) throw new Error(`Unknown interview suite '${suiteId}'.`);

  const scenarios = suite.map((scenario) =>
    evaluateFinanceScenario(scenario, brain),
  );
  return summarizeFinanceSubmission(suiteId, scenarios, passingScore);
}
