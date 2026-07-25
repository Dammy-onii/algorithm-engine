/**
 * Loads and validates the two data contracts (world + brain) into engine-ready
 * objects. Bad data fails loudly here rather than silently misbehaving mid-run.
 *
 * This is the seam that keeps the engine independent of any editor: today the
 * data comes from JSON files; tomorrow it can come from a visual block editor,
 * handwritten code, or an AI — as long as it satisfies these shapes.
 */

import {
  ActionType,
  Brain,
  ConditionsData,
  DerivedCondition,
  EntitiesData,
  EntityData,
  FunctionDef,
  GoalsData,
  StatesData,
  RulesData,
  FunctionsData,
  MemoryData,
  WorldData,
  TILE,
  BASE_ACTIONS,
} from "../types";
import {
  BUILTIN_FLAGS,
  assertParsable,
  referencedIdentifiers,
} from "../decision/condition";
import { allDomainActions, allDomainFlags, resolveWorldModule } from "../worlds/registry";
import { inBounds } from "../world/grid";
import { World } from "../world/world";

function fail(msg: string): never {
  throw new Error(`[loader] ${msg}`);
}

export function validateWorldData(data: WorldData): void {
  if (!data.name) fail("world.name is required");
  if (data.tiles.length !== data.height) {
    fail(`world height ${data.height} != tiles rows ${data.tiles.length}`);
  }
  data.tiles.forEach((row, y) => {
    if (row.length !== data.width) {
      fail(`world row ${y} width ${row.length} != declared width ${data.width}`);
    }
  });
  if (!inBounds(data.tiles, data.start)) fail("world.start is out of bounds");
  if (!inBounds(data.tiles, data.goal)) fail("world.goal is out of bounds");
  if (data.tiles[data.start.y][data.start.x] === TILE.WALL) {
    fail("world.start sits on a wall");
  }
  if (data.tiles[data.goal.y][data.goal.x] === TILE.WALL) {
    fail("world.goal sits on a wall");
  }
  const worldModule = resolveWorldModule(data.kind);
  if (data.kind && worldModule.id !== data.kind) fail(`unknown world kind '${data.kind}'`);
  worldModule.validate(data);
}

const PRIMITIVE_ACTIONS = new Set<ActionType>([...BASE_ACTIONS, ...allDomainActions()]);

/**
 * Expand a function into a flat list of primitive actions, following `steps`
 * that reference other functions. Detects unknown references and cycles.
 */
function compilePlan(
  fnId: string,
  byId: Map<string, FunctionDef>,
  cache: Map<string, ActionType[]>,
  stack: string[],
): ActionType[] {
  const cached = cache.get(fnId);
  if (cached) return cached;

  const fn = byId.get(fnId);
  if (!fn) fail(`unknown function '${fnId}'`);
  if (stack.includes(fnId)) {
    fail(`function '${fnId}' forms a cycle: ${[...stack, fnId].join(" → ")}`);
  }

  const hasAction = fn.action !== undefined;
  const hasSteps = Array.isArray(fn.steps) && fn.steps.length > 0;
  if (hasAction === hasSteps) {
    fail(`function '${fn.id}' must have exactly one of 'action' or 'steps'`);
  }

  let plan: ActionType[];
  if (hasAction) {
    if (!PRIMITIVE_ACTIONS.has(fn.action as ActionType)) {
      fail(`function '${fn.id}' has unknown action '${fn.action}'`);
    }
    plan = [fn.action as ActionType];
  } else {
    plan = [];
    for (const token of fn.steps as string[]) {
      if (PRIMITIVE_ACTIONS.has(token as ActionType)) {
        plan.push(token as ActionType);
      } else {
        plan.push(...compilePlan(token, byId, cache, [...stack, fnId]));
      }
    }
  }

  cache.set(fnId, plan);
  return plan;
}

export function compileFunctionPlans(
  functions: FunctionDef[],
): Record<string, ActionType[]> {
  const byId = new Map(functions.map((f) => [f.id, f]));
  if (byId.size !== functions.length) fail("duplicate function id");
  const cache = new Map<string, ActionType[]>();
  for (const fn of functions) compilePlan(fn.id, byId, cache, []);
  return Object.fromEntries(cache);
}

/**
 * Validate user-defined derived conditions and return them as an id → expression
 * map. Catches shadowing, duplicates, syntax errors, unknown identifiers and
 * circular definitions at load time, so mistakes surface on Apply rather than
 * partway through a run.
 */
