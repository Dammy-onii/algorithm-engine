/**
 * Warehouse world module.
 *
 * All warehouse behaviour lives here, not in the engine core: the mutable
 * runtime, the pickUp / deliver / charge actions, station replenishment,
 * completion (every package delivered), and the domain observation flags.
 *
 * Operates on the generic `World` (base grid + agent) via its public fields; it
 * reads/writes `world.domain` (typed here as WarehouseRuntime) and `agent.cargo`.
 */

import type {
  Action,
  SimStatus,
  Vec2,
  WorldData,
} from "../types";
import type { World } from "../world/world";
import type { DomainFlagSpec, WorldModule } from "./module";
import { equals, inBounds } from "../world/grid";

// ---------------------------------------------------------------------------
// Warehouse data schema — owned by this module, not the shared engine types.
// ---------------------------------------------------------------------------

export interface WarehouseDeliveryZone {
  id: string;
  position: Vec2;
  description?: string;
  acceptsType?: string;
}

export interface WarehousePackage {
  id: string;
  position: Vec2;
  destinationId: string;
  description?: string;
  type?: string;
  stationId?: string;
}

export interface WarehousePackageStation {
  id: string;
  position: Vec2;
  destinationId: string;
  type: string;
  total: number;
  description?: string;
}

export interface WarehouseChargingStation {
  id: string;
  position: Vec2;
  description?: string;
}

export interface WarehouseConfig {
  carryingCapacity: number;
  deliveryZones: WarehouseDeliveryZone[];
  packages: WarehousePackage[];
  stations?: WarehousePackageStation[];
  chargingStations?: WarehouseChargingStation[];
}

type WarehouseWorldData = WorldData & { warehouse?: WarehouseConfig };

function warehouseConfig(data: WorldData): WarehouseConfig | undefined {
  return (data as WarehouseWorldData).warehouse;
}

/** Validate warehouse-only content after the generic grid validation has run. */
export function validateWarehouseData(data: WorldData): void {
  const warehouse = warehouseConfig(data);
  if (!warehouse) throw new Error("[warehouse] world is missing warehouse configuration");
  if (!Number.isInteger(warehouse.carryingCapacity) || warehouse.carryingCapacity < 1) {
    throw new Error("[warehouse] carryingCapacity must be a positive integer");
  }

  const walkable = (position: Vec2) =>
    inBounds(data.tiles, position) && data.tiles[position.y][position.x] !== 1;
  const zoneIds = new Set<string>();
  for (const zone of warehouse.deliveryZones) {
    if (!zone.id) throw new Error("[warehouse] delivery zone has an empty id");
    if (zoneIds.has(zone.id)) throw new Error(`[warehouse] duplicate delivery zone '${zone.id}'`);
    if (!walkable(zone.position)) throw new Error(`[warehouse] delivery zone '${zone.id}' is not on a walkable tile`);
    zoneIds.add(zone.id);
  }

  const packageIds = new Set<string>();
  for (const pkg of warehouse.packages) {
    if (!pkg.id) throw new Error("[warehouse] package has an empty id");
    if (packageIds.has(pkg.id)) throw new Error(`[warehouse] duplicate package '${pkg.id}'`);
    if (!zoneIds.has(pkg.destinationId)) throw new Error(`[warehouse] package '${pkg.id}' references unknown destination '${pkg.destinationId}'`);
    const destination = warehouse.deliveryZones.find((zone) => zone.id === pkg.destinationId);
    if (destination?.acceptsType && destination.acceptsType !== pkg.type) {
      throw new Error(`[warehouse] package '${pkg.id}' type does not match destination '${pkg.destinationId}'`);
    }
    if (!walkable(pkg.position)) throw new Error(`[warehouse] package '${pkg.id}' is not on a walkable tile`);
    packageIds.add(pkg.id);
  }

  const stationIds = new Set<string>();
  for (const station of warehouse.stations ?? []) {
    if (!station.id) throw new Error("[warehouse] station has an empty id");
    if (stationIds.has(station.id) || packageIds.has(station.id)) throw new Error(`[warehouse] duplicate station '${station.id}'`);
    if (!zoneIds.has(station.destinationId)) throw new Error(`[warehouse] station '${station.id}' references unknown destination '${station.destinationId}'`);
    if (!station.type) throw new Error(`[warehouse] station '${station.id}' has an empty package type`);
    if (!Number.isInteger(station.total) || station.total < 1) throw new Error(`[warehouse] station '${station.id}' total must be a positive integer`);
    if (!walkable(station.position)) throw new Error(`[warehouse] station '${station.id}' is not on a walkable tile`);
    const destination = warehouse.deliveryZones.find((zone) => zone.id === station.destinationId);
    if (destination?.acceptsType && destination.acceptsType !== station.type) {
      throw new Error(`[warehouse] station '${station.id}' type does not match destination '${station.destinationId}'`);
    }
    stationIds.add(station.id);
  }

  const chargingIds = new Set<string>();
  for (const charger of warehouse.chargingStations ?? []) {
    if (!charger.id) throw new Error("[warehouse] charging station has an empty id");
    if (chargingIds.has(charger.id)) throw new Error(`[warehouse] duplicate charging station '${charger.id}'`);
    if (!walkable(charger.position)) throw new Error(`[warehouse] charging station '${charger.id}' is not on a walkable tile`);
    chargingIds.add(charger.id);
  }
}

