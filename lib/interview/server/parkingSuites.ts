/**
 * Server-only Parking interview fixtures.
 *
 * Hidden layouts, traffic mixes, and incident schedules are imported only by
 * the submission route and tests. Apply & Run never imports this module.
 */

import type {
  ParkingConfig,
  ParkingSpace,
  ParkingVehicleBatch,
} from "@/lib/engine/worlds/parking";
import type { ParkingEvaluationScenario } from "@/lib/interview/demoTypes";

export type ParkingInterviewScenario = ParkingEvaluationScenario;

function spaces(reservation = "hidden-reservation"): ParkingSpace[] {
  const kinds = [
    "standard", "standard", "standard", "charging",
    "large", "premium", "accessible", "reserved",
  ] as const;
  return ["north", "south"].flatMap((row, rowIndex) =>
    kinds.map((kind, order) => ({
      id: `${row === "north" ? "N" : "S"}${order + 1}`,
      kind,
      row: row as "north" | "south",
      order,
      distanceToExit: 16 - (rowIndex * 8 + order),
      reservedFor: kind === "reserved" ? reservation : undefined,
      zone: order < 3 ? "A" : order < 6 ? "B" : "C",
    })),
  );
}

function traffic(
  prefix: string,
  count: number,
  reservation = "hidden-reservation",
): ParkingVehicleBatch[] {
  return [{
    prefix,
    count,
    arrivalEvery: 2,
    durations: [7, 11, 16, 9, 13],
    vehicleTypes: [
      "standard", "electric", "large", "vip",
      "accessible", "standard", "reserved",
    ],
    priorityEvery: 8,
    priority: 4,
    patienceTicks: 140,
    reservation,
  }];
}

function baseConfig(
  count: number,
  overrides: Partial<ParkingConfig> = {},
): ParkingConfig {
  return {
    operationsMode: "realtime",
    spaces: spaces(),
    batches: traffic("hidden", count),
    entryTravelTicks: 2,
    exitTravelTicks: 2,
    laneCapacity: 3,
    exitGateCapacity: 1,
    congestionDelayPerMovement: 1,
    maxTicks: Math.max(500, count * 8),
    ...overrides,
  };
}

function scenario(
  id: string,
  label: string,
  config: ParkingConfig,
  limits: Partial<Omit<ParkingInterviewScenario, "id" | "label" | "config">> = {},
): ParkingInterviewScenario {
  const total = config.batches?.reduce((sum, batch) => sum + batch.count, 0) ??
    config.vehicles?.length ?? 1;
  return {
    id,
    label,
    config,
    minimumDepartureRatio: limits.minimumDepartureRatio ?? 0.94,
    maxAbandoned: limits.maxAbandoned ?? Math.ceil(total * 0.02),
    maxHardViolations: limits.maxHardViolations ?? 0,
    maxReassignments: limits.maxReassignments ?? Math.ceil(total * 0.03),
    maxCongestionTicks: limits.maxCongestionTicks ?? Math.ceil(total * 1.8),
    scoreBudget: limits.scoreBudget ?? total * 35,
  };
}

