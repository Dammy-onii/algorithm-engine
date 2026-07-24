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

import { ActionType, Brain, Observation } from "../types";
import { contextFromObservation } from "./condition";
import { selectGoal } from "./goalManager";
import { resolveState, isValidState } from "./stateMachine";
import { selectRule } from "./ruleEngine";
import { planForFunction } from "./functionExecutor";

const DEFAULT_PLAN: ActionType[] = ["wait"];

export interface Decision {
  goalId: string | null;
  stateId: string;
  ruleId: string | null;
  functionId: string | null;
  /** Compiled plan of primitive actions to run, one per tick. */
  plan: ActionType[];
  /** State to switch into before running the plan, if the rule requested one. */
  nextState: string;
}

export function resolveAction(
  brain: Brain,
  observation: Observation,
  currentState: string,
): Decision {
  const ctx = contextFromObservation(observation);
  const derived = brain.derivedConditions;

  const goal = selectGoal(brain.goals, ctx, derived);
  const state = resolveState(brain.states, currentState);
  const rule = selectRule(brain.rules, state.id, ctx, derived);

  // No rule matched → safe default so the loop always produces an action.
  if (!rule) {
    return {
      goalId: goal?.id ?? null,
      stateId: state.id,
      ruleId: null,
      functionId: null,
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
    plan,
    nextState,
  };
}
