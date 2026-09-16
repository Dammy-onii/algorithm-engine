/**
 * Cargo retrieval world module — the drone as a logistics agent.
 *
 * Unlike the search world, nothing here is hidden: the mission manifest gives
 * every object's location, weight, and value up front. The hard part is not
 * finding things, it is *deciding* — which objects to carry given a weight cap,
 * in what order, over how many trips, before the battery runs out. Heavier loads
 * drain more battery per move, so carrying the wrong things far is what kills a
 * run.
 *
 * This is the same division of labour as every other module: the module owns the
 * bookkeeping (what is carried, what is delivered, load, battery drain, whether
 * the mission is complete) and exposes it as facts; the *strategy* — greedy,
 * knapsack, routed — stays with the user, in a visual policy or a Code
 * Controller.
 *
 * The condition grammar has no strings or arrays, so the manifest is exposed as
 * flat numeric facts: `obj0Weight`, `obj0Col`, `obj0Active`, and so on. A Code
 * Controller reads the whole bag from `observation.domain` and can run its own
 * knapsack over it.
 *
 * Deliberately absent: any action that picks a crate for the agent. There is no
 * "fly to the nearest one that fits" — that would make the selection silently,
 * which is the decision this world exists to assess. Selection happens only when
 * a policy invokes `runKnapsack`, ordering only when it invokes `planRoute`, and
 * `flyToPlanTarget` follows the result. Cardinal moves remain for a policy that
 * would rather navigate itself.
 */

import type { Action, SimStatus, Vec2, WorldData } from "../types";
import type { World } from "../world/world";
import { DIRECTIONS, add, delta, equals, isWalkable, key } from "../world/grid";
import type { DomainFlagSpec, WorldModule } from "./module";

// ---------------------------------------------------------------------------
// Authored configuration (content/worlds/*.json → `cargo`)
// ---------------------------------------------------------------------------

export interface CargoObjectConfig {
  id?: string;
  col: number;
  row: number;
  weight: number;
  /** Value of delivering this object. Named `value` to avoid the retired
   *  "priority" execution vocabulary; surfaced to learners as "value". */
  value: number;
}

export interface CargoConfig {
  /** Where objects must be returned to. Defaults to the world start. */
  depot?: Vec2;
  objects: CargoObjectConfig[];
  /** Maximum total weight the drone can carry at once. */
  capacity: number;
  /** Total delivered value the mission requires before a homecoming succeeds. */
  valueTarget: number;
  /** Extra battery drained per unit of carried weight, per move. */
  drainPerWeight?: number;
  /** Battery at or below which `batteryLow` flips true. */
  lowBatteryThreshold?: number;
  /** Battery restored per `recharge` tick at the depot, before the per-tick drain. */
  rechargePerTick?: number;
}

type CargoWorldData = WorldData & { cargo?: CargoConfig };

function cargoConfig(data: WorldData): CargoConfig | undefined {
  return (data as CargoWorldData).cargo;
}

/** Domain flags declare per-object facts up to this many objects. */
export const CARGO_OBJECT_SLOTS = 8;

const DEFAULT_DRAIN_PER_WEIGHT = 0.5;
const DEFAULT_LOW_BATTERY = 20;
const DEFAULT_RECHARGE_PER_TICK = 8;

/** Above this many crates in one plan, route ordering falls back to nearest-neighbour. */
const EXACT_ROUTE_LIMIT = 6;

// ---------------------------------------------------------------------------
// Mutable runtime
// ---------------------------------------------------------------------------

type CargoObjectState = "active" | "carried" | "delivered";

export interface CargoObject {
  id: string;
  pos: Vec2;
  weight: number;
  value: number;
  state: CargoObjectState;
}