const definitions: ParkingInterviewScenario[] = [
  scenario("shifted-layout", "Changed category mix and bay ordering", baseConfig(52, {
    spaces: spaces().reverse().map((space, index) => ({
      ...space,
      distanceToExit: index + 1,
    })),
  })),
  scenario("arrival-burst", "Stadium arrival burst with continuing exits", baseConfig(84, {
    batches: [{
      ...traffic("burst", 84)[0],
      arrivalEvery: 1,
      patienceTicks: 160,
    }],
    laneCapacity: 4,
    exitGateCapacity: 2,
  }), { maxAbandoned: 3, scoreBudget: 3000 }),
  scenario("charging-crisis", "Charging outage during an EV surge", baseConfig(68, {
    spaces: spaces().map((space) =>
      space.kind === "charging"
        ? { ...space, schedule: [{ atTick: 24, closed: true }, { atTick: 62, closed: false }] }
        : space,
    ),
    batches: [{
      ...traffic("ev", 68)[0],
      vehicleTypes: ["electric", "electric", "standard", "vip", "large"],
      patienceTicks: 150,
    }],
  }), { maxReassignments: 3 }),
  scenario("gate-failure", "Exit-gate failure and backlog recovery", baseConfig(70, {
    exitGateCapacity: 2,
    facilitySchedule: [
      { atTick: 35, exitGateCapacity: 0 },
      { atTick: 58, exitGateCapacity: 2 },
    ],
  }), { maxCongestionTicks: 150 }),
  scenario("reservation-flood", "Late reservation flood", baseConfig(74, {
    batches: [
      traffic("regular", 42)[0],
      {
        ...traffic("reserved", 32)[0],
        arrivalStart: 35,
        arrivalEvery: 1,
        vehicleTypes: ["reserved", "reserved", "vip"],
        priorityEvery: 2,
        priority: 5,
        patienceTicks: 320,
      },
    ],
  }), { maxAbandoned: 3, scoreBudget: 3500 }),
  scenario("capacity-oscillation", "Repeated capacity closure and recovery", baseConfig(78, {
    spaces: spaces().map((space, index) =>
      index % 4 === 0
        ? {
            ...space,
            schedule: [
              { atTick: 28, closed: true },
              { atTick: 48, closed: false },
              { atTick: 72, closed: true },
              { atTick: 96, closed: false },
            ],
          }
        : space,
    ),
  }), { maxReassignments: 6 }),
  scenario("priority-conflict", "VIP, accessible, EV, and large priority conflict", baseConfig(86, {
    batches: [{
      ...traffic("priority", 86)[0],
      vehicleTypes: ["vip", "accessible", "electric", "large", "reserved", "standard"],
      priorityEvery: 3,
      priority: 5,
      patienceTicks: 140,
    }],
  }), { maxAbandoned: 4 }),
  scenario("lane-collapse", "Shared-lane congestion collapse and recovery", baseConfig(82, {
    laneCapacity: 4,
    facilitySchedule: [
      { atTick: 30, laneCapacity: 1 },
      { atTick: 62, laneCapacity: 4 },
    ],
  }), { maxCongestionTicks: 190 }),
  scenario("adversarial-fairness", "Adversarial priority stream and starvation pressure", baseConfig(110, {
    batches: [
      {
        ...traffic("ordinary", 60)[0],
        patienceTicks: 180,
      },
      {
        ...traffic("urgent", 50)[0],
        arrivalStart: 18,
        arrivalEvery: 1,
        priorityEvery: 1,
        priority: 5,
        vehicleTypes: ["vip", "reserved", "electric"],
        patienceTicks: 150,
      },
    ],
    laneCapacity: 4,
    exitGateCapacity: 2,
  }), {
    minimumDepartureRatio: 0.9,
    maxAbandoned: 10,
    scoreBudget: 5000,
  }),
  scenario("long-running-fuzz", "Long-running randomized layout pressure", baseConfig(320, {
    maxTicks: 4000,
    laneCapacity: 5,
    exitGateCapacity: 2,
    facilitySchedule: [
      { atTick: 90, exitGateCapacity: 0 },
      { atTick: 112, exitGateCapacity: 2 },
      { atTick: 180, laneCapacity: 2 },
      { atTick: 225, laneCapacity: 5 },
      { atTick: 360, exitGateCapacity: 1 },
      { atTick: 410, exitGateCapacity: 2 },
    ],
    batches: [{
      ...traffic("long", 320)[0],
      patienceTicks: 500,
    }],
  }), { maxAbandoned: 14, maxCongestionTicks: 600, scoreBudget: 20000 }),
];

const suiteSizes: Record<string, number> = {
  "smart-parking-controller-v1": 6,
  "autonomous-parking-operations-v1": 8,
  "production-parking-orchestrator-v1": 10,
};

export function parkingInterviewSuite(
  suiteId: string,
): ParkingInterviewScenario[] | undefined {
  const size = suiteSizes[suiteId];
  return size ? definitions.slice(0, size) : undefined;
}
