/**
 * Parking world module — smart-facility allocation.
 *
 * Vehicles arrive over time, wait at one entrance, occupy a selected category of
 * space, then request permission to leave after their configured stay. The
 * user's intelligence chooses both allocation and exit actions; this module
 * owns runtime mutation, validation, compatibility violations, capacity reuse,
 * and parking metrics.
 */

import type { Action, SimStatus, WorldData } from "../types";
import type { World } from "../world/world";
import type { DomainFlagSpec, WorldModule } from "./module";

export type ParkingSpaceKind =
  | "standard"
  | "charging"
  | "large"
  | "premium"
  | "accessible"
  | "reserved";

export interface ParkingSpace {
  id: string;
  kind: ParkingSpaceKind;
  row: "north" | "south";
  order: number;
  distanceToExit: number;
  reservedFor?: string;
  zone?: string;
  closed?: boolean;
  schedule?: ParkingSpaceSchedule[];
}

export interface ParkingSpaceSchedule {
  atTick: number;
  closed: boolean;
}

export interface ParkingVehicle {
  id: string;
  arrivalTick: number;
  duration: number;
  size?: "compact" | "large";
  electric?: boolean;
  vip?: boolean;
  accessiblePermit?: boolean;
  reservation?: string;
  priority?: number;
  patienceTicks?: number;
  cancellationTick?: number;
  entrance?: string;
}

export interface ParkingFacilitySchedule {
  atTick: number;
  laneCapacity?: number;
  exitGateCapacity?: number;
}

export interface ParkingVehicleBatch {
  prefix: string;
  count: number;
  arrivalStart?: number;
  arrivalEvery?: number;
  durations: number[];
  vehicleTypes?: Array<
    "standard" | "electric" | "large" | "vip" | "accessible" | "reserved"
  >;
  priorityEvery?: number;
  priority?: number;
  patienceTicks?: number;
  reservation?: string;
  entrance?: string;
}

export interface ParkingConfig {
  spaces: ParkingSpace[];
  vehicles?: ParkingVehicle[];
  batches?: ParkingVehicleBatch[];
  maxTicks?: number;
  operationsMode?: "instant" | "realtime";
  entryTravelTicks?: number;
  exitTravelTicks?: number;
  laneCapacity?: number;
  exitGateCapacity?: number;
  congestionDelayPerMovement?: number;
  facilitySchedule?: ParkingFacilitySchedule[];
}

type ParkingWorldData = WorldData & { parking?: ParkingConfig };

function parkingConfig(data: WorldData): ParkingConfig | undefined {
  return (data as ParkingWorldData).parking;
}

const SPACE_KINDS = new Set<ParkingSpaceKind>([
  "standard",
  "charging",
  "large",
  "premium",
  "accessible",
  "reserved",
]);

export function validateParkingData(data: WorldData): void {
  const config = parkingConfig(data);
  if (!config) throw new Error("[parking] world is missing parking configuration");
  if (!Array.isArray(config.spaces) || config.spaces.length === 0) {
    throw new Error("[parking] at least one parking space is required");
  }
  const vehicles = expandParkingVehicles(config);
  if (vehicles.length === 0) {
    throw new Error("[parking] at least one vehicle is required");
  }
  for (const batch of config.batches ?? []) {
    if (!batch.prefix || !Number.isInteger(batch.count) || batch.count < 1) {
      throw new Error("[parking] each vehicle batch needs a prefix and positive count");
    }
    if (!Array.isArray(batch.durations) || batch.durations.length === 0) {
      throw new Error(`[parking] batch '${batch.prefix}' needs at least one duration`);
    }
  }

  const spaceIds = new Set<string>();
  for (const space of config.spaces) {
    if (!space.id) throw new Error("[parking] a space has an empty id");
    if (spaceIds.has(space.id)) throw new Error(`[parking] duplicate space '${space.id}'`);
    if (!SPACE_KINDS.has(space.kind)) {
      throw new Error(`[parking] space '${space.id}' has unknown kind '${space.kind}'`);
    }
    if (space.row !== "north" && space.row !== "south") {
      throw new Error(`[parking] space '${space.id}' row must be north or south`);
    }
    if (!Number.isInteger(space.order) || space.order < 0) {
      throw new Error(`[parking] space '${space.id}' order must be a non-negative integer`);
    }
    if (space.kind === "reserved" && !space.reservedFor) {
      throw new Error(`[parking] reserved space '${space.id}' needs reservedFor`);
    }
    for (const event of space.schedule ?? []) {
      if (!Number.isInteger(event.atTick) || event.atTick < 0) {
        throw new Error(`[parking] space '${space.id}' has an invalid schedule tick`);
      }
    }
    spaceIds.add(space.id);
  }

  const vehicleIds = new Set<string>();
  for (const vehicle of vehicles) {
    if (!vehicle.id) throw new Error("[parking] a vehicle has an empty id");
    if (vehicleIds.has(vehicle.id)) {
      throw new Error(`[parking] duplicate vehicle '${vehicle.id}'`);
    }
    if (!Number.isInteger(vehicle.arrivalTick) || vehicle.arrivalTick < 0) {
      throw new Error(`[parking] vehicle '${vehicle.id}' arrivalTick must be non-negative`);
    }
    if (!Number.isInteger(vehicle.duration) || vehicle.duration < 1) {
      throw new Error(`[parking] vehicle '${vehicle.id}' duration must be positive`);
    }
    if (
      vehicle.patienceTicks !== undefined &&
      (!Number.isInteger(vehicle.patienceTicks) || vehicle.patienceTicks < 1)
    ) {
      throw new Error(`[parking] vehicle '${vehicle.id}' patienceTicks must be positive`);
    }
    vehicleIds.add(vehicle.id);
  }

  // reservedFor may be a vehicle id or an external reservation token. The
  // matching arrival can be generated later by a batch or supplied by a hidden
  // scenario, so it is intentionally not constrained to explicit vehicle ids.
}