export interface CargoDomain {
  depot: Vec2;
  capacity: number;
  valueTarget: number;
  drainPerWeight: number;
  lowBatteryThreshold: number;
  objects: CargoObject[];
  /** Carried weight, kept in step with object states. */
  rechargePerTick: number;
  load: number;
  deliveredValue: number;
  deliveredCount: number;
  /**
   * The current mission plan: object ids the policy committed to collecting on
   * this trip, in the order they will be visited. Written only by `runKnapsack`
   * (which chooses the set) and `planRoute` (which orders it), and cleared by
   * `clearPlan`. Nothing else in the module consults it — a policy that never
   * plans simply has none.
   */
  plan: string[];
  /** Whether `planRoute` has ordered the current plan. */
  planRouted: boolean;
  rechargeCount: number;
}

export function cargoDomain(world: World): CargoDomain {
  return world.domain as CargoDomain;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function pos(o: CargoObjectConfig): Vec2 {
  return { x: o.col, y: o.row };
}

export function validateCargoData(data: WorldData): void {
  const config = cargoConfig(data);
  if (!config) throw new Error("[cargo] world is missing cargo configuration");

  if (!Array.isArray(config.objects) || config.objects.length === 0) {
    throw new Error("[cargo] at least one object is required");
  }
  if (config.objects.length > CARGO_OBJECT_SLOTS) {
    throw new Error(`[cargo] at most ${CARGO_OBJECT_SLOTS} objects are supported`);
  }
  if (!(config.capacity > 0)) {
    throw new Error("[cargo] capacity must be greater than zero");
  }
  if (!(config.valueTarget > 0)) {
    throw new Error("[cargo] valueTarget must be greater than zero");
  }
  if (data.energy === undefined) {
    throw new Error("[cargo] a cargo run needs the world to define energy (battery)");
  }

  const depot = config.depot ?? data.start;
  if (!isWalkable(data.tiles, depot)) {
    throw new Error("[cargo] the depot must sit on an open cell");
  }

  const seen = new Set<string>();
  let deliverableValue = 0;
  let maxWeight = 0;
  for (const object of config.objects) {
    const p = pos(object);
    if (!isWalkable(data.tiles, p)) {
      throw new Error(`[cargo] object at (${object.col},${object.row}) is off-grid or blocked`);
    }
    if (seen.has(key(p))) {
      throw new Error(`[cargo] two objects share cell (${object.col},${object.row})`);
    }
    seen.add(key(p));
    if (!(object.weight > 0)) throw new Error("[cargo] every object needs a positive weight");
    if (!(object.value > 0)) throw new Error("[cargo] every object needs a positive value");
    if (object.weight > config.capacity) {
      throw new Error(`[cargo] object at (${object.col},${object.row}) is heavier than capacity`);
    }
    maxWeight = Math.max(maxWeight, object.weight);
    deliverableValue += object.value;
  }

  if (config.valueTarget > deliverableValue) {
    throw new Error("[cargo] valueTarget exceeds the total value of all objects");
  }
}

// ---------------------------------------------------------------------------
// Pathfinding — breadth-first, so it still works once a level adds obstacles
// ---------------------------------------------------------------------------

interface BfsResult {
  step: Vec2 | null;
  dist: number;
}

/** First step and distance to the nearest cell satisfying `isGoal`. */
function bfsNearest(world: World, isGoal: (p: Vec2) => boolean): BfsResult {
  const start = world.agent.position;
  if (isGoal(start)) return { step: null, dist: 0 };
  const seen = new Set<string>([key(start)]);
  const queue: Array<{ at: Vec2; first: Vec2 | null; dist: number }> = [
    { at: start, first: null, dist: 0 },
  ];

  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const dir of DIRECTIONS) {
      const step = delta(dir);
      const next = add(node.at, step);
      if (!isWalkable(world.tiles, next) || seen.has(key(next))) continue;
      const first = node.first ?? step;
      if (isGoal(next)) return { step: first, dist: node.dist + 1 };
      seen.add(key(next));
      queue.push({ at: next, first, dist: node.dist + 1 });
    }
  }
  return { step: null, dist: -1 };
}