export function compileDerivedConditions(
  conditions: DerivedCondition[],
): Record<string, string> {
  // Known vocabulary = base flags + every world module's domain flags. Validation
  // stays permissive across worlds; the evaluator only sees the flags the active
  // world actually produces at runtime.
  const builtins = new Set<string>([...BUILTIN_FLAGS, ...allDomainFlags()]);
  const map: Record<string, string> = {};

  for (const c of conditions) {
    const id = (c.id ?? "").trim();
    if (!id) fail("a derived condition has an empty id");
    if (builtins.has(id)) {
      fail(`derived condition '${id}' shadows a built-in observation flag`);
    }
    if (id in map) fail(`duplicate derived condition '${id}'`);
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id)) {
      fail(
        `derived condition '${id}' is not a valid name (letters, digits, underscore; cannot start with a digit)`,
      );
    }
    if (!(c.expr ?? "").trim()) fail(`derived condition '${id}' has an empty expression`);
    map[id] = c.expr;
  }

  // Syntax + reference checks.
  const known = new Set<string>([...builtins, ...Object.keys(map)]);
  for (const [id, expr] of Object.entries(map)) {
    try {
      assertParsable(expr);
    } catch (e) {
      fail(`derived condition '${id}': ${e instanceof Error ? e.message : String(e)}`);
    }
    for (const ref of referencedIdentifiers(expr)) {
      if (!known.has(ref)) {
        fail(`derived condition '${id}' references unknown identifier '${ref}'`);
      }
    }
  }

  // Cycle detection over the reference graph.
  const state = new Map<string, "visiting" | "done">();
  const visit = (id: string, path: string[]) => {
    const s = state.get(id);
    if (s === "done") return;
    if (s === "visiting") {
      fail(`circular derived condition: ${[...path, id].join(" → ")}`);
    }
    state.set(id, "visiting");
    for (const ref of referencedIdentifiers(map[id])) {
      if (ref in map) visit(ref, [...path, id]);
    }
    state.set(id, "done");
  };
  for (const id of Object.keys(map)) visit(id, []);

  return map;
}

export function buildBrain(
  goals: GoalsData,
  states: StatesData,
  rules: RulesData,
  functions: FunctionsData,
  memory: MemoryData,
  conditions: ConditionsData = { conditions: [] },
): Brain {
  if (!states.states.length) fail("brain has no states");
  if (!states.states.some((s) => s.id === states.initial)) {
    fail(`initial state '${states.initial}' is not defined`);
  }

  const functionPlans = compileFunctionPlans(functions.functions);
  const derivedConditions = compileDerivedConditions(conditions.conditions ?? []);
  const functionIds = new Set(functions.functions.map((f) => f.id));
  const stateIds = new Set(states.states.map((s) => s.id));
  const knownFlags = new Set<string>([
    ...BUILTIN_FLAGS,
    ...allDomainFlags(),
    ...Object.keys(derivedConditions),
  ]);

  /** Shared expression check for rule/goal conditions. */
  const checkExpression = (expr: string, label: string) => {
    if (!expr.trim()) return;
    try {
      assertParsable(expr);
    } catch (e) {
      fail(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    }
    for (const ref of referencedIdentifiers(expr)) {
      if (!knownFlags.has(ref)) {
        fail(`${label} references unknown condition '${ref}'`);
      }
    }
  };

  for (const rule of rules.rules) {
    if (!functionIds.has(rule.do)) {
      fail(`rule '${rule.id}' references unknown function '${rule.do}'`);
    }
    if (rule.state !== undefined && !stateIds.has(rule.state)) {
      fail(`rule '${rule.id}' references unknown state '${rule.state}'`);
    }
    if (rule.setState !== undefined && !stateIds.has(rule.setState)) {
      fail(`rule '${rule.id}' transitions to unknown state '${rule.setState}'`);
    }
    checkExpression(rule.when, `rule '${rule.id}'`);
  }

  for (const goal of goals.goals) {
    if (goal.activeWhen) checkExpression(goal.activeWhen, `goal '${goal.id}'`);
  }

  return {
    goals: goals.goals,
    initialState: states.initial,
    states: states.states,
    rules: rules.rules,
    functions: functions.functions,
    functionPlans,
    derivedConditions,
    memory,
  };
}

/** Assemble a ready-to-run World from validated world data + a loaded brain. */
export function buildWorld(
  worldData: WorldData,
  entities: EntitiesData,
  brain: Brain,
  goalHoldTicks?: number,
): World {
  validateWorldData(worldData);
  const worldModule = resolveWorldModule(worldData.kind);
  const allowedActions = new Set<ActionType>([...BASE_ACTIONS, ...worldModule.domainActions]);
  for (const [functionId, plan] of Object.entries(brain.functionPlans)) {
    for (const action of plan) {
      if (!allowedActions.has(action)) {
        fail(`function '${functionId}' uses action '${action}', unavailable in world '${worldModule.id}'`);
      }
    }
  }
  const entityList: EntityData[] = entities.entities ?? [];
  return new World(
    worldData,
    entityList,
    brain.initialState,
    brain.memory,
    goalHoldTicks,
  );
}
