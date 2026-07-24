/**
 * Rule layer — answers "given my situation, what should happen?".
 *
 * Evaluates the rules that belong to the active state (plus stateless rules),
 * in priority order, and returns the first whose condition holds. Rules are
 * reactive: they observe the current moment and pick a reusable function.
 */

import { Rule } from "../types";
import { DerivedMap, EvalContext, evaluateCondition } from "./condition";

export function selectRule(
  rules: Rule[],
  activeStateId: string,
  ctx: EvalContext,
  derived: DerivedMap = {},
): Rule | null {
  const candidates = rules
    .filter((r) => r.state === undefined || r.state === activeStateId)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  for (const rule of candidates) {
    if (evaluateCondition(rule.when, ctx, derived)) {
      return rule;
    }
  }
  return null;
}