function manhattan(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Apply one grid step, keeping the shared visited set current. */
function moveBy(world: World, step: Vec2): boolean {
  const destination = add(world.agent.position, step);
  if (isWalkable(world.tiles, destination)) {
    world.agent.position = destination;
    world.agent.visited.add(key(destination));
    return true;
  }
  world.lastMoveBlocked = true;
  return false;
}

/** Active object at a position, if any. */
function activeObjectAt(domain: CargoDomain, p: Vec2): CargoObject | undefined {
  return domain.objects.find((o) => o.state === "active" && equals(o.pos, p));
}

function extraDrain(domain: CargoDomain): number {
  return Math.ceil(domain.load * domain.drainPerWeight);
}

// ---------------------------------------------------------------------------
// Mission planning — the two solvers a policy may invoke as actions
//
// These are deliberately *explicit*. Nothing here runs unless a rule fires
// `runKnapsack` or `planRoute`, and neither action moves the drone. A policy
// that never invokes them has no plan and cannot use `flyToPlanTarget` at all.
// The module supplies the solvers; the policy decides when to call them, what
// to do with the result, and when the plan has gone stale.
// ---------------------------------------------------------------------------

function objectById(domain: CargoDomain, id: string): CargoObject | undefined {
  return domain.objects.find((o) => o.id === id);
}

/** Crates in the current plan that are still on the ground, in plan order. */
function pendingPlan(domain: CargoDomain): CargoObject[] {
  return domain.plan
    .map((id) => objectById(domain, id))
    .filter((o): o is CargoObject => o !== undefined && o.state === "active");
}

/** The crate the plan says to visit next, if any. */
function planTarget(domain: CargoDomain): CargoObject | undefined {
  return pendingPlan(domain)[0];
}

/**
 * 0/1 knapsack over the crates still on the ground, bounded by the weight the
 * drone can still take on. Maximises total value; returns the chosen ids in
 * manifest order (unrouted — `planRoute` sequences them).
 */
function knapsackSelection(domain: CargoDomain): string[] {
  const capacityLeft = domain.capacity - domain.load;
  if (capacityLeft <= 0) return [];

  const items = domain.objects.filter(
    (o) => o.state === "active" && o.weight <= capacityLeft,
  );
  const best: Array<{ value: number; ids: string[] }> = Array.from(
    { length: capacityLeft + 1 },
    () => ({ value: 0, ids: [] as string[] }),
  );

  for (const item of items) {
    for (let w = capacityLeft; w >= item.weight; w--) {
      const candidate = best[w - item.weight].value + item.value;
      if (candidate > best[w].value) {
        best[w] = {
          value: candidate,
          ids: [...best[w - item.weight].ids, item.id],
        };
      }
    }
  }
  return best[capacityLeft].ids;
}

/** Step counts from one cell to every reachable cell. */
function bfsField(world: World, from: Vec2): Map<string, number> {
  const dist = new Map<string, number>([[key(from), 0]]);
  const queue: Vec2[] = [from];
  while (queue.length > 0) {
    const at = queue.shift()!;
    const d = dist.get(key(at))!;
    for (const dir of DIRECTIONS) {
      const next = add(at, delta(dir));
      if (!isWalkable(world.tiles, next) || dist.has(key(next))) continue;
      dist.set(key(next), d + 1);
      queue.push(next);
    }
  }
  return dist;
}

function permute<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permute(rest)) out.push([items[i], ...tail]);
  }
  return out;
}

/**
 * Order the current plan into the shortest tour: the drone's cell → every
 * planned crate → the depot. Exact for small plans (the carry limit keeps them
 * small); nearest-neighbour beyond `EXACT_ROUTE_LIMIT`.
 */