// ---------------------------------------------------------------------------
// Runtime types (mutable; never mutate the source JSON)
// ---------------------------------------------------------------------------

export type WarehousePackageStatus = "waiting" | "carried" | "delivered";

export interface WarehouseRuntimePackage extends WarehousePackage {
  status: WarehousePackageStatus;
}

export interface WarehouseRuntimeStation extends WarehousePackageStation {
  /** Packages not yet picked from this source, including its visible package. */
  remaining: number;
  /** Number of package instances this station has made visible. */
  issued: number;
}

export interface WarehouseRuntime {
  carryingCapacity: number;
  deliveryZones: WarehouseConfig["deliveryZones"];
  packages: WarehouseRuntimePackage[];
  stations: WarehouseRuntimeStation[];
  chargingStations: NonNullable<WarehouseConfig["chargingStations"]>;
}

// ---------------------------------------------------------------------------
// Runtime construction
// ---------------------------------------------------------------------------

export function createWarehouseRuntime(data: WorldData): WarehouseRuntime | null {
  const config = warehouseConfig(data);
  if (data.kind !== "warehouse" || !config) return null;

  const runtime: WarehouseRuntime = {
    carryingCapacity: config.carryingCapacity,
    deliveryZones: structuredClone(config.deliveryZones),
    packages: config.packages.map((pkg) => ({
      ...structuredClone(pkg),
      status: "waiting" as const,
    })),
    stations: (config.stations ?? []).map((station) => ({
      ...structuredClone(station),
      remaining: station.total,
      issued: 0,
    })),
    chargingStations: structuredClone(config.chargingStations ?? []),
  };

  // A station exposes exactly one waiting package. The next appears as soon as
  // this one is picked, while `remaining` tracks unseen + visible stock.
  for (const station of runtime.stations) {
    station.issued = 1;
    runtime.packages.push({
      id: `${station.id}-1`,
      position: { ...station.position },
      destinationId: station.destinationId,
      type: station.type,
      stationId: station.id,
      description: station.description,
      status: "waiting",
    });
  }
  return runtime;
}

// ---------------------------------------------------------------------------
// Queries (pure over runtime + agent)
// ---------------------------------------------------------------------------

export function warehouseRuntime(world: World): WarehouseRuntime | null {
  if (world.module.id !== "warehouse") return null;
  return (world.domain as WarehouseRuntime | null) ?? null;
}

export function packageAt(world: World, position = world.agent.position): WarehouseRuntimePackage | null {
  return (
    warehouseRuntime(world)?.packages.find(
      (pkg) => pkg.status === "waiting" && equals(pkg.position, position),
    ) ?? null
  );
}

export function deliveryZoneAt(world: World, position: Vec2) {
  return warehouseRuntime(world)?.deliveryZones.find((zone) => equals(zone.position, position)) ?? null;
}

export function chargingStationAt(world: World, position: Vec2) {
  return warehouseRuntime(world)?.chargingStations.find((s) => equals(s.position, position)) ?? null;
}

export function stationAt(world: World, position: Vec2) {
  return warehouseRuntime(world)?.stations.find((s) => equals(s.position, position)) ?? null;
}

export function carryingType(world: World, type: string): boolean {
  const runtime = warehouseRuntime(world);
  return world.agent.cargo.some((id) => {
    const pkg = runtime?.packages.find((candidate) => candidate.id === id);
    return pkg?.type === type;
  });
}

export function deliveredCount(world: World): number {
  return warehouseRuntime(world)?.packages.filter((pkg) => pkg.status === "delivered").length ?? 0;
}

export function packagesRemaining(world: World): number {
  const runtime = warehouseRuntime(world);
  if (!runtime) return 0;
  const staticPackages = runtime.packages.filter(
    (pkg) => !pkg.stationId && pkg.status !== "delivered",
  ).length;
  const stationCargo = runtime.packages.filter(
    (pkg) => pkg.stationId && pkg.status === "carried",
  ).length;
  const stationStock = runtime.stations.reduce((total, s) => total + s.remaining, 0);
  return staticPackages + stationCargo + stationStock;
}

