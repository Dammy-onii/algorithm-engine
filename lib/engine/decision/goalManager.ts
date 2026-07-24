/**
 * Goal layer — answers "what am I trying to accomplish right now?".
 *
 * Picks the highest-priority goal whose `activeWhen` condition currently holds.
 * Goals without a condition are always eligible. The active goal is exposed for
 * the debug panel and can gate state selection in richer brains.
 */

import { Goal } from "../types";
import { DerivedMap, EvalContext, evaluateCondition } from "./condition";

export function selectGoal(
  goals: Goal[],
  ctx: EvalContext,
  derived: DerivedMap = {},
): Goal | null {
  const eligible = goals.filter((g) =>
    g.activeWhen ? evaluateCondition(g.activeWhen, ctx, derived) : true,
  );
  if (eligible.length === 0) return null;
  return eligible.reduce((best, g) => (g.priority > best.priority ? g : best));
}