export function expandParkingVehicles(config: ParkingConfig): ParkingVehicle[] {
  const explicit = structuredClone(config.vehicles ?? []);
  const generated = (config.batches ?? []).flatMap((batch) =>
    Array.from({ length: batch.count }, (_, index) => {
      const type =
        batch.vehicleTypes?.[index % batch.vehicleTypes.length] ?? "standard";
      return {
        id: `${batch.prefix}-${String(index + 1).padStart(3, "0")}`,
        arrivalTick:
          (batch.arrivalStart ?? 0) + index * Math.max(1, batch.arrivalEvery ?? 1),
        duration: batch.durations[index % batch.durations.length],
        size: type === "large" ? ("large" as const) : ("compact" as const),
        electric: type === "electric",
        vip: type === "vip",
        accessiblePermit: type === "accessible",
        reservation: type === "reserved" ? batch.reservation ?? "reserved" : undefined,
        priority:
          batch.priorityEvery && index % batch.priorityEvery === 0
            ? batch.priority ?? 3
            : 1,
        patienceTicks: batch.patienceTicks,
        entrance: batch.entrance,
      };
    }),
  );
  return [...explicit, ...generated];
}

export type ParkingVehicleStatus =
  | "scheduled"
  | "entering"
  | "parked"
  | "ready"
  | "exiting"
  | "departed"
  | "abandoned"
  | "cancelled";

export interface ParkingRuntimeVehicle extends ParkingVehicle {
  status: ParkingVehicleStatus;
  assignedSpaceId?: string;
  parkedAt?: number;
  departAt?: number;
  readyAt?: number;
  movementCompletesAt?: number;
  waited: number;
  exitWaited: number;
  violation: boolean;
  hardViolation: boolean;
  preferenceViolation: boolean;
  violationReasons: string[];
  reassignments: number;
}

export interface ParkingRuntime {
  spaces: ParkingSpace[];
  vehicles: ParkingRuntimeVehicle[];
  violations: number;
  assignments: number;
  totalWait: number;
  totalExitWait: number;
  maxTicks: number;
  operationsMode: "instant" | "realtime";
  entryTravelTicks: number;
  exitTravelTicks: number;
  laneCapacity: number;
  exitGateCapacity: number;
  congestionDelayPerMovement: number;
  facilitySchedule: ParkingFacilitySchedule[];
  abandoned: number;
  cancelled: number;
  hardViolations: number;
  preferenceViolations: number;
  reassignments: number;
  congestionTicks: number;
  maxEntranceQueue: number;
  maxExitQueue: number;
  lastAssignedVehicleId?: string;
  lastAssignedSpaceId?: string;
  lastAssignmentTick?: number;
  lastDepartedVehicleId?: string;
  lastDepartureTick?: number;
}

export function createParkingRuntime(data: WorldData): ParkingRuntime | null {
  const config = parkingConfig(data);
  if (data.kind !== "parking" || !config) return null;
  return {
    spaces: structuredClone(config.spaces),
    vehicles: expandParkingVehicles(config).map((vehicle) => ({
      ...structuredClone(vehicle),
      status: "scheduled",
      waited: 0,
      exitWaited: 0,
      violation: false,
      hardViolation: false,
      preferenceViolation: false,
      violationReasons: [],
      reassignments: 0,
    })),
    violations: 0,
    assignments: 0,
    totalWait: 0,
    totalExitWait: 0,
    maxTicks:
      config.maxTicks ?? Math.max(100, expandParkingVehicles(config).length * 20),
    operationsMode: config.operationsMode ?? "instant",
    entryTravelTicks: Math.max(1, config.entryTravelTicks ?? 2),
    exitTravelTicks: Math.max(1, config.exitTravelTicks ?? 2),
    laneCapacity: Math.max(1, config.laneCapacity ?? 2),
    exitGateCapacity: Math.max(0, config.exitGateCapacity ?? 1),
    congestionDelayPerMovement: Math.max(0, config.congestionDelayPerMovement ?? 1),
    facilitySchedule: structuredClone(config.facilitySchedule ?? []),
    abandoned: 0,
    cancelled: 0,
    hardViolations: 0,
    preferenceViolations: 0,
    reassignments: 0,
    congestionTicks: 0,
    maxEntranceQueue: 0,
    maxExitQueue: 0,
  };
}

