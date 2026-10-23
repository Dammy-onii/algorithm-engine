/**
 * Warehouse yard world module — run the outbound operation of a hub.
 *
 * Pallets are staged across the yard in front of the warehouse. Most are
 * addressed to the store this truck serves; a few are tagged for other stores
 * and must stay in the yard. One policy runs the whole operation:
 *
 *   - the forklift: pick a pallet to work on, check its tag, drive to it, lift
 *     it, carry it to the dock, and load it onto the truck;
 *   - the truck: dispatch it to the store once it is full (or nothing is left
 *     to load). A dispatched truck drives out, unloads and returns on its own
 *     over several ticks, while the forklift carries on.
 *
 * The module owns the bookkeeping (what is where, the truck's trip clock, what
 * reached the store and what was mis-shipped) and exposes it as facts. Routing
 * around racks is handled by the drive actions; *which* pallet to move, whether
 * it belongs on this truck, and when the truck leaves are the policy's calls.
 */

import type { Action, Direction, SimStatus, Vec2, WorldData } from "../types";
import type { World } from "../world/world";
import { DIRECTIONS, add, delta, equals, isWalkable, key } from "../world/grid";
import type { DomainFlagSpec, WorldModule } from "./module";

// ---------------------------------------------------------------------------
// Authored configuration (content/worlds/*.json → `warehouse`)
// ---------------------------------------------------------------------------

export interface WarehousePalletConfig {
  id?: string;
  col: number;
  row: number;
  /** Destination store printed on the pallet's tag. */
  store: string;
  /** Display-only product label. */
  sku?: string;
}

export interface WarehouseConfig {
  /** The cell at the truck's rear doors, where pallets are loaded. */
  dock: Vec2;
  /** The store this truck delivers to. Pallets tagged for it belong on board. */
  store: string;
  pallets: WarehousePalletConfig[];
  truck: {
    id?: string;
    /** Pallets the truck holds per trip. */
    capacity: number;
    /** Ticks to drive from the dock to the store (and the same back). */
    tripTicks: number;
    /** Ticks spent unloading at the store. */
    unloadTicks: number;
  };
  forkliftId?: string;
}

type WarehouseWorldData = WorldData & { warehouse?: WarehouseConfig };

function warehouseConfig(data: WorldData): WarehouseConfig | undefined {
  return (data as WarehouseWorldData).warehouse;
}

// ---------------------------------------------------------------------------
// Mutable runtime
// ---------------------------------------------------------------------------

export type PalletState = "waiting" | "carried" | "onTruck" | "delivered";

export interface WarehousePallet {
  id: string;
  pos: Vec2;
  store: string;
  sku: string;
  forRoute: boolean;
  state: PalletState;
  /** The policy checked this pallet's tag and left it in the yard. */
  held: boolean;
  /** Position in the current truck load (0-based), or -1. */
  loadSlot: number;
}

export type TruckPhase = "docked" | "outbound" | "unloading" | "returning";

export interface WarehouseTruck {
  id: string;
  capacity: number;
  tripTicks: number;
  unloadTicks: number;
  phase: TruckPhase;
  /** Ticks left in the current phase (0 while docked). */
  timer: number;
  /** Pallet ids aboard, in load order. */
  load: string[];
  trips: number;
}

export interface WarehouseDomain {
  dock: Vec2;
  store: string;
  forkliftId: string;
  pallets: WarehousePallet[];
  truck: WarehouseTruck;
  /** The pallet the forklift is working toward, if any. */
  targetId: string | null;
  misShips: number;
  /** Snapshot of everything that can change, to detect a stalled yard. */
  fingerprint: string;
  /** Tick of the last change to that snapshot. */
  lastChange: number;
}

/**
 * Ticks the yard may sit completely unchanged, truck in the bay, before the
 * run ends as stuck. Short enough that a policy missing a decision fails fast
 * and visibly, instead of idling until the battery runs out.
 */
export const STALL_TICKS = 12;

/** Actions that drive the forklift; only these draw on its battery. */
const DRIVING = new Set(["moveNorth", "moveEast", "moveSouth", "moveWest", "driveToTarget", "driveToDock"]);

