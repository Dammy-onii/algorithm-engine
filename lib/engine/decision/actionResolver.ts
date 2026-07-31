/**
 * The decision pipeline, orchestrated end-to-end.
 *
 *   Observation → Goal → State → Rule → Function → Plan
 *
 * This is the heart of "the engine executes intelligence, it does not create
 * it": given an observation and a brain, it returns which function fired and its
 * compiled plan (one or more primitive actions), plus a trace and any state
 * transition. The simulation then runs that plan one action per tick.
 */

import { ActionType, Brain, Observation, Rule } from "../types";
import { contextFromObservation, evaluateCondition } from "./condition";
import { selectGoal } from "./goalManager";
import { resolveState, isValidState } from "./stateMachine";
import { selectRule } from "./ruleEngine";
import { planForFunction } from "./functionExecutor";

const DEFAULT_PLAN: ActionType[] = ["wait"];

/**
 * Preconditions for the base movement primitives, as condition expressions over
 * observation flags. Turning and waiting are always possible, so only the one
 * blockable primitive is listed. World modules add their own domain-action
 * preconditions via `WorldModule.actionPreconditions`.
 */
export const BASE_ACTION_PRECONDITIONS: Readonly<Record<string, string>> = {
  moveForward: "!wallAhead",
};

export interface Decision {
  goalId: string | null;
  stateId: string;
  ruleId: string | null;
  functionId: string | null;
  condition: string | null;
  reason: string;
  /** Compiled plan of primitive actions to run, one per tick. */
  plan: ActionType[];
  /** State to switch into before running the plan, if the rule requested one. */
  nextState: string;
}

/** Whether one primitive action may be attempted in the current observation. */
export function isActionExecutable(
  action: ActionType,
  observation: Observation,
  actionPreconditions: Readonly<Record<string, string>> = {},
  derived: Readonly<Record<string, string>> = {},
): boolean {
  const precondition = actionPreconditions[action];
  if (!precondition) return true;
  try {
    return evaluateCondition(precondition, contextFromObservation(observation), derived);
  } catch {
    // Invalid world metadata must not make a simulation crash mid-run. Loader
    // validation remains the primary error surface for authored expressions.
    return true;
  }
}

export function resolveAction(
  brain: Brain,
  observation: Observation,
  currentState: string,
  /**
   * Action → precondition expression, merged from the base primitives and the
   * active world module. When supplied, selection skips a rule whose first
   * action is currently impossible. Omit to disable the check.
   */
  actionPreconditions: Readonly<Record<string, string>> = {},
): Decision {
  const ctx = contextFromObservation(observation);
  const derived = brain.derivedConditions;

  const goal = selectGoal(brain.goals, ctx, derived);
  const state = resolveState(brain.states, currentState);

  // A rule is executable when the first primitive of its plan is possible now.
  // Later primitives are checked again just before they execute by Simulation.
  const isExecutable = (r: Rule): boolean => {
    const action = planForFunction(brain, r.do)[0];
    return isActionExecutable(action, observation, actionPreconditions, derived);
  };

  const rule = selectRule(brain.rules, state.id, ctx, derived, isExecutable);

  // Nothing applies. The engine waits rather than attempting an impossible
  // action; the trace deliberately has no rule/function because no branch ran.
  if (!rule) {
    return {
      goalId: goal?.id ?? null,
      stateId: state.id,
      ruleId: null,
      functionId: null,
      condition: null,
      reason:
        "No rule had both a true WHEN condition and an executable next action, so the policy waited.",
      plan: DEFAULT_PLAN,
      nextState: state.id,
    };
  }

  const plan = planForFunction(brain, rule.do);

  let nextState = state.id;
  if (rule.setState !== undefined) {
    if (!isValidState(brain.states, rule.setState)) {
      throw new Error(
        `Rule '${rule.id}' transitions to unknown state '${rule.setState}'`,
      );
    }
    nextState = rule.setState;
  }

  return {
    goalId: goal?.id ?? null,
    stateId: state.id,
    ruleId: rule.id,
    functionId: rule.do,
    condition: rule.when,
    reason:
      "This was the first top-to-bottom rule whose WHEN condition was true and whose next action was executable.",
    plan,
    nextState,
  };
}