export function parkingRuntime(world: World): ParkingRuntime | null {
  if (world.module.id !== "parking") return null;
  return (world.domain as ParkingRuntime | null) ?? null;
}

export function waitingVehicles(world: World): ParkingRuntimeVehicle[] {
  return (
    parkingRuntime(world)?.vehicles.filter(
      (vehicle) =>
        vehicle.status === "scheduled" && vehicle.arrivalTick <= world.tick,
    ).sort(
      (a, b) =>
        Number(remainingPatience(b, world.tick) <= 10) -
          Number(remainingPatience(a, world.tick) <= 10) ||
        (b.priority ?? 1) - (a.priority ?? 1) ||
        remainingPatience(a, world.tick) - remainingPatience(b, world.tick) ||
        a.arrivalTick - b.arrivalTick ||
        a.id.localeCompare(b.id),
    ) ?? []
  );
}

function remainingPatience(vehicle: ParkingRuntimeVehicle, tick: number): number {
  return vehicle.patienceTicks === undefined
    ? Number.MAX_SAFE_INTEGER
    : vehicle.arrivalTick + vehicle.patienceTicks - tick;
}

export function currentParkingVehicle(world: World): ParkingRuntimeVehicle | null {
  return waitingVehicles(world)[0] ?? null;
}

export function parkedVehicles(world: World): ParkingRuntimeVehicle[] {
  return (
    parkingRuntime(world)?.vehicles.filter(
      (vehicle) =>
        vehicle.status === "entering" ||
        vehicle.status === "parked" ||
        vehicle.status === "ready" ||
        vehicle.status === "exiting",
    ) ?? []
  );
}

export function readyToLeaveVehicles(world: World): ParkingRuntimeVehicle[] {
  return (
    parkingRuntime(world)?.vehicles
      .filter((vehicle) => vehicle.status === "ready")
      .sort(
        (a, b) =>
          (a.readyAt ?? Number.MAX_SAFE_INTEGER) -
            (b.readyAt ?? Number.MAX_SAFE_INTEGER) ||
          (a.parkedAt ?? 0) - (b.parkedAt ?? 0),
      ) ?? []
  );
}

export function departedVehicles(world: World): ParkingRuntimeVehicle[] {
  return parkingRuntime(world)?.vehicles.filter((vehicle) => vehicle.status === "departed") ?? [];
}

export function occupantForSpace(
  world: World,
  spaceId: string,
): ParkingRuntimeVehicle | null {
  return (
    parkingRuntime(world)?.vehicles.find(
      (vehicle) =>
        (vehicle.status === "entering" ||
          vehicle.status === "parked" ||
          vehicle.status === "ready" ||
          vehicle.status === "exiting") &&
        vehicle.assignedSpaceId === spaceId,
    ) ?? null
  );
}

export function isParkingSpaceClosed(space: ParkingSpace, tick: number): boolean {
  let closed = space.closed === true;
  for (const event of [...(space.schedule ?? [])].sort((a, b) => a.atTick - b.atTick)) {
    if (event.atTick <= tick) closed = event.closed;
  }
  return closed;
}

export function movingVehicles(world: World): ParkingRuntimeVehicle[] {
  return (
    parkingRuntime(world)?.vehicles.filter(
      (vehicle) => vehicle.status === "entering" || vehicle.status === "exiting",
    ) ?? []
  );
}

export function availableSpaces(
  world: World,
  kind?: ParkingSpaceKind,
): ParkingSpace[] {
  const runtime = parkingRuntime(world);
  if (!runtime) return [];
  return runtime.spaces
    .filter(
      (space) =>
        (!kind || space.kind === kind) &&
        !isParkingSpaceClosed(space, world.tick) &&
        occupantForSpace(world, space.id) === null,
    )
    .sort((a, b) => a.distanceToExit - b.distanceToExit || a.order - b.order);
}

function reservedSpaceAvailable(world: World): boolean {
  const vehicle = currentParkingVehicle(world);
  if (!vehicle?.reservation) return false;
  return availableSpaces(world, "reserved").some(
    (space) => space.reservedFor === vehicle.id || space.reservedFor === vehicle.reservation,
  );
}

