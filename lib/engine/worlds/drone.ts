/**
 * Drone surveillance world module.
 *
 * A drone is sent to sweep a bounded search area for a target whose position it
 * does not know. The module owns the drone's onboard bookkeeping — which cells
 * the sensor has already covered, whether the target has been picked up, battery
 * endurance and the recharge pad — and exposes all of it as observation facts.
 *
 * The division of labour matters: the *bookkeeping* is the drone's hardware and
 * belongs here, exactly as the base grid tracks `visited` for the maze. The
 * *strategy* — how to sweep, when to break off and home in, when to refuel —
 * stays with the user, in either a visual policy or a Code Controller.
 *
 * Every fact below is a number or boolean because the condition grammar has no
 * strings. A bearing is therefore four booleans (`targetNorth`, `targetEast`, …)
 * rather than one direction value.
 */

import type { Action, SimStatus, Vec2, WorldData } from "../types";
import type { World } from "../world/world";
import { DIRECTIONS, add, delta, equals, isWalkable, key } from "../world/grid";
import type { DomainFlagSpec, WorldModule } from "./module";

// ---------------------------------------------------------------------------
// Authored configuration (content/worlds/*.json → `drone`)
// ---------------------------------------------------------------------------

export interface DroneConfig {
  /** Hidden target the drone must find. Never exposed until detected. */
  target: Vec2;
  /** Optional recharge pad. Known infrastructure — its bearing is always given. */
  pad?: Vec2;
  /**
   * Sensor half-width in cells (Chebyshev). 1 covers the 8 surrounding cells.
   * Held as runtime state, not a constant, so a later level can trade battery
   * for a wider sweep without reworking the sensing code.
   */
  scanRadius?: number;
  /** Energy at or below which `batteryLow` flips true. */
  lowBatteryThreshold?: number;
  /** Energy restored per `recharge` tick, before the per-tick drain. */
  rechargePerTick?: number;
}

type DroneWorldData = WorldData & { drone?: DroneConfig };

function droneConfig(data: WorldData): DroneConfig | undefined {
  return (data as DroneWorldData).drone;
}

const DEFAULT_SCAN_RADIUS = 1;
const DEFAULT_LOW_BATTERY = 8;
const DEFAULT_RECHARGE_PER_TICK = 5;

// ---------------------------------------------------------------------------
// Mutable runtime
// ---------------------------------------------------------------------------

export interface DroneDomain {
  target: Vec2;
  pad: Vec2 | null;
  scanRadius: number;
  lowBatteryThreshold: number;
  rechargePerTick: number;
  /** Cell keys the sensor has covered. The drone's onboard coverage map. */
  scanned: Set<string>;
  /** Total walkable cells in the search area — the coverage denominator. */
  searchableCount: number;
  detected: boolean;
  detectedAtTick: number | null;
  reported: boolean;
  rechargeCount: number;
}

export function droneDomain(world: World): DroneDomain {
  return world.domain as DroneDomain;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function inGrid(data: WorldData, p: Vec2): boolean {
  return (
    Number.isInteger(p?.x) &&
    Number.isInteger(p?.y) &&
    p.y >= 0 &&
    p.y < data.tiles.length &&
    p.x >= 0 &&
    p.x < data.tiles[p.y].length
  );
}

export function validateDroneData(data: WorldData): void {
  const config = droneConfig(data);
  if (!config) throw new Error("[drone] world is missing drone configuration");

  if (!config.target || !inGrid(data, config.target)) {
    throw new Error("[drone] target must be a position inside the search area");
  }
  if (!isWalkable(data.tiles, config.target)) {
    throw new Error("[drone] target cannot sit on a blocked cell");
  }
  if (equals(config.target, data.start)) {
    throw new Error("[drone] target cannot start under the drone");
  }

  if (config.pad) {
    if (!inGrid(data, config.pad)) {
      throw new Error("[drone] recharge pad must be a position inside the search area");
    }
    if (!isWalkable(data.tiles, config.pad)) {
      throw new Error("[drone] recharge pad cannot sit on a blocked cell");
    }
  }

  const radius = config.scanRadius ?? DEFAULT_SCAN_RADIUS;
  if (!Number.isInteger(radius) || radius < 1) {
    throw new Error("[drone] scanRadius must be a whole number of 1 or more");
  }
  if (config.rechargePerTick !== undefined && config.rechargePerTick <= 0) {
    throw new Error("[drone] rechargePerTick must be greater than zero");
  }
  if (config.pad && data.energy === undefined) {
    throw new Error("[drone] a recharge pad needs the world to define energy");
  }
}

// ---------------------------------------------------------------------------
// Sensing
// ---------------------------------------------------------------------------

function countSearchable(tiles: number[][]): number {
  let total = 0;
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y].length; x++) {
      if (isWalkable(tiles, { x, y })) total++;
    }
  }
  return total;
}

