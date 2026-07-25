/**
 * Rule layer — answers "given my situation, what should happen?".
 *
 * Evaluates the rules that belong to the active state (plus stateless rules),
 * in their authored array order. It returns the first rule whose condition holds
 * *and* whose next action is currently possible (`isExecutable`). This makes a
 * rules list a visual `if / else-if / else` flow: the card at the top is checked
 * first, then the next one, and so on.
 *
 * Numeric `priority` values are retained only so old saved brains continue to
 * load. They have no bearing on execution.
 */

import { Rule } from "../types";
import { DerivedMap, EvalContext, evaluateCondition } from "./condition";

export function selectRule(
  rules: Rule[],
  activeStateId: string,
  ctx: EvalContext,
  derived: DerivedMap = {},
  isExecutable?: (rule: Rule) => boolean,
): Rule | null {
  const candidates = rules.filter(
    (r) => r.state === undefined || r.state === activeStateId,
  );

  for (const rule of candidates) {
    if (!evaluateCondition(rule.when, ctx, derived)) continue;
    if (!isExecutable || isExecutable(rule)) return rule;
  }
  return null;
}