function expectedKind(vehicle: ParkingRuntimeVehicle): ParkingSpaceKind {
  if (vehicle.reservation) return "reserved";
  if (vehicle.accessiblePermit) return "accessible";
  if (vehicle.vip) return "premium";
  if (vehicle.electric) return "charging";
  if (vehicle.size === "large") return "large";
  return "standard";
}

function classifyAssignment(
  vehicle: ParkingRuntimeVehicle,
  space: ParkingSpace,
  tick: number,
): { hard: boolean; preference: boolean; reasons: string[] } {
  const reservationMatches =
    Boolean(vehicle.reservation) &&
    (space.reservedFor === vehicle.id || space.reservedFor === vehicle.reservation);
  const hardReasons: string[] = [];
  if (isParkingSpaceClosed(space, tick)) {
    hardReasons.push(`${space.id} was closed when the assignment was made.`);
  }
  if (space.kind === "reserved" && !reservationMatches) {
    hardReasons.push(`${space.id} is reserved for another vehicle.`);
  }
  if (space.kind === "accessible" && !vehicle.accessiblePermit) {
    hardReasons.push(`${vehicle.id} does not have an accessible permit.`);
  }
  if (vehicle.accessiblePermit === true && space.kind !== "accessible") {
    hardReasons.push(`${vehicle.id} requires an accessible space.`);
  }
  if (vehicle.size === "large" && space.kind !== "large") {
    hardReasons.push(`${vehicle.id} is too large for a ${space.kind} space.`);
  }
  if (Boolean(vehicle.reservation) && !reservationMatches) {
    hardReasons.push(`${vehicle.id}'s reservation does not match ${space.id}.`);
  }
  const hard = hardReasons.length > 0;
  const preferenceReasons: string[] = [];
  if (!hard && vehicle.electric === true && space.kind !== "charging") {
    preferenceReasons.push(`${vehicle.id} is electric but was not given charging.`);
  }
  if (!hard && vehicle.vip === true && space.kind !== "premium") {
    preferenceReasons.push(`${vehicle.id} is VIP but was not given premium parking.`);
  }
  if (
    !hard &&
    expectedKind(vehicle) !== space.kind &&
    preferenceReasons.length === 0
  ) {
    preferenceReasons.push(
      `${vehicle.id} preferred ${expectedKind(vehicle)} but received ${space.kind}.`,
    );
  }
  const preference =
    !hard && preferenceReasons.length > 0;
  return {
    hard,
    preference,
    reasons: [...hardReasons, ...preferenceReasons],
  };
}

function laneLoad(world: World): number {
  return movingVehicles(world).length;
}

function laneHasCapacity(world: World): boolean {
  const runtime = parkingRuntime(world);
  return Boolean(runtime && laneLoad(world) < runtime.laneCapacity);
}

function exitGateHasCapacity(world: World): boolean {
  const runtime = parkingRuntime(world);
  if (!runtime) return false;
  const exiting = runtime.vehicles.filter((vehicle) => vehicle.status === "exiting").length;
  return exiting < runtime.exitGateCapacity;
}

function assignToKind(world: World, kind: ParkingSpaceKind): void {
  const runtime = parkingRuntime(world);
  const vehicle = currentParkingVehicle(world);
  if (!runtime || !vehicle) return;

  const space =
    kind === "reserved"
      ? availableSpaces(world, kind).find(
          (candidate) =>
            candidate.reservedFor === vehicle.id ||
            candidate.reservedFor === vehicle.reservation,
        )
      : availableSpaces(world, kind)[0];
  if (!space) return;

  const assignment = classifyAssignment(vehicle, space, world.tick);
  vehicle.status = runtime.operationsMode === "realtime" ? "entering" : "parked";
  vehicle.assignedSpaceId = space.id;
  if (runtime.operationsMode === "realtime") {
    const congestionDelay =
      laneLoad(world) * runtime.congestionDelayPerMovement;
    vehicle.movementCompletesAt =
      world.tick + runtime.entryTravelTicks + congestionDelay;
  } else {
    vehicle.parkedAt = world.tick;
    vehicle.departAt = world.tick + vehicle.duration;
  }
  vehicle.waited = Math.max(0, world.tick - vehicle.arrivalTick);
  vehicle.hardViolation = assignment.hard;
  vehicle.preferenceViolation = assignment.preference;
  vehicle.violation = assignment.hard || assignment.preference;
  vehicle.violationReasons = assignment.reasons;
  runtime.assignments += 1;
  runtime.totalWait += vehicle.waited;
  if (vehicle.violation) runtime.violations += 1;
  if (vehicle.hardViolation) runtime.hardViolations += 1;
  if (vehicle.preferenceViolation) runtime.preferenceViolations += 1;
  runtime.lastAssignedVehicleId = vehicle.id;
  runtime.lastAssignedSpaceId = space.id;
  runtime.lastAssignmentTick = world.tick;
}

