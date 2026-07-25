/**
 * Shared engine types. Framework-agnostic — no React/Next imports here.
 *
 * These types define the two data contracts the engine consumes:
 *   - World data (the maze/environment)  → `content/worlds/*.json`
 *   - Brain data (the agent's intelligence) → `content/brains/<sample>/*.json`
 *
 * The engine executes intelligence; it never creates it. Everything the agent
 * "knows" arrives as an Observation, and everything it "does" is a single Action.
 */

// ---------------------------------------------------------------------------
// Geometry & movement
// ---------------------------------------------------------------------------

export interface Vec2 {
  x: number;
  y: number;
}

/** Cardinal facing. Order matters: clockwise, used for turn math. */
export type Direction = "N" | "E" | "S" | "W";

/** Shared movement primitives. World modules contribute their own actions. */
export const BASE_ACTIONS = [
  "moveForward",
  "turnLeft",
  "turnRight",
  "wait",
] as const;

/**
 * An action identifier. The core intentionally leaves this open: a world module
 * may add domain actions without extending a shared union.
 */
export type ActionType = string;

export interface Action {
  type: ActionType;
}

// ---------------------------------------------------------------------------
// World data contract (content/worlds/*.json)
// ---------------------------------------------------------------------------

/** Tile codes as they appear in maze.json. */
export const TILE = {
  EMPTY: 0,
  WALL: 1,
  START: 2,
  GOAL: 3,
} as const;

export type TileCode = (typeof TILE)[keyof typeof TILE];
export type TileKind = "empty" | "wall" | "start" | "goal" | "out";

export interface WorldData {
  name: string;
  /** World-module id. Omit for the original maze semantics. */
  kind?: string;
  width: number;
  height: number;
  /** Row-major grid of tile codes; tiles[y][x]. */
  tiles: number[][];
  start: Vec2;
  goal: Vec2;
  /** Direction the agent faces at spawn. Defaults to "E". */
  startDirection?: Direction;
  /** Optional starting energy. Omit to run without an energy stat. */
  energy?: number;
}

export interface EntityData {
  id: string;
  type: string;
  position: Vec2;
}

export interface EntitiesData {
  entities: EntityData[];
}

// ---------------------------------------------------------------------------
// Observation — the ONLY channel from world to agent
// ---------------------------------------------------------------------------

export interface Observation {
  tick: number;
  position: Vec2;
  direction: Direction;
  /** Wall (or out-of-bounds) directly in the facing direction. */
  wallAhead: boolean;
  wallLeft: boolean;
  wallRight: boolean;
  /** Kind of tile in each cardinal direction relative to the world grid. */
  neighbors: Record<Direction, TileKind>;
  /** Goal reachable in a straight, unobstructed line from here. */
  goalVisible: boolean;
  /** Cardinal direction toward the goal when visible, else null. */
  goalDirection: Direction | null;
  atGoal: boolean;
  /** The tile directly ahead has already been visited. */
  visitedAhead: boolean;
  visitedCount: number;
  /** Remaining energy, or null when the world has no energy stat. */
  energy: number | null;
  /**
   * World-type-specific facts contributed by the active WorldModule. Empty `{}`
   * for the base grid.
   * Keeping these in an open bag is what lets a new world add senses without
   * editing this type or the engine core.
   */
  domain: Record<string, number | boolean>;
}

// ---------------------------------------------------------------------------
// Brain data contract (content/brains/<sample>/*.json) — the user-authored "engine"
// ---------------------------------------------------------------------------

/**
 * A condition is a human-writable boolean expression evaluated against the
 * observation (and memory), e.g. "wallAhead && !goalVisible" or "energy < 5".
 * See decision/condition.ts for the supported grammar.
 */
export type Condition = string;

export interface Goal {
  id: string;
  priority: number;
  description?: string;
  /** Goal is active when this condition holds. Omit for always-eligible. */
  activeWhen?: Condition;
}

export interface GoalsData {
  goals: Goal[];
}

export interface StateDef {
  id: string;
  description?: string;
}

export interface StatesData {
  /** Id of the state the agent starts in. */
  initial: string;
  states: StateDef[];
}

export interface Rule {
  id: string;
  /** Rule applies only in this state; omit to apply in any state. */
  state?: string;
  /** Boolean condition that must hold for the rule to fire. */
  when: Condition;
  /** Id of the function to execute when the rule fires. */
  do: string;
  /** Optional state transition performed when the rule fires. */
  setState?: string;
  /**
   * Legacy import field. Rules execute in their authored array order; this
   * number is ignored. It remains optional so existing JSON brains load safely.
   */
  priority?: number;
  description?: string;
}

export interface RulesData {
  rules: Rule[];
}

/**
 * A reusable behavior ("brick"). A function is EITHER:
 *   - single-step:  { action: "moveForward" }                    → one action
 *   - multi-step:   { steps: ["pivot-right", "pivot-right"] }     → a sequence
 *
 * In a multi-step brick each entry is another action type OR another function
 * id, so bricks can be composed from other bricks. The loader expands `steps`
 * into a flat plan of primitive actions, and the simulation runs that plan one
 * action per tick — the brick keeps running to completion before the rule
 * engine decides again. This is how a "brick" grows beyond one-action-each.
 */
export interface FunctionDef {
  id: string;
  /** Single-step brick: the action to perform. Mutually exclusive with `steps`. */
  action?: ActionType;
  /** Multi-step brick: action types and/or other function ids, in order. */
  steps?: string[];
  description?: string;
}

export interface FunctionsData {
  functions: FunctionDef[];
}

/**
 * A user-defined named condition: new *knowledge* composed from existing
 * observation flags (and other derived conditions).
 *
 *   { id: "deadEnd", expr: "wallAhead && wallLeft && wallRight" }
 *
 * This is the perceptual mirror of a multi-step function: it extends the
 * vocabulary without adding new senses. The engine can only ever perceive what
 * the Observation exposes — derived conditions recombine those facts.
 */
export interface DerivedCondition {
  id: string;
  expr: string;
  description?: string;
}

export interface ConditionsData {
  conditions: DerivedCondition[];
}

export type MemoryData = Record<string, unknown>;

/** Fully-loaded, validated brain assembled from the five instruction files. */
export interface Brain {
  goals: Goal[];
  initialState: string;
  states: StateDef[];
  rules: Rule[];
  functions: FunctionDef[];
  /** Each function id compiled to a flat plan of primitive actions (one/tick). */
  functionPlans: Record<string, ActionType[]>;
  /** User-defined named conditions, id → expression. */
  derivedConditions: Record<string, string>;
  memory: MemoryData;
}

// ---------------------------------------------------------------------------
// Debug trace — what the engine did internally on one tick
// ---------------------------------------------------------------------------

export type SimStatus = "idle" | "running" | "reached" | "stuck" | "out-of-energy";

export interface DecisionTrace {
  goalId: string | null;
  stateId: string;
  ruleId: string | null;
  functionId: string | null;
  action: Action;
  /** For a multi-step brick: which action of the plan this tick is running. */
  step?: { index: number; total: number };
}

/** Progress toward settling on the goal (see World.ticksAtGoal). */
export interface GoalHold {
  /** Consecutive ticks ended on the goal. */
  current: number;
  /** Consecutive ticks required to complete the run. */
  required: number;
}

/** Immutable snapshot of one simulation step, for rendering + debugging. */
export interface SimStep {
  tick: number;
  status: SimStatus;
  observation: Observation;
  trace: DecisionTrace;
  memory: MemoryData;
  /** How close the agent is to settling on the goal. */
  goalHold: GoalHold;
}