export function capacityRemaining(world: World): number {
  const runtime = warehouseRuntime(world);
  return runtime ? Math.max(0, runtime.carryingCapacity - world.agent.cargo.length) : 0;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function applyWarehouseAction(world: World, action: Action): boolean {
  const runtime = warehouseRuntime(world);
  if (!runtime) return false;

  switch (action.type) {
    case "pickUp": {
      const pkg = packageAt(world, world.agent.position);
      if (pkg && capacityRemaining(world) > 0) {
        pkg.status = "carried";
        world.agent.cargo.push(pkg.id);
        if (pkg.stationId) {
          const station = runtime.stations.find((c) => c.id === pkg.stationId);
          if (station) {
            station.remaining -= 1;
            if (station.remaining > 0) {
              station.issued += 1;
              runtime.packages.push({
                id: `${station.id}-${station.issued}`,
                position: { ...station.position },
                destinationId: station.destinationId,
                type: station.type,
                stationId: station.id,
                description: station.description,
                status: "waiting",
              });
            }
          }
        }
      }
      return true;
    }
    case "deliver": {
      const zone = deliveryZoneAt(world, world.agent.position);
      if (zone) {
        const pkg = runtime.packages.find(
          (candidate) =>
            candidate.status === "carried" &&
            candidate.destinationId === zone.id &&
            (!zone.acceptsType || zone.acceptsType === candidate.type) &&
            world.agent.cargo.includes(candidate.id),
        );
        if (pkg) {
          pkg.status = "delivered";
          world.agent.cargo = world.agent.cargo.filter((id) => id !== pkg.id);
        }
      }
      return true;
    }
    case "charge": {
      if (chargingStationAt(world, world.agent.position) && world.energyCapacity !== null) {
        world.agent.energy = world.energyCapacity;
      }
      return true;
    }
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Observation flags
// ---------------------------------------------------------------------------

function warehouseObserve(world: World): Record<string, number | boolean> {
  const here = packageAt(world, world.agent.position);
  const delivery = deliveryZoneAt(world, world.agent.position);
  const station = stationAt(world, world.agent.position);
  return {
    warehouse: true,
    packageHere: here !== null,
    deliveryHere: delivery !== null,
    carryingPackage: world.agent.cargo.length > 0,
    packagesRemaining: packagesRemaining(world),
    deliveredCount: deliveredCount(world),
    capacityRemaining: capacityRemaining(world),
    packageRedHere: here?.type === "red",
    packageBlueHere: here?.type === "blue",
    deliveryRedHere: delivery?.acceptsType === "red",
    deliveryBlueHere: delivery?.acceptsType === "blue",
    carryingRed: carryingType(world, "red"),
    carryingBlue: carryingType(world, "blue"),
    chargingHere: chargingStationAt(world, world.agent.position) !== null,
    stationStockHere: station?.remaining ?? 0,
    stationTotalHere: station?.total ?? 0,
  };
}

/** Every domain flag name this module can expose (for editor vocabulary). */
export const WAREHOUSE_FLAGS: DomainFlagSpec[] = [
  { id: "warehouse", type: "bool", label: "Warehouse", meaning: "This run uses warehouse world rules" },
  { id: "packageHere", type: "bool", label: "Package Here", meaning: "A waiting package is on the current tile" },
  { id: "deliveryHere", type: "bool", label: "Delivery Here", meaning: "The robot is standing on a delivery zone" },
  { id: "carryingPackage", type: "bool", label: "Carrying Package", meaning: "Cargo contains one or more packages" },
  { id: "packagesRemaining", type: "number", label: "Packages Remaining", meaning: "Packages not yet delivered, including cargo" },
  { id: "deliveredCount", type: "number", label: "Delivered Count", meaning: "Packages delivered during this run" },
  { id: "capacityRemaining", type: "number", label: "Cargo Space Free", meaning: "Free cargo slots remaining" },
  { id: "packageRedHere", type: "bool", label: "Red Package Here", meaning: "The waiting package is red" },
  { id: "packageBlueHere", type: "bool", label: "Blue Package Here", meaning: "The waiting package is blue" },
  { id: "deliveryRedHere", type: "bool", label: "Red Delivery Here", meaning: "This delivery zone accepts red packages" },
  { id: "deliveryBlueHere", type: "bool", label: "Blue Delivery Here", meaning: "This delivery zone accepts blue packages" },
  { id: "carryingRed", type: "bool", label: "Carrying Red", meaning: "Cargo includes a red package" },
  { id: "carryingBlue", type: "bool", label: "Carrying Blue", meaning: "Cargo includes a blue package" },
  { id: "chargingHere", type: "bool", label: "Charging Station Here", meaning: "The robot is standing on a charging station" },
  { id: "stationStockHere", type: "number", label: "Station Stock Here", meaning: "Packages still waiting or queued at this station" },
  { id: "stationTotalHere", type: "number", label: "Station Total Stock", meaning: "Original package count configured for this station" },
];

// ---------------------------------------------------------------------------
// The module
// ---------------------------------------------------------------------------

export const warehouseModule: WorldModule = {
  id: "warehouse",
  domainActions: ["pickUp", "deliver", "charge"],
  domainFlags: WAREHOUSE_FLAGS,
  actionPreconditions: {
    pickUp: "packageHere && capacityRemaining > 0",
    deliver: "deliveryHere && carryingPackage",
    charge: "chargingHere",
  },
  validate: validateWarehouseData,
  createDomain: createWarehouseRuntime,
  applyAction: applyWarehouseAction,
  resolveStatus(world: World): SimStatus | null {
    return packagesRemaining(world) === 0 ? "reached" : null;
  },
  observe: warehouseObserve,
};