function applyParkingAction(world: World, action: Action): boolean {
  switch (action.type) {
    case "parkStandard":
      assignToKind(world, "standard");
      return true;
    case "parkCharging":
      assignToKind(world, "charging");
      return true;
    case "parkLarge":
      assignToKind(world, "large");
      return true;
    case "parkPremium":
      assignToKind(world, "premium");
      return true;
    case "parkAccessible":
      assignToKind(world, "accessible");
      return true;
    case "parkReserved":
      assignToKind(world, "reserved");
      return true;
    case "releaseVehicle": {
      const runtime = parkingRuntime(world);
      const vehicle = readyToLeaveVehicles(world)[0];
      if (!runtime || !vehicle) return true;
      vehicle.exitWaited = Math.max(0, world.tick - (vehicle.readyAt ?? world.tick));
      runtime.totalExitWait += vehicle.exitWaited;
      if (runtime.operationsMode === "realtime") {
        const congestionDelay =
          laneLoad(world) * runtime.congestionDelayPerMovement;
        vehicle.status = "exiting";
        vehicle.movementCompletesAt =
          world.tick + runtime.exitTravelTicks + congestionDelay;
      } else {
        vehicle.status = "departed";
        runtime.lastDepartedVehicleId = vehicle.id;
        runtime.lastDepartureTick = world.tick;
      }
      return true;
    }
    default:
      return false;
  }
}

function raiseExitRequests(world: World): void {
  const runtime = parkingRuntime(world);
  if (!runtime) return;
  for (const vehicle of runtime.vehicles) {
    if (
      vehicle.status === "parked" &&
      vehicle.departAt !== undefined &&
      vehicle.departAt <= world.tick
    ) {
      vehicle.status = "ready";
      vehicle.readyAt = world.tick;
    }
  }
}

function applyFacilitySchedule(world: World): void {
  const runtime = parkingRuntime(world);
  if (!runtime) return;
  for (const event of runtime.facilitySchedule) {
    if (event.atTick !== world.tick) continue;
    if (event.laneCapacity !== undefined) {
      runtime.laneCapacity = Math.max(0, event.laneCapacity);
    }
    if (event.exitGateCapacity !== undefined) {
      runtime.exitGateCapacity = Math.max(0, event.exitGateCapacity);
    }
  }
}

function advanceParking(world: World): void {
  const runtime = parkingRuntime(world);
  if (!runtime) return;

  applyFacilitySchedule(world);

  for (const vehicle of runtime.vehicles) {
    if (
      vehicle.status === "scheduled" &&
      vehicle.cancellationTick !== undefined &&
      vehicle.cancellationTick <= world.tick
    ) {
      vehicle.status = "cancelled";
      runtime.cancelled += 1;
      continue;
    }

    if (
      vehicle.status === "scheduled" &&
      vehicle.arrivalTick <= world.tick &&
      vehicle.patienceTicks !== undefined &&
      world.tick - vehicle.arrivalTick >= vehicle.patienceTicks
    ) {
      vehicle.status = "abandoned";
      runtime.abandoned += 1;
      continue;
    }

    if (vehicle.status === "entering" && vehicle.assignedSpaceId) {
      const space = runtime.spaces.find(
        (candidate) => candidate.id === vehicle.assignedSpaceId,
      );
      if (!space || isParkingSpaceClosed(space, world.tick)) {
        vehicle.status = "scheduled";
        vehicle.assignedSpaceId = undefined;
        vehicle.movementCompletesAt = undefined;
        vehicle.reassignments += 1;
        runtime.reassignments += 1;
        continue;
      }
      if (
        vehicle.movementCompletesAt !== undefined &&
        vehicle.movementCompletesAt <= world.tick
      ) {
        vehicle.status = "parked";
        vehicle.parkedAt = world.tick;
        vehicle.departAt = world.tick + vehicle.duration;
        vehicle.movementCompletesAt = undefined;
      }
    }

    if (
      vehicle.status === "exiting" &&
      vehicle.movementCompletesAt !== undefined &&
      vehicle.movementCompletesAt <= world.tick
    ) {
      vehicle.status = "departed";
      vehicle.movementCompletesAt = undefined;
      runtime.lastDepartedVehicleId = vehicle.id;
      runtime.lastDepartureTick = world.tick;
    }
  }

  raiseExitRequests(world);
  runtime.maxEntranceQueue = Math.max(
    runtime.maxEntranceQueue,
    waitingVehicles(world).length,
  );
  runtime.maxExitQueue = Math.max(
    runtime.maxExitQueue,
    readyToLeaveVehicles(world).length,
  );
  if (laneLoad(world) >= runtime.laneCapacity && laneLoad(world) > 0) {
    runtime.congestionTicks += 1;
  }
}