/**
 * Cover everything within sensor range of `from`, and pick the target up if it
 * falls inside that footprint. Sensing is passive: it happens every tick, so
 * moving *is* scanning.
 */
function scanFrom(domain: DroneDomain, tiles: number[][], from: Vec2, tick: number): void {
  const r = domain.scanRadius;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const cell = { x: from.x + dx, y: from.y + dy };
      if (isWalkable(tiles, cell)) domain.scanned.add(key(cell));
    }
  }

  const withinRange =
    Math.max(Math.abs(domain.target.x - from.x), Math.abs(domain.target.y - from.y)) <= r;
  if (withinRange && !domain.detected) {
    domain.detected = true;
    domain.detectedAtTick = tick;
  }
}

/**
 * First step of the shortest route to the nearest cell the sensor has not yet
 * covered — the frontier direction. A breadth-first search rather than a
 * straight-line guess, so it still returns a usable heading once a later level
 * adds no-fly zones to route around.
 */
function frontierStep(world: World, domain: DroneDomain): Vec2 | null {
  const start = world.agent.position;
  const seen = new Set<string>([key(start)]);
  // Each entry carries the first move made from the start cell.
  const queue: Array<{ at: Vec2; first: Vec2 | null }> = [{ at: start, first: null }];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.first && !domain.scanned.has(key(node.at))) return node.first;

    for (const dir of DIRECTIONS) {
      const step = delta(dir);
      const next = add(node.at, step);
      if (!isWalkable(world.tiles, next) || seen.has(key(next))) continue;
      seen.add(key(next));
      queue.push({ at: next, first: node.first ?? step });
    }
  }
  return null;
}

/**
 * One step toward the detected target, trying north, east, south, then west —
 * the same order a hand-written four-rule policy would use, so the composite
 * action and the manual version fly identical routes.
 */
function stepTowardTarget(world: World, domain: DroneDomain): Vec2 | null {
  if (!domain.detected) return null;
  const pos = world.agent.position;
  const { target } = domain;
  const candidates: Array<[boolean, Vec2]> = [
    [target.y < pos.y, { x: 0, y: -1 }],
    [target.x > pos.x, { x: 1, y: 0 }],
    [target.y > pos.y, { x: 0, y: 1 }],
    [target.x < pos.x, { x: -1, y: 0 }],
  ];
  for (const [toward, step] of candidates) {
    if (toward && isWalkable(world.tiles, add(pos, step))) return step;
  }
  return null;
}

