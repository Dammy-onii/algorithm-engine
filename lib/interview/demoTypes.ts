import type { FinanceConfig } from "@/lib/engine/worlds/finance";
import type { ParkingConfig } from "@/lib/engine/worlds/parking";
import type { InterviewStreamEvent } from "@/lib/interview/types";

export interface FinanceEvaluationScenario {
  id: string;
  label: string;
  config: FinanceConfig;
  minimumSuccessRatio: number;
  maxTimeouts: number;
  maxPriorityFailures: number;
  maxOverloadRejects: number;
  scoreBudget: number;
}

export interface ParkingEvaluationScenario {
  id: string;
  label: string;
  config: ParkingConfig;
  minimumDepartureRatio: number;
  maxAbandoned: number;
  maxHardViolations: number;
  maxReassignments: number;
  maxCongestionTicks: number;
  scoreBudget: number;
}

interface DemoSuiteBase {
  mode: "browser-demo";
  suiteId: string;
  passingScore: number;
}

export type InterviewDemoSuite =
  | (DemoSuiteBase & {
      pack: "finance";
      scenarios: FinanceEvaluationScenario[];
    })
  | (DemoSuiteBase & {
      pack: "parking";
      scenarios: ParkingEvaluationScenario[];
    });

export interface InterviewDemoWorkerRequest {
  source: string;
  suite: InterviewDemoSuite;
}

export type InterviewDemoWorkerEvent = InterviewStreamEvent;
