/**
 * Server-side-only interview fixtures.
 *
 * Do not import this module from a Client Component. The route handler returns
 * labels, scores, and diagnostics only; provider schedules and transaction
 * distributions stay on the server.
 */

import type {
  FinanceConfig,
  FinanceProvider,
  FinanceTransactionBatch,
} from "@/lib/engine/worlds/finance";

export interface FinanceInterviewScenario {
  id: string;
  label: string;
  config: FinanceConfig;
  minimumSuccessRatio: number;
  maxTimeouts: number;
  maxPriorityFailures: number;
  maxOverloadRejects: number;
  scoreBudget: number;
}

interface ScenarioOptions {
  id: string;
  label: string;
  scale: number;
  seed: number;
  providers?: FinanceProvider[];
  batches?: FinanceTransactionBatch[];
  minimumSuccessRatio?: number;
  maxTimeouts?: number;
  maxPriorityFailures?: number;
  maxOverloadRejects?: number;
  scoreBudget?: number;
}

const baseProviders = (): FinanceProvider[] => [
  {
    id: "A",
    name: "Economy Rail",
    fee: 0.08,
    successRate: 96,
    latency: 1400,
    online: true,
    concurrentCapacity: 3,
    congestionLatencyPerItem: 650,
    accepts: ["consumer", "refund"],
    maxAmount: 10000,
  },
  {
    id: "B",
    name: "Assured Rail",
    fee: 0.28,
    successRate: 99.4,
    latency: 900,
    online: true,
    concurrentCapacity: 4,
    congestionLatencyPerItem: 250,
    accepts: [
      "consumer",
      "business",
      "international",
      "payroll",
      "settlement",
      "refund",
    ],
    maxAmount: 200000,
  },
  {
    id: "C",
    name: "Flexible Rail",
    fee: 0.16,
    successRate: 98,
    latency: 1900,
    online: true,
    concurrentCapacity: 3,
    congestionLatencyPerItem: 450,
    accepts: ["consumer", "business", "international", "settlement", "refund"],
    maxAmount: 60000,
  },
];

function traffic(prefix: string, count: number): FinanceTransactionBatch[] {
  return [
    {
      prefix,
      count,
      arrivalStart: 0,
      arrivalEvery: 1,
      amounts: [30, 90, 700, 5500, 22000, 80000],
      types: [
        "consumer",
        "refund",
        "consumer",
        "business",
        "international",
        "payroll",
      ],
      destinations: ["Bank X", "Bank Y", "Bank Z", "Bank Q"],
      priorityEvery: 8,
      priority: 3,
      deadlineTicks: 28,
      maxRetries: 2,
      customerImpact: 3,
    },
  ];
}

function scenario(options: ScenarioOptions): FinanceInterviewScenario {
  const count = Math.max(24, Math.round(48 * options.scale));
  return {
    id: options.id,
    label: options.label,
    config: {
      processingMode: "queued",
      tickDurationMs: 1000,
      seed: options.seed,
      failurePenalty: 10,
      timeoutPenalty: 18,
      priorityFailurePenalty: 35,
      overloadPenalty: 7,
      queuePenaltyPerTick: 0.012,
      retryBackoffTicks: 1,
      highValueThreshold: 15000,
      maxTicksPerTx: 8,
      providers: options.providers ?? baseProviders(),
      batches: options.batches ?? traffic(options.id, count),
    },
    minimumSuccessRatio: options.minimumSuccessRatio ?? 0.88,
    maxTimeouts: options.maxTimeouts ?? Math.ceil(count * 0.04),
    maxPriorityFailures:
      options.maxPriorityFailures ?? Math.ceil(count * 0.015),
    maxOverloadRejects:
      options.maxOverloadRejects ?? Math.ceil(count * 0.025),
    scoreBudget: options.scoreBudget ?? count * 1.1,
  };
}