function manhattan(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// ---------------------------------------------------------------------------
// Observation facts
// ---------------------------------------------------------------------------

const DOMAIN_FLAGS: DomainFlagSpec[] = [
  // --- where the drone may fly -------------------------------------------
  { id: "blockedNorth", type: "bool", label: "Blocked north", meaning: "The cell north is outside the search area or a no-fly zone." },
  { id: "blockedEast", type: "bool", label: "Blocked east", meaning: "The cell east is outside the search area or a no-fly zone." },
  { id: "blockedSouth", type: "bool", label: "Blocked south", meaning: "The cell south is outside the search area or a no-fly zone." },
  { id: "blockedWest", type: "bool", label: "Blocked west", meaning: "The cell west is outside the search area or a no-fly zone." },

  // --- coverage ------------------------------------------------------------
  { id: "scannedNorth", type: "bool", label: "Scanned north", meaning: "The cell north has already been covered by the sensor." },
  { id: "scannedEast", type: "bool", label: "Scanned east", meaning: "The cell east has already been covered by the sensor." },
  { id: "scannedSouth", type: "bool", label: "Scanned south", meaning: "The cell south has already been covered by the sensor." },
  { id: "scannedWest", type: "bool", label: "Scanned west", meaning: "The cell west has already been covered by the sensor." },
  { id: "searchNorth", type: "bool", label: "Search lies north", meaning: "The nearest uncovered cell is reached by flying north first." },
  { id: "searchEast", type: "bool", label: "Search lies east", meaning: "The nearest uncovered cell is reached by flying east first." },
  { id: "searchSouth", type: "bool", label: "Search lies south", meaning: "The nearest uncovered cell is reached by flying south first." },
  { id: "searchWest", type: "bool", label: "Search lies west", meaning: "The nearest uncovered cell is reached by flying west first." },
  { id: "coverage", type: "number", label: "Area covered", meaning: "Share of the search area the sensor has covered.", format: "percent" },
  { id: "areaCovered", type: "bool", label: "Whole area covered", meaning: "Every reachable cell in the search area has been scanned." },
  { id: "searchPending", type: "bool", label: "Ground left to search", meaning: "There is still a reachable cell the sensor has not covered." },
  { id: "scanRadius", type: "number", label: "Sensor radius", meaning: "How many cells out the sensor reaches in each direction." },

  // --- the target ----------------------------------------------------------
  { id: "targetDetected", type: "bool", label: "Target detected", meaning: "The sensor has picked up the target; its bearing is now available." },
  { id: "targetNorth", type: "bool", label: "Target lies north", meaning: "The detected target is north of the drone." },
  { id: "targetEast", type: "bool", label: "Target lies east", meaning: "The detected target is east of the drone." },
  { id: "targetSouth", type: "bool", label: "Target lies south", meaning: "The detected target is south of the drone." },
  { id: "targetWest", type: "bool", label: "Target lies west", meaning: "The detected target is west of the drone." },
  { id: "targetDistance", type: "number", label: "Distance to target", meaning: "Cells between drone and target once detected; -1 before detection." },
  { id: "atTarget", type: "bool", label: "Over the target", meaning: "The drone is directly above the target and can report." },
  { id: "reported", type: "bool", label: "Target reported", meaning: "The find has been reported and the mission is complete." },

  // --- endurance -----------------------------------------------------------
  { id: "batteryLow", type: "bool", label: "Battery low", meaning: "Remaining battery has fallen to the level where refuelling matters." },
  { id: "onPad", type: "bool", label: "On the pad", meaning: "The drone is sitting on the recharge pad and can recharge." },
  { id: "padNorth", type: "bool", label: "Pad lies north", meaning: "The recharge pad is north of the drone." },
  { id: "padEast", type: "bool", label: "Pad lies east", meaning: "The recharge pad is east of the drone." },
  { id: "padSouth", type: "bool", label: "Pad lies south", meaning: "The recharge pad is south of the drone." },
  { id: "padWest", type: "bool", label: "Pad lies west", meaning: "The recharge pad is west of the drone." },
  { id: "padDistance", type: "number", label: "Distance to pad", meaning: "Cells between the drone and the recharge pad; -1 when there is no pad." },
];

/** Apply one grid step, keeping the shared visited set current. */
function moveBy(world: World, step: Vec2): void {
  const destination = add(world.agent.position, step);
  if (isWalkable(world.tiles, destination)) {
    world.agent.position = destination;
    // The renderer's flight trail and the generic `visitedCount` fact read
    // from this set, so domain movement has to maintain it too.
    world.agent.visited.add(key(destination));
  } else {
    world.lastMoveBlocked = true;
  }
}

const MOVES: Record<string, Vec2> = {
  moveNorth: { x: 0, y: -1 },
  moveEast: { x: 1, y: 0 },
  moveSouth: { x: 0, y: 1 },
  moveWest: { x: -1, y: 0 },
};

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const droneModule: WorldModule = {
  id: "drone",

  // The drone legitimately re-crosses covered ground to home in on the target
  // or return to the pad, so the generic "no new tile ⇒ stuck" heuristic would
  // fire on correct behaviour. Completion is owned here instead.
  tracksMovement: false,

  // The four cardinal steps are the primitive vocabulary. `flyToTarget` and
  // `flyToSearch` are composites: the module resolves the bearing to a single
  // cardinal step, the same way Parking's `parkStandard` resolves "nearest free
  // standard space". They let a policy express the search/track switch without
  // spelling out four near-identical rules per direction.
  domainActions: [
    "moveNorth",
    "moveEast",
    "moveSouth",
    "moveWest",
    "flyToTarget",
    "flyToSearch",
    "report",
    "recharge",
  ],

  domainFlags: DOMAIN_FLAGS,

  actionPreconditions: {
    moveNorth: "!blockedNorth",
    moveEast: "!blockedEast",
    moveSouth: "!blockedSouth",
    moveWest: "!blockedWest",
    flyToTarget: "targetDetected && !atTarget",
    flyToSearch: "searchPending",
    report: "atTarget",
    recharge: "onPad",
  },

  validate: validateDroneData,

  createDomain(data: WorldData): DroneDomain {
    const config = droneConfig(data)!;
    const domain: DroneDomain = {
      target: { ...config.target },
      pad: config.pad ? { ...config.pad } : null,
      scanRadius: config.scanRadius ?? DEFAULT_SCAN_RADIUS,
      lowBatteryThreshold: config.lowBatteryThreshold ?? DEFAULT_LOW_BATTERY,
      rechargePerTick: config.rechargePerTick ?? DEFAULT_RECHARGE_PER_TICK,
      scanned: new Set<string>(),
      searchableCount: countSearchable(data.tiles),
      detected: false,
      detectedAtTick: null,
      reported: false,
      rechargeCount: 0,
    };
    // The drone is already sensing when it powers up on the launch cell.
    scanFrom(domain, data.tiles, data.start, 0);
    return domain;
  },

  applyAction(world: World, action: Action): boolean {
    const domain = droneDomain(world);

    const step = MOVES[action.type];
    if (step) {
      moveBy(world, step);
      return true;
    }

    if (action.type === "flyToTarget") {
      const toward = stepTowardTarget(world, domain);
      if (toward) moveBy(world, toward);
      else world.lastMoveBlocked = true;
      return true;
    }

    if (action.type === "flyToSearch") {
      const toward = frontierStep(world, domain);
      if (toward) moveBy(world, toward);
      else world.lastMoveBlocked = true;
      return true;
    }

    if (action.type === "report") {
      if (equals(world.agent.position, domain.target)) domain.reported = true;
      return true;
    }

    if (action.type === "recharge") {
      const onPad = domain.pad !== null && equals(world.agent.position, domain.pad);
      if (onPad && world.agent.energy !== null && world.energyCapacity !== null) {
        world.agent.energy = Math.min(
          world.energyCapacity,
          world.agent.energy + domain.rechargePerTick,
        );
        domain.rechargeCount += 1;
      }
      return true;
    }

    return false; // `wait` and the base primitives fall through to the engine
  },

  /**
   * Sensing is passive and continuous, so it runs after every tick regardless of
   * which action was taken — hovering and recharging scan just as moving does.
   */
  advanceTick(world: World): void {
    const domain = droneDomain(world);
    scanFrom(domain, world.tiles, world.agent.position, world.tick);
  },

  resolveStatus(world: World): SimStatus | null {
    return droneDomain(world).reported ? "reached" : null;
  },

  observe(world: World): Record<string, number | boolean> {
    const domain = droneDomain(world);
    const pos = world.agent.position;
    const { target, pad } = domain;

    const blocked = (dir: (typeof DIRECTIONS)[number]) =>
      !isWalkable(world.tiles, add(pos, delta(dir)));
    const scanned = (dir: (typeof DIRECTIONS)[number]) =>
      domain.scanned.has(key(add(pos, delta(dir))));

    const frontier = frontierStep(world, domain);
    const detected = domain.detected;
    const energy = world.agent.energy;

    return {
      blockedNorth: blocked("N"),
      blockedEast: blocked("E"),
      blockedSouth: blocked("S"),
      blockedWest: blocked("W"),

      scannedNorth: scanned("N"),
      scannedEast: scanned("E"),
      scannedSouth: scanned("S"),
      scannedWest: scanned("W"),
      searchNorth: frontier?.y === -1,
      searchEast: frontier?.x === 1,
      searchSouth: frontier?.y === 1,
      searchWest: frontier?.x === -1,
      coverage:
        domain.searchableCount === 0
          ? 0
          : (domain.scanned.size / domain.searchableCount) * 100,
      areaCovered: domain.scanned.size >= domain.searchableCount,
      searchPending: frontier !== null,
      scanRadius: domain.scanRadius,

      targetDetected: detected,
      // Bearings stay false until detection, so an undetected target leaks nothing.
      targetNorth: detected && target.y < pos.y,
      targetEast: detected && target.x > pos.x,
      targetSouth: detected && target.y > pos.y,
      targetWest: detected && target.x < pos.x,
      targetDistance: detected ? manhattan(pos, target) : -1,
      atTarget: detected && equals(pos, target),
      reported: domain.reported,

      batteryLow: energy !== null && energy <= domain.lowBatteryThreshold,
      onPad: pad !== null && equals(pos, pad),
      padNorth: pad !== null && pad.y < pos.y,
      padEast: pad !== null && pad.x > pos.x,
      padSouth: pad !== null && pad.y > pos.y,
      padWest: pad !== null && pad.x < pos.x,
      padDistance: pad === null ? -1 : manhattan(pos, pad),
    };
  },
};