export function resolvedParkingVehicles(world: World): ParkingRuntimeVehicle[] {
  return (
    parkingRuntime(world)?.vehicles.filter(
      (vehicle) =>
        vehicle.status === "departed" ||
        vehicle.status === "abandoned" ||
        vehicle.status === "cancelled",
    ) ?? []
  );
}

export function parkingScore(world: World): number {
  return parkingPenaltyBreakdown(world).total;
}

export interface ParkingPenaltyBreakdown {
  entranceWait: number;
  exitWait: number;
  hardViolations: number;
  preferenceViolations: number;
  abandonment: number;
  reassignments: number;
  congestion: number;
  activeQueues: number;
  total: number;
}

/** Auditable components of the lower-is-better parking score. */
export function parkingPenaltyBreakdown(world: World): ParkingPenaltyBreakdown {
  const runtime = parkingRuntime(world);
  if (!runtime) {
    return {
      entranceWait: 0,
      exitWait: 0,
      hardViolations: 0,
      preferenceViolations: 0,
      abandonment: 0,
      reassignments: 0,
      congestion: 0,
      activeQueues: 0,
      total: 0,
    };
  }
  const activeQueues =
    waitingVehicles(world).length + readyToLeaveVehicles(world).length;
  const entranceWait = runtime.totalWait * 0.4;
  const exitWait = runtime.totalExitWait * 0.6;
  const hardViolations = runtime.hardViolations * 100;
  const preferenceViolations = runtime.preferenceViolations * 8;
  const abandonment = runtime.abandoned * 35;
  const reassignments = runtime.reassignments * 6;
  const congestion = runtime.congestionTicks * 0.5;
  return {
    entranceWait,
    exitWait,
    hardViolations,
    preferenceViolations,
    abandonment,
    reassignments,
    congestion,
    activeQueues,
    total:
      entranceWait +
      exitWait +
      hardViolations +
      preferenceViolations +
      abandonment +
      reassignments +
      congestion +
      activeQueues,
  };
}

function parkingObserve(world: World): Record<string, number | boolean> {
  const runtime = parkingRuntime(world);
  const vehicle = currentParkingVehicle(world);
  const exitVehicle = readyToLeaveVehicles(world)[0] ?? null;
  if (!runtime) return {};
  const occupied = parkedVehicles(world).length;
  const departed = departedVehicles(world).length;
  const resolved = resolvedParkingVehicles(world).length;
  const moving = movingVehicles(world).length;
  const entryHeadWait = vehicle
    ? Math.max(0, world.tick - vehicle.arrivalTick)
    : 0;
  const exitHeadWait = exitVehicle
    ? Math.max(0, world.tick - (exitVehicle.readyAt ?? world.tick))
    : 0;
  const future = runtime.vehicles.filter(
    (candidate) =>
      candidate.status === "scheduled" && candidate.arrivalTick > world.tick,
  ).length;

  return {
    parking: true,
    hasWaitingVehicle: vehicle !== null,
    queueLength: waitingVehicles(world).length,
    carElectric: vehicle?.electric === true,
    carLarge: vehicle?.size === "large",
    carVIP: vehicle?.vip === true,
    carAccessible: vehicle?.accessiblePermit === true,
    carReserved: Boolean(vehicle?.reservation),
    carPriority: vehicle?.priority ?? 0,
    carWait: entryHeadWait,
    carPatienceRemaining:
      vehicle?.patienceTicks === undefined
        ? 999999
        : Math.max(0, remainingPatience(vehicle, world.tick)),
    hasExitRequest: exitVehicle !== null,
    exitQueueLength: readyToLeaveVehicles(world).length,
    exitCarElectric: exitVehicle?.electric === true,
    exitCarLarge: exitVehicle?.size === "large",
    exitCarVIP: exitVehicle?.vip === true,
    exitCarAccessible: exitVehicle?.accessiblePermit === true,
    exitCarReserved: Boolean(exitVehicle?.reservation),
    exitWait: exitHeadWait,
    laneAvailable: laneHasCapacity(world),
    laneLoad: moving,
    laneCapacity: runtime.laneCapacity,
    exitGateAvailable: exitGateHasCapacity(world) && laneHasCapacity(world),
    exitGateCapacity: runtime.exitGateCapacity,
    congestion: moving >= runtime.laneCapacity && moving > 0,
    movingVehicles: moving,
    standardAvailable: availableSpaces(world, "standard").length > 0,
    chargingAvailable: availableSpaces(world, "charging").length > 0,
    largeAvailable: availableSpaces(world, "large").length > 0,
    premiumAvailable: availableSpaces(world, "premium").length > 0,
    accessibleAvailable: availableSpaces(world, "accessible").length > 0,
    reservedAvailable: reservedSpaceAvailable(world),
    spacesAvailable: runtime.spaces.length - occupied,
    occupiedSpaces: occupied,
    parkedCount: occupied,
    departedCount: departed,
    violations: runtime.violations,
    hardViolations: runtime.hardViolations,
    preferenceViolations: runtime.preferenceViolations,
    abandonedCount: runtime.abandoned,
    cancelledCount: runtime.cancelled,
    reassignmentCount: runtime.reassignments,
    congestionTicks: runtime.congestionTicks,
    maxEntranceQueue: runtime.maxEntranceQueue,
    maxExitQueue: runtime.maxExitQueue,
    parkingScore: parkingScore(world),
    averageWait:
      runtime.assignments > 0 ? runtime.totalWait / runtime.assignments : 0,
    averageExitWait:
      departed > 0 ? runtime.totalExitWait / departed : 0,
    utilization:
      runtime.spaces.length > 0 ? (occupied / runtime.spaces.length) * 100 : 0,
    allVehiclesArrived: future === 0,
    allVehiclesServed: departed === runtime.vehicles.length,
    allVehiclesResolved: resolved === runtime.vehicles.length,
  };
}

