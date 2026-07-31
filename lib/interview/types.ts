export interface InterviewGuardrailResult {
  label: string;
  passed: boolean;
  actual: string;
  required: string;
}

export interface InterviewScenarioResult {
  id: string;
  label: string;
  passed: boolean;
  score: number;
  completed: number;
  total: number;
  succeeded: number;
  failedAttempts?: number;
  timedOut?: number;
  priorityFailures?: number;
  overloadRejects?: number;
  penaltyScore: number;
  metrics: Record<string, number | string>;
  guardrails: InterviewGuardrailResult[];
  diagnostics: string[];
}

export interface InterviewSubmissionReport {
  suiteId: string;
  passed: boolean;
  overallScore: number;
  passingScore: number;
  scenariosPassed: number;
  scenarioCount: number;
  scenarios: InterviewScenarioResult[];
}

export type InterviewStreamEvent =
  | {
      type: "suite-start";
      suiteId: string;
      scenarioCount: number;
      passingScore: number;
    }
  | {
      type: "scenario-start";
      index: number;
      scenarioCount: number;
      label: string;
    }
  | {
      type: "scenario-result";
      index: number;
      scenario: InterviewScenarioResult;
    }
  | {
      type: "suite-complete";
      report: InterviewSubmissionReport;
    }
  | {
      type: "error";
      error: string;
    };