export function warehouseDomain(world: World): WarehouseDomain {
  return world.domain as WarehouseDomain;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateWarehouseData(data: WorldData): void {
  const config = warehouseConfig(data);
  if (!config) throw new Error("[warehouse] world is missing warehouse configuration");
  if (!Array.isArray(config.pallets) || config.pallets.length === 0) {
    throw new Error("[warehouse] at least one pallet is required");
  }
  if (!config.pallets.some((p) => p.store === config.store)) {
    throw new Error("[warehouse] no pallet is addressed to the truck's store");
  }
  if (!config.truck || !(config.truck.capacity > 0)) {
    throw new Error("[warehouse] the truck needs a positive capacity");
  }
  if (!(config.truck.tripTicks > 0) || !(config.truck.unloadTicks > 0)) {
    throw new Error("[warehouse] tripTicks and unloadTicks must be positive");
  }
  if (!isWalkable(data.tiles, config.dock)) {
    throw new Error("[warehouse] the dock must sit on an open cell");
  }
  const seen = new Set<string>([key(config.dock)]);
  for (const pallet of config.pallets) {
    const p = { x: pallet.col, y: pallet.row };
    if (!isWalkable(data.tiles, p)) {
      throw new Error(`[warehouse] pallet at (${pallet.col},${pallet.row}) is off-grid or blocked`);
    }
    if (seen.has(key(p))) {
      throw new Error(`[warehouse] pallet at (${pallet.col},${pallet.row}) overlaps the dock or another pallet`);
    }
    seen.add(key(p));
  }
}

// ---------------------------------------------------------------------------
// Pathfinding
// ---------------------------------------------------------------------------

/** Shortest walkable path from `from` to `to` (excluding `from`), or null. */
export function warehousePath(world: World, from: Vec2, to: Vec2): Vec2[] | null {
  if (equals(from, to)) return [];
  const prev = new Map<string, Vec2 | null>([[key(from), null]]);
  const queue: Vec2[] = [from];
  while (queue.length > 0) {
    const at = queue.shift()!;
    for (const dir of DIRECTIONS) {
      const next = add(at, delta(dir));
      if (!isWalkable(world.tiles, next) || prev.has(key(next))) continue;
      prev.set(key(next), at);
      if (equals(next, to)) {
        const path: Vec2[] = [next];
        let back = at;
        while (!equals(back, from)) {
          path.unshift(back);
          back = prev.get(key(back))!;
        }
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

function directionOf(step: Vec2): Direction {
  if (step.x > 0) return "E";
  if (step.x < 0) return "W";
  return step.y > 0 ? "S" : "N";
}

/** Apply one grid step, turning the forklift to face where it drives. */
function moveBy(world: World, step: Vec2): void {
  const destination = add(world.agent.position, step);
  world.agent.direction = directionOf(step);
  if (isWalkable(world.tiles, destination)) {
    world.agent.position = destination;
    world.agent.visited.add(key(destination));
  } else {
    world.lastMoveBlocked = true;
  }
}

function driveToward(world: World, to: Vec2): void {
  const path = warehousePath(world, world.agent.position, to);
  if (path && path.length > 0) {
    const next = path[0];
    moveBy(world, { x: next.x - world.agent.position.x, y: next.y - world.agent.position.y });
  } else {
    world.lastMoveBlocked = true;
  }
}

function palletAt(domain: WarehouseDomain, p: Vec2): WarehousePallet | undefined {
  return domain.pallets.find((pallet) => pallet.state === "waiting" && equals(pallet.pos, p));
}

function target(domain: WarehouseDomain): WarehousePallet | undefined {
  const t = domain.pallets.find((p) => p.id === domain.targetId);
  return t && t.state === "waiting" ? t : undefined;
}

function carried(domain: WarehouseDomain): WarehousePallet | undefined {
  return domain.pallets.find((p) => p.state === "carried");
}

/** Where the forklift is currently heading: the dock with a load, else its target. */
export function warehouseDestination(world: World): Vec2 | null {
  const domain = warehouseDomain(world);
  if (carried(domain)) return domain.dock;
  return target(domain)?.pos ?? null;
}

/**
 * Plain-language reason a stalled yard stopped, for the renderer to show.
 * Covers the decisions this level asks for; falls back to a generic line.
 */
export function warehouseStallReason(world: World): string {
  const domain = warehouseDomain(world);
  const truck = domain.truck;
  const route = domain.pallets.filter((p) => p.forRoute);
  const left = route.filter((p) => p.state === "waiting" || p.state === "carried").length;
  const carried = carried_(domain);
  if (truck.load.length > 0 && truck.load.length >= truck.capacity) {
    return `The truck is full (${truck.load.length}/${truck.capacity}) but no rule dispatched it.`;
  }
  if (truck.load.length > 0 && left === 0) {
    return `The truck has ${truck.load.length} pallet${truck.load.length === 1 ? "" : "s"} aboard and nothing left to load, but no rule dispatched it.`;
  }
  if (carried && !carried.forRoute) {
    return `The forklift is holding ${carried.id}, a pallet for ${carried.store}, and nothing will load it.`;
  }
  if (domain.targetId && !route.some((p) => p.id === domain.targetId)) {
    return "The targeted pallet is for another store and no rule leaves it.";
  }
  return "Nothing changed for several ticks — no rule matched what the yard needed next.";
}

function carried_(domain: WarehouseDomain): WarehousePallet | undefined {
  return domain.pallets.find((p) => p.state === "carried");
}

// ---------------------------------------------------------------------------
// Observation facts
// ---------------------------------------------------------------------------

const DOMAIN_FLAGS: DomainFlagSpec[] = [
  { id: "blockedNorth", type: "bool", label: "Blocked north", meaning: "The cell north is outside the yard or blocked." },
  { id: "blockedEast", type: "bool", label: "Blocked east", meaning: "The cell east is outside the yard or blocked." },
  { id: "blockedSouth", type: "bool", label: "Blocked south", meaning: "The cell south is outside the yard or blocked." },
  { id: "blockedWest", type: "bool", label: "Blocked west", meaning: "The cell west is outside the yard or blocked." },

  { id: "hasTarget", type: "bool", label: "Pallet targeted", meaning: "The forklift has picked a pallet to work on." },
  { id: "targetForRoute", type: "bool", label: "Target is for this store", meaning: "The targeted pallet's tag matches the truck's store." },
  { id: "atTarget", type: "bool", label: "At the target", meaning: "The forklift is on the targeted pallet's cell." },
  { id: "distanceToTarget", type: "number", label: "Distance to target", meaning: "Driving steps to the targeted pallet (0 if none)." },
  { id: "palletsHeld", type: "number", label: "Pallets left in yard", meaning: "Pallets the policy checked and left in the yard." },
  { id: "palletsUnchecked", type: "number", label: "Pallets not yet checked", meaning: "Pallets in the yard that have not been targeted and left." },

  { id: "palletHere", type: "bool", label: "Pallet here", meaning: "A pallet sits on the forklift's cell." },
  { id: "palletHereForRoute", type: "bool", label: "Pallet here is for this store", meaning: "The pallet on this cell is tagged for the truck's store." },
  { id: "carryingPallet", type: "bool", label: "Carrying a pallet", meaning: "The forklift has a pallet on its forks." },
  { id: "carriedForRoute", type: "bool", label: "Carried pallet is for this store", meaning: "The pallet on the forks is tagged for the truck's store." },
  { id: "atDock", type: "bool", label: "At the loading dock", meaning: "The forklift is at the truck's rear doors." },
  { id: "distanceToDock", type: "number", label: "Distance to dock", meaning: "Driving steps from the forklift to the loading dock." },

  { id: "truckAtDock", type: "bool", label: "Truck at the dock", meaning: "The truck is parked in the bay and can be loaded or dispatched." },
  { id: "truckAway", type: "bool", label: "Truck away", meaning: "The truck is driving to the store, unloading, or driving back." },
  { id: "truckLoad", type: "number", label: "Truck load", meaning: "Pallets aboard the truck." },
  { id: "truckCapacity", type: "number", label: "Truck capacity", meaning: "Pallets the truck carries per trip." },
  { id: "truckFull", type: "bool", label: "Truck full", meaning: "The truck holds as many pallets as it can carry." },
  { id: "truckTrips", type: "number", label: "Truck trips", meaning: "Completed round trips to the store." },
  { id: "truckEta", type: "number", label: "Ticks until truck returns", meaning: "Ticks until the truck is back at the dock (0 when docked)." },

  { id: "routePalletsLeft", type: "number", label: "Store pallets still to load", meaning: "Pallets for this store still in the yard or on the forks." },
  { id: "routePalletsDelivered", type: "number", label: "Store pallets delivered", meaning: "Pallets for this store that have reached it." },
  { id: "routePalletsTotal", type: "number", label: "Store pallets in total", meaning: "Pallets in the yard addressed to this store." },
  { id: "allDelivered", type: "bool", label: "Everything delivered", meaning: "Every pallet for this store has reached it." },
  { id: "misShips", type: "number", label: "Mis-shipped pallets", meaning: "Pallets for another store that were delivered here by mistake." },
];

const MOVES: Record<string, Vec2> = {
  moveNorth: { x: 0, y: -1 },
  moveEast: { x: 1, y: 0 },
  moveSouth: { x: 0, y: 1 },
  moveWest: { x: -1, y: 0 },
};

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const warehouseModule: WorldModule = {
  id: "warehouse",

  // The forklift shuttles back and forth over the same ground, so completion
  // is owned here rather than by the idle-tile heuristic.
  tracksMovement: false,

  domainActions: [
    "moveNorth",
    "moveEast",
    "moveSouth",
    "moveWest",
    "targetPallet",
    "leavePallet",
    "driveToTarget",
    "liftPallet",
    "driveToDock",
    "loadTruck",
    "dispatchTruck",
  ],

  domainFlags: DOMAIN_FLAGS,

  actionPreconditions: {
    moveNorth: "!blockedNorth",
    moveEast: "!blockedEast",
    moveSouth: "!blockedSouth",
    moveWest: "!blockedWest",
    targetPallet: "!hasTarget && !carryingPallet && palletsUnchecked > 0",
    leavePallet: "hasTarget",
    driveToTarget: "hasTarget && !atTarget",
    liftPallet: "palletHere && !carryingPallet",
    driveToDock: "distanceToDock > 0",
    loadTruck: "atDock && carryingPallet && truckAtDock && !truckFull",
    dispatchTruck: "truckAtDock && truckLoad > 0",
  },

  validate: validateWarehouseData,

  createDomain(data: WorldData): WarehouseDomain {
    const config = warehouseConfig(data)!;
    return {
      dock: { ...config.dock },
      store: config.store,
      forkliftId: config.forkliftId ?? "FL-01",
      pallets: config.pallets.map((p, i) => ({
        id: p.id ?? `PAL-${i + 1}`,
        pos: { x: p.col, y: p.row },
        store: p.store,
        sku: p.sku ?? "Mixed goods",
        forRoute: p.store === config.store,
        state: "waiting" as PalletState,
        held: false,
        loadSlot: -1,
      })),
      truck: {
        id: config.truck.id ?? "TRK-01",
        capacity: config.truck.capacity,
        tripTicks: config.truck.tripTicks,
        unloadTicks: config.truck.unloadTicks,
        phase: "docked",
        timer: 0,
        load: [],
        trips: 0,
      },
      targetId: null,
      misShips: 0,
      fingerprint: "",
      lastChange: 0,
    };
  },

  applyAction(world: World, action: Action): boolean {
    const domain = warehouseDomain(world);
    const truck = domain.truck;

    // The battery is spent driving. Everything else — screening, lifting,
    // loading, dispatching, waiting for the truck — is refunded against the
    // engine's per-tick drain, so a slow but valid policy cannot run flat.
    if (!DRIVING.has(action.type) && world.agent.energy !== null) world.agent.energy += 1;
    if (action.type === "wait") return true;

    const step = MOVES[action.type];
    if (step) {
      moveBy(world, step);
      return true;
    }

    switch (action.type) {
      case "targetPallet": {
        // Nearest pallet not yet checked; ties go to manifest order.
        let best: WarehousePallet | undefined;
        let bestDist = Number.POSITIVE_INFINITY;
        for (const p of domain.pallets) {
          if (p.state !== "waiting" || p.held) continue;
          const path = warehousePath(world, world.agent.position, p.pos);
          if (path && path.length < bestDist) {
            best = p;
            bestDist = path.length;
          }
        }
        domain.targetId = best?.id ?? null;
        return true;
      }
      case "leavePallet": {
        const t = target(domain);
        if (t) t.held = true;
        domain.targetId = null;
        return true;
      }
      case "driveToTarget": {
        const t = target(domain);
        if (t) driveToward(world, t.pos);
        else world.lastMoveBlocked = true;
        return true;
      }
      case "liftPallet": {
        const here = palletAt(domain, world.agent.position);
        if (here && !carried(domain)) {
          here.state = "carried";
          if (domain.targetId === here.id) domain.targetId = null;
        }
        return true;
      }
      case "driveToDock":
        driveToward(world, domain.dock);
        return true;
      case "loadTruck": {
        const p = carried(domain);
        if (p && equals(world.agent.position, domain.dock) && truck.phase === "docked" && truck.load.length < truck.capacity) {
          p.state = "onTruck";
          p.loadSlot = truck.load.length;
          truck.load.push(p.id);
        }
        return true;
      }
      case "dispatchTruck":
        if (truck.phase === "docked" && truck.load.length > 0) {
          truck.phase = "outbound";
          truck.timer = truck.tripTicks;
        }
        return true;
    }

    return false; // `wait` falls through to the engine
  },

  advanceTick(world: World): void {
    const truck = warehouseDomain(world).truck;
    if (truck.phase === "docked") return;
    truck.timer -= 1;
    if (truck.timer > 0) return;

    const domain = warehouseDomain(world);
    if (truck.phase === "outbound") {
      truck.phase = "unloading";
      truck.timer = truck.unloadTicks;
    } else if (truck.phase === "unloading") {
      for (const id of truck.load) {
        const p = domain.pallets.find((q) => q.id === id)!;
        p.state = "delivered";
        if (!p.forRoute) domain.misShips += 1;
      }
      truck.load = [];
      truck.phase = "returning";
      truck.timer = truck.tripTicks;
    } else {
      truck.phase = "docked";
      truck.timer = 0;
      truck.trips += 1;
    }
  },

  resolveStatus(world: World): SimStatus | null {
    const domain = warehouseDomain(world);
    const delivered = domain.pallets.every((p) => !p.forRoute || p.state === "delivered");
    if (delivered && domain.truck.phase === "docked") return "reached";

    const print = [
      key(world.agent.position),
      domain.targetId,
      domain.truck.phase,
      domain.truck.load.length,
      ...domain.pallets.map((p) => p.state[0] + (p.held ? "h" : "")),
    ].join("|");
    if (print !== domain.fingerprint) {
      domain.fingerprint = print;
      domain.lastChange = world.tick;
    }
    // While the truck is away the yard may legitimately wait for it.
    return domain.truck.phase === "docked" && world.tick - domain.lastChange >= STALL_TICKS ? "stuck" : null;
  },

  observe(world: World): Record<string, number | boolean> {
    const domain = warehouseDomain(world);
    const truck = domain.truck;
    const pos = world.agent.position;
    const blocked = (dir: Direction) => !isWalkable(world.tiles, add(pos, delta(dir)));
    const t = target(domain);
    const here = palletAt(domain, pos);
    const onForks = carried(domain);
    const dockPath = warehousePath(world, pos, domain.dock);
    const targetPath = t ? warehousePath(world, pos, t.pos) : null;
    const route = domain.pallets.filter((p) => p.forRoute);

    const truckEta =
      truck.phase === "outbound" ? truck.timer + truck.unloadTicks + truck.tripTicks
      : truck.phase === "unloading" ? truck.timer + truck.tripTicks
      : truck.phase === "returning" ? truck.timer
      : 0;

    return {
      blockedNorth: blocked("N"),
      blockedEast: blocked("E"),
      blockedSouth: blocked("S"),
      blockedWest: blocked("W"),

      hasTarget: t !== undefined,
      targetForRoute: t?.forRoute ?? false,
      atTarget: t !== undefined && equals(pos, t.pos),
      distanceToTarget: targetPath?.length ?? 0,
      palletsHeld: domain.pallets.filter((p) => p.held).length,
      palletsUnchecked: domain.pallets.filter((p) => p.state === "waiting" && !p.held).length,

      palletHere: here !== undefined,
      palletHereForRoute: here?.forRoute ?? false,
      carryingPallet: onForks !== undefined,
      carriedForRoute: onForks?.forRoute ?? false,
      atDock: equals(pos, domain.dock),
      distanceToDock: dockPath?.length ?? 0,

      truckAtDock: truck.phase === "docked",
      truckAway: truck.phase !== "docked",
      truckLoad: truck.load.length,
      truckCapacity: truck.capacity,
      truckFull: truck.load.length >= truck.capacity,
      truckEta,
      truckTrips: truck.trips,

      routePalletsLeft: route.filter((p) => p.state === "waiting" || p.state === "carried").length,
      routePalletsDelivered: route.filter((p) => p.state === "delivered").length,
      routePalletsTotal: route.length,
      allDelivered: route.every((p) => p.state === "delivered"),
      misShips: domain.misShips,
    };
  },
};