export const PARKING_FLAGS: DomainFlagSpec[] = [
  { id: "parking", type: "bool", label: "Parking", meaning: "This run uses smart-parking operations" },
  { id: "hasWaitingVehicle", type: "bool", label: "Vehicle Waiting", meaning: "A vehicle is waiting at the entrance" },
  { id: "queueLength", type: "number", label: "Queue Length", meaning: "Vehicles currently waiting at the entrance" },
  { id: "carElectric", type: "bool", label: "Electric Vehicle", meaning: "The head vehicle is electric" },
  { id: "carLarge", type: "bool", label: "Large Vehicle", meaning: "The head vehicle needs a large bay" },
  { id: "carVIP", type: "bool", label: "VIP Vehicle", meaning: "The head vehicle has VIP status" },
  { id: "carAccessible", type: "bool", label: "Accessible Permit", meaning: "The head vehicle has an accessible permit" },
  { id: "carReserved", type: "bool", label: "Reservation", meaning: "The head vehicle has a reserved bay" },
  { id: "carPriority", type: "number", label: "Vehicle Priority", meaning: "Priority of the head entrance vehicle" },
  { id: "carWait", type: "number", label: "Entrance Wait", meaning: "Ticks the head vehicle has waited" },
  { id: "carPatienceRemaining", type: "number", label: "Patience Remaining", meaning: "Ticks before the head vehicle abandons the queue" },
  { id: "hasExitRequest", type: "bool", label: "Exit Request", meaning: "A parked vehicle has finished its stay and is waiting for exit authorization" },
  { id: "exitQueueLength", type: "number", label: "Exit Queue Length", meaning: "Vehicles currently waiting for exit authorization" },
  { id: "exitCarElectric", type: "bool", label: "Exiting EV", meaning: "The head exit request is an electric vehicle" },
  { id: "exitCarLarge", type: "bool", label: "Exiting Large Vehicle", meaning: "The head exit request is a large vehicle" },
  { id: "exitCarVIP", type: "bool", label: "Exiting VIP", meaning: "The head exit request has VIP status" },
  { id: "exitCarAccessible", type: "bool", label: "Exiting Accessible Vehicle", meaning: "The head exit request has an accessible permit" },
  { id: "exitCarReserved", type: "bool", label: "Exiting Reserved Vehicle", meaning: "The head exit request used a reservation" },
  { id: "exitWait", type: "number", label: "Exit Wait", meaning: "Ticks the head exit request has waited" },
  { id: "laneAvailable", type: "bool", label: "Lane Available", meaning: "The shared movement lane can accept another car" },
  { id: "laneLoad", type: "number", label: "Lane Load", meaning: "Cars currently moving through shared lanes" },
  { id: "laneCapacity", type: "number", label: "Lane Capacity", meaning: "Current simultaneous movement capacity" },
  { id: "exitGateAvailable", type: "bool", label: "Exit Gate Available", meaning: "An exit gate and shared lane slot are available" },
  { id: "exitGateCapacity", type: "number", label: "Exit Gate Capacity", meaning: "Current concurrent exit capacity" },
  { id: "congestion", type: "bool", label: "Congestion", meaning: "Shared movement capacity is saturated" },
  { id: "movingVehicles", type: "number", label: "Moving Vehicles", meaning: "Cars currently entering or exiting" },
  { id: "standardAvailable", type: "bool", label: "Standard Space Available", meaning: "At least one standard space is free" },
  { id: "chargingAvailable", type: "bool", label: "Charging Bay Available", meaning: "At least one charging bay is free" },
  { id: "largeAvailable", type: "bool", label: "Large Bay Available", meaning: "At least one large bay is free" },
  { id: "premiumAvailable", type: "bool", label: "Premium Space Available", meaning: "At least one premium space is free" },
  { id: "accessibleAvailable", type: "bool", label: "Accessible Space Available", meaning: "At least one accessible space is free" },
  { id: "reservedAvailable", type: "bool", label: "Reserved Space Available", meaning: "The head vehicle's reserved space is free" },
  { id: "spacesAvailable", type: "number", label: "Spaces Available", meaning: "Free spaces across the lot" },
  { id: "occupiedSpaces", type: "number", label: "Occupied Spaces", meaning: "Vehicles currently parked" },
  { id: "parkedCount", type: "number", label: "Parked Count", meaning: "Vehicles currently occupying spaces" },
  { id: "departedCount", type: "number", label: "Departed Count", meaning: "Vehicles that completed their stay and left" },
  { id: "violations", type: "number", label: "Allocation Violations", meaning: "Vehicles assigned to the wrong space category" },
  { id: "hardViolations", type: "number", label: "Hard Violations", meaning: "Unsafe or forbidden allocations" },
  { id: "preferenceViolations", type: "number", label: "Preference Violations", meaning: "Valid allocations that miss a customer preference" },
  { id: "abandonedCount", type: "number", label: "Abandoned Vehicles", meaning: "Vehicles that exceeded their entrance patience" },
  { id: "cancelledCount", type: "number", label: "Cancelled Vehicles", meaning: "Vehicles removed by a cancellation event" },
  { id: "reassignmentCount", type: "number", label: "Reassignments", meaning: "Inbound cars rerouted after a closure" },
  { id: "congestionTicks", type: "number", label: "Congestion Ticks", meaning: "Ticks when lane capacity was saturated" },
  { id: "maxEntranceQueue", type: "number", label: "Peak Entrance Queue", meaning: "Largest observed entrance backlog" },
  { id: "maxExitQueue", type: "number", label: "Peak Exit Queue", meaning: "Largest observed exit backlog" },
  { id: "parkingScore", type: "number", label: "Operating Penalty", meaning: "Combined wait, failure, violation, rerouting, and congestion penalty" },
  { id: "averageWait", type: "number", label: "Average Wait", meaning: "Average ticks waited before assignment" },
  { id: "averageExitWait", type: "number", label: "Average Exit Wait", meaning: "Average ticks waited for exit authorization" },
  { id: "utilization", type: "number", label: "Utilization %", meaning: "Current percentage of occupied spaces", format: "percent" },
  { id: "allVehiclesArrived", type: "bool", label: "All Arrived", meaning: "No future arrivals remain" },
  { id: "allVehiclesServed", type: "bool", label: "All Served", meaning: "Every scheduled vehicle has departed" },
  { id: "allVehiclesResolved", type: "bool", label: "All Resolved", meaning: "Every vehicle departed, cancelled, or abandoned" },
];