function routePlan(world: World, domain: CargoDomain): string[] {
  const nodes = pendingPlan(domain);
  if (nodes.length <= 1) return nodes.map((n) => n.id);

  const fields = new Map<string, Map<string, number>>();
  fields.set("", bfsField(world, world.agent.position));
  for (const node of nodes) fields.set(node.id, bfsField(world, node.pos));

  const step = (fromId: string, to: Vec2): number =>
    fields.get(fromId)!.get(key(to)) ?? Number.POSITIVE_INFINITY;

  if (nodes.length > EXACT_ROUTE_LIMIT) {
    const order: CargoObject[] = [];
    const left = [...nodes];
    let fromId = "";
    while (left.length > 0) {
      let pick = 0;
      for (let i = 1; i < left.length; i++) {
        if (step(fromId, left[i].pos) < step(fromId, left[pick].pos)) pick = i;
      }
      const [next] = left.splice(pick, 1);
      order.push(next);
      fromId = next.id;
    }
    return order.map((n) => n.id);
  }

  let bestOrder = nodes.map((n) => n.id);
  let bestCost = Number.POSITIVE_INFINITY;
  for (const tour of permute(nodes)) {
    let total = step("", tour[0].pos);
    for (let i = 1; i < tour.length; i++) total += step(tour[i - 1].id, tour[i].pos);
    total += step(tour[tour.length - 1].id, domain.depot);
    if (total < bestCost) {
      bestCost = total;
      bestOrder = tour.map((n) => n.id);
    }
  }
  return bestOrder;
}

// ---------------------------------------------------------------------------
// Observation facts
// ---------------------------------------------------------------------------

function perObjectFlags(): DomainFlagSpec[] {
  const specs: DomainFlagSpec[] = [];
  for (let i = 0; i < CARGO_OBJECT_SLOTS; i++) {
    specs.push(
      { id: `obj${i}Active`, type: "bool", label: `Object ${i} waiting`, meaning: `Object ${i} is still on the ground and can be collected.` },
      { id: `obj${i}Carried`, type: "bool", label: `Object ${i} aboard`, meaning: `Object ${i} is currently being carried.` },
      { id: `obj${i}Delivered`, type: "bool", label: `Object ${i} delivered`, meaning: `Object ${i} has been dropped at the depot.` },
      { id: `obj${i}Weight`, type: "number", label: `Object ${i} weight`, meaning: `Weight of object ${i}.` },
      { id: `obj${i}Value`, type: "number", label: `Object ${i} value`, meaning: `Delivery value of object ${i}.` },
      { id: `obj${i}Col`, type: "number", label: `Object ${i} column`, meaning: `Column of object ${i}.` },
      { id: `obj${i}Row`, type: "number", label: `Object ${i} row`, meaning: `Row of object ${i}.` },
    );
  }
  return specs;
}