const definitions: FinanceInterviewScenario[] = [
  scenario({
    id: "baseline-shifted",
    label: "Mixed traffic with shifted fees",
    scale: 1,
    seed: 201,
    providers: [
      { ...baseProviders()[0], fee: 0.22, successRate: 98.5 },
      { ...baseProviders()[1], fee: 0.12, successRate: 97.5 },
      { ...baseProviders()[2], fee: 0.18, successRate: 99 },
    ],
  }),
  scenario({
    id: "provider-collapse",
    label: "Primary-provider collapse and recovery",
    scale: 1.2,
    seed: 202,
    providers: baseProviders().map((provider) =>
      provider.id === "B"
        ? {
            ...provider,
            schedule: [
              { atTick: 18, online: false },
              { atTick: 36, online: true, successRate: 98 },
            ],
          }
        : provider,
    ),
  }),
  scenario({
    id: "congestion-cascade",
    label: "Latency spike and congestion cascade",
    scale: 1.4,
    seed: 203,
    providers: baseProviders().map((provider) =>
      provider.id === "A"
        ? {
            ...provider,
            concurrentCapacity: 2,
            congestionLatencyPerItem: 1800,
            schedule: [
              { atTick: 14, latency: 6000, successRate: 86 },
              { atTick: 42, latency: 1500, successRate: 97 },
            ],
          }
        : provider,
    ),
  }),
  scenario({
    id: "priority-surge",
    label: "Urgent payroll and high-value surge",
    scale: 1.25,
    seed: 204,
    batches: [
      ...traffic("regular", 36),
      {
        prefix: "urgent",
        count: 28,
        arrivalStart: 10,
        arrivalEvery: 1,
        amounts: [45000, 90000, 140000],
        types: ["payroll", "business", "settlement"],
        destinations: ["Bank P", "Bank Q"],
        priorityEvery: 1,
        priority: 3,
        deadlineTicks: 14,
        maxRetries: 1,
        customerImpact: 8,
      },
    ],
    maxTimeouts: 4,
    maxPriorityFailures: 1,
    scoreBudget: 110,
  }),
  scenario({
    id: "capacity-oscillation",
    label: "Oscillating provider capacity",
    scale: 1.4,
    seed: 205,
    providers: baseProviders().map((provider) => ({
      ...provider,
      schedule:
        provider.id === "A"
          ? [
              { atTick: 12, concurrentCapacity: 1 },
              { atTick: 25, concurrentCapacity: 4 },
              { atTick: 40, concurrentCapacity: 1 },
              { atTick: 55, concurrentCapacity: 3 },
            ]
          : provider.schedule,
    })),
  }),
  scenario({
    id: "compatibility-trap",
    label: "Type and amount compatibility trap",
    scale: 1,
    seed: 206,
    batches: [
      {
        prefix: "restricted",
        count: 54,
        arrivalEvery: 1,
        amounts: [120, 12000, 70000, 160000],
        types: ["refund", "international", "settlement", "payroll"],
        destinations: ["Bank X", "Bank R"],
        priorityEvery: 5,
        priority: 2,
        deadlineTicks: 25,
        maxRetries: 1,
      },
    ],
    maxOverloadRejects: 2,
  }),
  scenario({
    id: "deadline-pressure",
    label: "Short-deadline queue pressure",
    scale: 1.2,
    seed: 207,
    batches: [
      {
        ...traffic("deadline", 60)[0],
        deadlineTicks: 12,
        priorityEvery: 4,
      },
    ],
    maxTimeouts: 3,
    scoreBudget: 125,
  }),
  scenario({
    id: "adversarial-b",
    label: "Adversarial reversal of Provider B",
    scale: 1,
    seed: 208,
    providers: [
      { ...baseProviders()[0], successRate: 99.2, maxAmount: 200000, accepts: undefined },
      {
        ...baseProviders()[1],
        fee: 0.8,
        successRate: 82,
        latency: 4800,
        concurrentCapacity: 2,
      },
      { ...baseProviders()[2], fee: 0.11, successRate: 99, maxAmount: 200000, accepts: undefined },
    ],
  }),
  scenario({
    id: "fee-shock",
    label: "Mid-run fee and reliability shock",
    scale: 1.15,
    seed: 209,
    providers: baseProviders().map((provider) =>
      provider.id === "C"
        ? {
            ...provider,
            schedule: [
              { atTick: 20, fee: 0.65, successRate: 90 },
              { atTick: 44, fee: 0.14, successRate: 98.5 },
            ],
          }
        : provider,
    ),
  }),
  scenario({
    id: "retry-storm",
    label: "Retry storm after correlated failures",
    scale: 1.35,
    seed: 210,
    providers: baseProviders().map((provider) =>
      provider.id === "A"
        ? {
            ...provider,
            schedule: [
              { atTick: 15, successRate: 55 },
              { atTick: 38, online: false },
              { atTick: 50, online: true, successRate: 97 },
            ],
          }
        : provider,
    ),
    maxTimeouts: 4,
    scoreBudget: 145,
  }),
];

const suiteSizes: Record<string, number> = {
  "intelligent-routing-v1": 6,
  "peak-hour-switch-v1": 8,
  "production-orchestrator-v1": 10,
};

export function financeInterviewSuite(
  suiteId: string,
): FinanceInterviewScenario[] | undefined {
  const size = suiteSizes[suiteId];
  return size ? definitions.slice(0, size) : undefined;
}