export const parkingModule: WorldModule = {
  id: "parking",
  tracksMovement: false,
  domainActions: [
    "parkStandard",
    "parkCharging",
    "parkLarge",
    "parkPremium",
    "parkAccessible",
    "parkReserved",
    "releaseVehicle",
  ],
  domainFlags: PARKING_FLAGS,
  actionPreconditions: {
    parkStandard: "hasWaitingVehicle && standardAvailable && laneAvailable",
    parkCharging: "hasWaitingVehicle && chargingAvailable && laneAvailable",
    parkLarge: "hasWaitingVehicle && largeAvailable && laneAvailable",
    parkPremium: "hasWaitingVehicle && premiumAvailable && laneAvailable",
    parkAccessible: "hasWaitingVehicle && accessibleAvailable && laneAvailable",
    parkReserved: "hasWaitingVehicle && reservedAvailable && laneAvailable",
    releaseVehicle: "hasExitRequest && exitGateAvailable",
  },
  validate: validateParkingData,
  createDomain: createParkingRuntime,
  applyAction: applyParkingAction,
  advanceTick: advanceParking,
  resolveStatus(world: World): SimStatus | null {
    const runtime = parkingRuntime(world);
    if (!runtime) return null;
    if (runtime.operationsMode === "instant") raiseExitRequests(world);
    const done =
      runtime.operationsMode === "realtime"
        ? resolvedParkingVehicles(world).length === runtime.vehicles.length
        : runtime.vehicles.every((vehicle) => vehicle.status === "departed");
    if (done) {
      return "reached";
    }
    return world.tick >= runtime.maxTicks ? "stuck" : null;
  },
  observe: parkingObserve,
};
