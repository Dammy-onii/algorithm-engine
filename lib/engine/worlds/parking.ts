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
}

export interface ParkingConfig {
  spaces: ParkingSpace[];
  vehicles: ParkingVehicle[];
  maxTicks?: number;
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
  if (!Array.isArray(config.vehicles) || config.vehicles.length === 0) {
    throw new Error("[parking] at least one vehicle is required");
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
    spaceIds.add(space.id);
  }

  const vehicleIds = new Set<string>();
  for (const vehicle of config.vehicles) {
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
    vehicleIds.add(vehicle.id);
  }

  for (const space of config.spaces) {
    if (space.reservedFor && !vehicleIds.has(space.reservedFor)) {
      throw new Error(
        `[parking] space '${space.id}' reserves for unknown vehicle '${space.reservedFor}'`,
      );
    }
  }
}

export type ParkingVehicleStatus = "scheduled" | "parked" | "ready" | "departed";

export interface ParkingRuntimeVehicle extends ParkingVehicle {
  status: ParkingVehicleStatus;
  assignedSpaceId?: string;
  parkedAt?: number;
  departAt?: number;
  readyAt?: number;
  waited: number;
  exitWaited: number;
  violation: boolean;
}

export interface ParkingRuntime {
  spaces: ParkingSpace[];
  vehicles: ParkingRuntimeVehicle[];
  violations: number;
  assignments: number;
  totalWait: number;
  totalExitWait: number;
  maxTicks: number;
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
    vehicles: config.vehicles.map((vehicle) => ({
      ...structuredClone(vehicle),
      status: "scheduled",
      waited: 0,
      exitWaited: 0,
      violation: false,
    })),
    violations: 0,
    assignments: 0,
    totalWait: 0,
    totalExitWait: 0,
    maxTicks: config.maxTicks ?? Math.max(100, config.vehicles.length * 20),
  };
}

export function parkingRuntime(world: World): ParkingRuntime | null {
  return (world.domain as ParkingRuntime | null) ?? null;
}

export function waitingVehicles(world: World): ParkingRuntimeVehicle[] {
  return (
    parkingRuntime(world)?.vehicles.filter(
      (vehicle) =>
        vehicle.status === "scheduled" && vehicle.arrivalTick <= world.tick,
    ) ?? []
  );
}

export function currentParkingVehicle(world: World): ParkingRuntimeVehicle | null {
  return waitingVehicles(world)[0] ?? null;
}

export function parkedVehicles(world: World): ParkingRuntimeVehicle[] {
  return (
    parkingRuntime(world)?.vehicles.filter(
      (vehicle) => vehicle.status === "parked" || vehicle.status === "ready",
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
        (vehicle.status === "parked" || vehicle.status === "ready") &&
        vehicle.assignedSpaceId === spaceId,
    ) ?? null
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
        (!kind || space.kind === kind) && occupantForSpace(world, space.id) === null,
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

  vehicle.status = "parked";
  vehicle.assignedSpaceId = space.id;
  vehicle.parkedAt = world.tick;
  vehicle.departAt = world.tick + vehicle.duration;
  vehicle.waited = Math.max(0, world.tick - vehicle.arrivalTick);
  vehicle.violation = expectedKind(vehicle) !== space.kind;
  runtime.assignments += 1;
  runtime.totalWait += vehicle.waited;
  if (vehicle.violation) runtime.violations += 1;
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
      vehicle.status = "departed";
      vehicle.exitWaited = Math.max(0, world.tick - (vehicle.readyAt ?? world.tick));
      runtime.totalExitWait += vehicle.exitWaited;
      runtime.lastDepartedVehicleId = vehicle.id;
      runtime.lastDepartureTick = world.tick;
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

function parkingObserve(world: World): Record<string, number | boolean> {
  const runtime = parkingRuntime(world);
  const vehicle = currentParkingVehicle(world);
  const exitVehicle = readyToLeaveVehicles(world)[0] ?? null;
  if (!runtime) return {};
  const occupied = parkedVehicles(world).length;
  const departed = departedVehicles(world).length;
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
    hasExitRequest: exitVehicle !== null,
    exitQueueLength: readyToLeaveVehicles(world).length,
    exitCarElectric: exitVehicle?.electric === true,
    exitCarLarge: exitVehicle?.size === "large",
    exitCarVIP: exitVehicle?.vip === true,
    exitCarAccessible: exitVehicle?.accessiblePermit === true,
    exitCarReserved: Boolean(exitVehicle?.reservation),
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
    averageWait:
      runtime.assignments > 0 ? runtime.totalWait / runtime.assignments : 0,
    averageExitWait:
      departed > 0 ? runtime.totalExitWait / departed : 0,
    utilization:
      runtime.spaces.length > 0 ? (occupied / runtime.spaces.length) * 100 : 0,
    allVehiclesArrived: future === 0,
    allVehiclesServed: departed === runtime.vehicles.length,
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
  { id: "hasExitRequest", type: "bool", label: "Exit Request", meaning: "A parked vehicle has finished its stay and is waiting for exit authorization" },
  { id: "exitQueueLength", type: "number", label: "Exit Queue Length", meaning: "Vehicles currently waiting for exit authorization" },
  { id: "exitCarElectric", type: "bool", label: "Exiting EV", meaning: "The head exit request is an electric vehicle" },
  { id: "exitCarLarge", type: "bool", label: "Exiting Large Vehicle", meaning: "The head exit request is a large vehicle" },
  { id: "exitCarVIP", type: "bool", label: "Exiting VIP", meaning: "The head exit request has VIP status" },
  { id: "exitCarAccessible", type: "bool", label: "Exiting Accessible Vehicle", meaning: "The head exit request has an accessible permit" },
  { id: "exitCarReserved", type: "bool", label: "Exiting Reserved Vehicle", meaning: "The head exit request used a reservation" },
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
  { id: "averageWait", type: "number", label: "Average Wait", meaning: "Average ticks waited before assignment" },
  { id: "averageExitWait", type: "number", label: "Average Exit Wait", meaning: "Average ticks waited for exit authorization" },
  { id: "utilization", type: "number", label: "Utilization %", meaning: "Current percentage of occupied spaces" },
  { id: "allVehiclesArrived", type: "bool", label: "All Arrived", meaning: "No future arrivals remain" },
  { id: "allVehiclesServed", type: "bool", label: "All Served", meaning: "Every scheduled vehicle has departed" },
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
    parkStandard: "hasWaitingVehicle && standardAvailable",
    parkCharging: "hasWaitingVehicle && chargingAvailable",
    parkLarge: "hasWaitingVehicle && largeAvailable",
    parkPremium: "hasWaitingVehicle && premiumAvailable",
    parkAccessible: "hasWaitingVehicle && accessibleAvailable",
    parkReserved: "hasWaitingVehicle && reservedAvailable",
    releaseVehicle: "hasExitRequest",
  },
  validate: validateParkingData,
  createDomain: createParkingRuntime,
  applyAction: applyParkingAction,
  resolveStatus(world: World): SimStatus | null {
    const runtime = parkingRuntime(world);
    if (!runtime) return null;
    raiseExitRequests(world);
    if (runtime.vehicles.every((vehicle) => vehicle.status === "departed")) {
      return "reached";
    }
    return world.tick >= runtime.maxTicks ? "stuck" : null;
  },
  observe: parkingObserve,
};