const DOMAIN_FLAGS: DomainFlagSpec[] = [
  // --- where the drone may fly -------------------------------------------
  { id: "blockedNorth", type: "bool", label: "Blocked north", meaning: "The cell north is outside the area or blocked." },
  { id: "blockedEast", type: "bool", label: "Blocked east", meaning: "The cell east is outside the area or blocked." },
  { id: "blockedSouth", type: "bool", label: "Blocked south", meaning: "The cell south is outside the area or blocked." },
  { id: "blockedWest", type: "bool", label: "Blocked west", meaning: "The cell west is outside the area or blocked." },

  // --- objects at the current cell ---------------------------------------
  { id: "objectHere", type: "bool", label: "Object here", meaning: "An uncollected object sits on this cell." },
  { id: "canPickHere", type: "bool", label: "Can pick up here", meaning: "There is an object here and it fits the remaining capacity." },
  { id: "weightHere", type: "number", label: "Weight here", meaning: "Weight of the object on this cell (0 if none)." },
  { id: "valueHere", type: "number", label: "Value here", meaning: "Delivery value of the object on this cell (0 if none)." },

  // --- what the drone is carrying ----------------------------------------
  { id: "load", type: "number", label: "Load", meaning: "Total weight currently carried." },
  { id: "capacity", type: "number", label: "Capacity", meaning: "Maximum weight the drone can carry." },
  { id: "capacityLeft", type: "number", label: "Capacity left", meaning: "Remaining weight the drone can still take on." },
  { id: "carriedCount", type: "number", label: "Items aboard", meaning: "How many objects are being carried." },
  { id: "carriedValue", type: "number", label: "Value aboard", meaning: "Total value of the objects being carried." },
  { id: "anyFits", type: "bool", label: "Something still fits", meaning: "At least one uncollected object fits in the remaining capacity." },

  // --- mission progress ---------------------------------------------------
  { id: "deliveredValue", type: "number", label: "Value delivered", meaning: "Total value dropped at the depot so far." },
  { id: "deliveredCount", type: "number", label: "Items delivered", meaning: "How many objects have been delivered." },
  { id: "valueTarget", type: "number", label: "Value target", meaning: "Delivered value the mission requires." },
  { id: "valueMet", type: "bool", label: "Target met", meaning: "Delivered value has reached the mission target." },
  { id: "pendingCount", type: "number", label: "Objects left out", meaning: "How many objects are still on the ground." },
  { id: "sectorClear", type: "bool", label: "Sector cleared", meaning: "Every crate has been delivered — nothing is left on the ground or aboard." },

  // --- the depot ----------------------------------------------------------
  { id: "atDepot", type: "bool", label: "At the depot", meaning: "The drone is on the depot cell and can drop off." },
  { id: "depotNorth", type: "bool", label: "Depot lies north", meaning: "The depot is north of the drone." },
  { id: "depotEast", type: "bool", label: "Depot lies east", meaning: "The depot is east of the drone." },
  { id: "depotSouth", type: "bool", label: "Depot lies south", meaning: "The depot is south of the drone." },
  { id: "depotWest", type: "bool", label: "Depot lies west", meaning: "The depot is west of the drone." },
  { id: "distanceToDepot", type: "number", label: "Distance to depot", meaning: "Grid steps from the drone to the depot." },

  // --- the mission plan ---------------------------------------------------
  { id: "hasPlan", type: "bool", label: "Plan ready", meaning: "A mission plan exists with at least one crate still to collect." },
  { id: "planRouted", type: "bool", label: "Route ready", meaning: "The current plan has been ordered into a route." },
  { id: "planCount", type: "number", label: "Crates in plan", meaning: "How many planned crates are still to be collected." },
  { id: "planWeight", type: "number", label: "Planned weight", meaning: "Total weight of the planned crates still to collect." },
  { id: "planValue", type: "number", label: "Planned value", meaning: "Total value of the planned crates still to collect." },
  { id: "atPlanTarget", type: "bool", label: "At the next planned crate", meaning: "The drone is standing on the next crate in the route." },

  // --- endurance ----------------------------------------------------------
  { id: "battery", type: "number", label: "Battery", meaning: "Remaining battery." },
  { id: "batteryFull", type: "bool", label: "Battery full", meaning: "The battery is at capacity and cannot take more charge." },
  { id: "batteryHome", type: "number", label: "Battery to get home", meaning: "Battery the flight back to the depot costs at the current load." },
  { id: "batteryMargin", type: "number", label: "Battery to spare", meaning: "Battery left over after flying home at the current load. Negative means the drone cannot make it back." },
  { id: "batteryLow", type: "bool", label: "Battery low", meaning: "Battery has fallen to where the return trip matters." },
  { id: "drainPerMove", type: "number", label: "Drain per move", meaning: "Battery the next move will cost at the current load." },

  ...perObjectFlags(),
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

export const cargoModule: WorldModule = {
  id: "cargo",

  // The drone re-crosses ground constantly (out to objects, back to the depot),
  // so the generic idle-tile heuristic would misfire. Completion is owned here.
  tracksMovement: false,

  domainActions: [
    "moveNorth",
    "moveEast",
    "moveSouth",
    "moveWest",
    "flyToDepot",
    "flyToPlanTarget",
    "runKnapsack",
    "planRoute",
    "clearPlan",
    "pickUp",
    "dropOff",
    "recharge",
  ],

  domainFlags: DOMAIN_FLAGS,

  actionPreconditions: {
    moveNorth: "!blockedNorth",
    moveEast: "!blockedEast",
    moveSouth: "!blockedSouth",
    moveWest: "!blockedWest",
    flyToDepot: "distanceToDepot > 0",
    // The pipeline is enforced by preconditions, not by hidden sequencing:
    // nothing can be selected before a plan exists, and the plan cannot be
    // flown before it has been routed.
    flyToPlanTarget: "planRouted && !atPlanTarget",
    runKnapsack: "anyFits",
    planRoute: "hasPlan",
    // `clearPlan` is deliberately unconditional: it is the policy's way out of
    // a finished or stale plan, so gating it would dead-end a state machine
    // that had already collected everything it planned for.
    pickUp: "canPickHere",
    dropOff: "atDepot && carriedCount > 0",
    recharge: "atDepot && !batteryFull",
  },

  validate: validateCargoData,

  createDomain(data: WorldData): CargoDomain {
    const config = cargoConfig(data)!;
    return {
      depot: config.depot ? { ...config.depot } : { ...data.start },
      capacity: config.capacity,
      valueTarget: config.valueTarget,
      drainPerWeight: config.drainPerWeight ?? DEFAULT_DRAIN_PER_WEIGHT,
      lowBatteryThreshold: config.lowBatteryThreshold ?? DEFAULT_LOW_BATTERY,
      rechargePerTick: config.rechargePerTick ?? DEFAULT_RECHARGE_PER_TICK,
      objects: config.objects.map((o, i) => ({
        id: o.id ?? `obj-${i}`,
        pos: pos(o),
        weight: o.weight,
        value: o.value,
        state: "active" as CargoObjectState,
      })),
      load: 0,
      deliveredValue: 0,
      deliveredCount: 0,
      plan: [],
      planRouted: false,
      rechargeCount: 0,
    };
  },

  applyAction(world: World, action: Action): boolean {
    const domain = cargoDomain(world);

    const runMove = (step: Vec2): void => {
      if (moveBy(world, step) && world.agent.energy !== null) {
        // Extra lift cost is charged here; the engine's base -1 per tick still
        // applies afterwards, so a loaded move costs 1 + ceil(load × factor).
        world.agent.energy = Math.max(0, world.agent.energy - extraDrain(domain));
      }
    };

    const step = MOVES[action.type];
    if (step) {
      runMove(step);
      return true;
    }

    if (action.type === "flyToDepot") {
      const { step: toward } = bfsNearest(world, (p) => equals(p, domain.depot));
      if (toward) runMove(toward);
      else world.lastMoveBlocked = true;
      return true;
    }

    // --- planning: costs a tick, moves nothing ----------------------------
    if (action.type === "runKnapsack") {
      domain.plan = knapsackSelection(domain);
      domain.planRouted = false;
      return true;
    }

    if (action.type === "planRoute") {
      domain.plan = routePlan(world, domain);
      domain.planRouted = domain.plan.length > 0;
      return true;
    }

    if (action.type === "clearPlan") {
      domain.plan = [];
      domain.planRouted = false;
      return true;
    }

    if (action.type === "flyToPlanTarget") {
      const target = planTarget(domain);
      if (!target) {
        world.lastMoveBlocked = true;
        return true;
      }
      const { step: toward } = bfsNearest(world, (p) => equals(p, target.pos));
      if (toward) runMove(toward);
      else world.lastMoveBlocked = true;
      return true;
    }

    if (action.type === "recharge") {
      if (equals(world.agent.position, domain.depot) && world.agent.energy !== null) {
        const ceiling = world.energyCapacity ?? world.agent.energy;
        world.agent.energy = Math.min(ceiling, world.agent.energy + domain.rechargePerTick);
        domain.rechargeCount += 1;
      }
      return true;
    }

    if (action.type === "pickUp") {
      const object = activeObjectAt(domain, world.agent.position);
      if (object && domain.load + object.weight <= domain.capacity) {
        object.state = "carried";
        domain.load += object.weight;
      }
      return true;
    }

    if (action.type === "dropOff") {
      if (equals(world.agent.position, domain.depot)) {
        for (const object of domain.objects) {
          if (object.state === "carried") {
            object.state = "delivered";
            domain.deliveredValue += object.value;
            domain.deliveredCount += 1;
          }
        }
        domain.load = 0;
      }
      return true;
    }

    return false; // `wait` falls through to the engine
  },

  resolveStatus(world: World): SimStatus | null {
    const domain = cargoDomain(world);
    const home = equals(world.agent.position, domain.depot);
    const emptyHanded = domain.load === 0;
    // A safe homecoming, and the sector actually cleared. The drone can refuel
    // at the depot, so "enough value" is not a reason to leave cargo behind —
    // the mission ends when nothing is still on the ground. `valueTarget`
    // remains the graded floor, not the stopping point.
    const sectorClear = domain.objects.every((o) => o.state === "delivered");
    return home && emptyHanded && sectorClear && domain.deliveredValue >= domain.valueTarget
      ? "reached"
      : null;
  },

  observe(world: World): Record<string, number | boolean> {
    const domain = cargoDomain(world);
    const pos = world.agent.position;
    const capacityLeft = domain.capacity - domain.load;

    const blocked = (dir: (typeof DIRECTIONS)[number]) =>
      !isWalkable(world.tiles, add(pos, delta(dir)));

    const here = activeObjectAt(domain, pos);
    const anyFits = domain.objects.some((o) => o.state === "active" && o.weight <= capacityLeft);
    const pendingCount = domain.objects.filter((o) => o.state === "active").length;
    const carried = domain.objects.filter((o) => o.state === "carried");
    const { dist: depotDist } = bfsNearest(world, (p) => equals(p, domain.depot));
    const energy = world.agent.energy ?? 0;
    const planned = pendingPlan(domain);
    const nextTarget = planned[0];
    const homeDistance = depotDist < 0 ? 0 : depotDist;

    const facts: Record<string, number | boolean> = {
      blockedNorth: blocked("N"),
      blockedEast: blocked("E"),
      blockedSouth: blocked("S"),
      blockedWest: blocked("W"),

      objectHere: here !== undefined,
      canPickHere: here !== undefined && here.weight <= capacityLeft,
      weightHere: here?.weight ?? 0,
      valueHere: here?.value ?? 0,

      load: domain.load,
      capacity: domain.capacity,
      capacityLeft,
      carriedCount: carried.length,
      carriedValue: carried.reduce((sum, o) => sum + o.value, 0),
      anyFits,

      deliveredValue: domain.deliveredValue,
      deliveredCount: domain.deliveredCount,
      valueTarget: domain.valueTarget,
      valueMet: domain.deliveredValue >= domain.valueTarget,
      pendingCount,
      sectorClear: domain.objects.every((o) => o.state === "delivered"),

      atDepot: equals(pos, domain.depot),
      depotNorth: domain.depot.y < pos.y,
      depotEast: domain.depot.x > pos.x,
      depotSouth: domain.depot.y > pos.y,
      depotWest: domain.depot.x < pos.x,
      distanceToDepot: depotDist < 0 ? 0 : depotDist,

      hasPlan: planned.length > 0,
      planRouted: domain.planRouted && planned.length > 0,
      planCount: planned.length,
      planWeight: planned.reduce((sum, o) => sum + o.weight, 0),
      planValue: planned.reduce((sum, o) => sum + o.value, 0),
      atPlanTarget: nextTarget !== undefined && equals(pos, nextTarget.pos),

      battery: energy,
      batteryLow: energy <= domain.lowBatteryThreshold,
      batteryFull: world.energyCapacity !== null && energy >= world.energyCapacity,
      batteryHome: homeDistance * (1 + extraDrain(domain)),
      batteryMargin: energy - homeDistance * (1 + extraDrain(domain)),
      drainPerMove: 1 + extraDrain(domain),
    };

    // The full manifest, flattened. A Code Controller reads these to plan; the
    // visual palette does not expose them.
    domain.objects.forEach((o, i) => {
      facts[`obj${i}Active`] = o.state === "active";
      facts[`obj${i}Carried`] = o.state === "carried";
      facts[`obj${i}Delivered`] = o.state === "delivered";
      facts[`obj${i}Weight`] = o.weight;
      facts[`obj${i}Value`] = o.value;
      facts[`obj${i}Col`] = o.pos.x;
      facts[`obj${i}Row`] = o.pos.y;
    });

    return facts;
  },
};

export { manhattan as cargoManhattan };
