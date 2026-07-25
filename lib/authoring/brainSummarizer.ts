/**
 * Brain Summarizer — VisualBrain → human-readable intelligence explanation.
 *
 * Generates a plain-English description of what the current brain does.
 * Shown in the "Current Intelligence" panel in the Studio so users always
 * understand the starting point and what they need to change.
 *
 * This is purely presentational — no engine interaction.
 */

import { VisualBrain, VisualRule, VisualCondition } from "./types";

// ---------------------------------------------------------------------------
// Condition → readable string
// ---------------------------------------------------------------------------

const FLAG_LABELS: Record<string, string> = {
  wallAhead: "wall ahead",
  wallLeft: "wall on the left",
  wallRight: "wall on the right",
  goalVisible: "goal is visible",
  goalAhead: "goal is straight ahead",
  atGoal: "at the goal",
  visitedAhead: "tile ahead already visited",
  always: "always",
  never: "never",
  energy: "energy",
  visitedCount: "tiles visited",
  tick: "tick",
};

function readableFlag(flag: string, negated: boolean): string {
  const label = FLAG_LABELS[flag] ?? flag;
  return negated ? `NOT (${label})` : label;
}

function readableCondition(cond: VisualCondition): string {
  if (cond.mode === "raw") return `(${cond.expr})`;

  const { atoms, operator } = cond.group;
  if (atoms.length === 0) return "always";

  const parts = atoms.map((a) => {
    if (a.comparison) {
      const label = FLAG_LABELS[a.flag] ?? a.flag;
      return `${label} ${a.comparison.op} ${a.comparison.value}`;
    }
    return readableFlag(a.flag, a.negated);
  });

  const joiner = operator === "&&" ? " and " : " or ";
  return parts.join(joiner);
}

// ---------------------------------------------------------------------------
// Rule → readable sentence
// ---------------------------------------------------------------------------

function ruleToSentence(rule: VisualRule, functionLabel: string): string {
  const when = readableCondition(rule.condition);
  const action = functionLabel || rule.functionId;
  const transition = rule.setState ? `, then switch to "${rule.setState}"` : "";
  return `If ${when} → ${action}${transition}`;
}

// ---------------------------------------------------------------------------
// Full brain summary
// ---------------------------------------------------------------------------

export interface BrainSummaryLine {
  state: string | null; // null = any state
  sentence: string;
  order: number;
}

export interface BrainSummary {
  isEmpty: boolean;
  stateCount: number;
  ruleCount: number;
  functionCount: number; // user-composed only
  initialState: string;
  lines: BrainSummaryLine[];
  /** A concise one-paragraph plain-English description of the brain. */
  overview: string;
}

export function summarizeBrain(brain: VisualBrain): BrainSummary {
  const userFunctions = brain.functions.filter((f) => !f.isBuiltIn);
  const fnLabel = (id: string): string => {
    const f = brain.functions.find((fn) => fn.id === id);
    if (!f) return id;
    if (f.isBuiltIn && f.action) return f.action.replace(/([A-Z])/g, " $1").trim();
    return f.id;
  };

  const lines: BrainSummaryLine[] = brain.rules.map((r, index) => ({
    state: r.state,
    sentence: ruleToSentence(r, fnLabel(r.functionId)),
    order: index + 1,
  }));

  const isEmpty = brain.rules.length === 0;

  let overview: string;
  if (isEmpty) {
    overview =
      "This brain has no rules yet. Without rules the robot waits forever — it has no instructions. Add at least one rule to give it something to do.";
  } else {
    const stateNames = brain.states.map((s) => `"${s.id}"`).join(", ");
    const startState = `"${brain.initial}"`;
    const rulesInStart = brain.rules.filter(
      (r) => r.state === brain.initial || r.state === null,
    ).length;
    overview = [
      `The robot starts in the ${startState} state`,
      brain.states.length > 1
        ? ` and can switch between ${stateNames}`
        : "",
      `. In its current state it has ${rulesInStart} rule${rulesInStart !== 1 ? "s" : ""} to choose from.`,
      userFunctions.length > 0
        ? ` It uses ${userFunctions.length} custom function${userFunctions.length !== 1 ? "s" : ""} you composed from primitives.`
        : "",
    ].join("");
  }

  return {
    isEmpty,
    stateCount: brain.states.length,
    ruleCount: brain.rules.length,
    functionCount: userFunctions.length,
    initialState: brain.initial,
    lines,
    overview,
  };
}
