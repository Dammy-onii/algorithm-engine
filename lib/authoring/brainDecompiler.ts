/**
 * Brain Decompiler — BrainSource → VisualBrain.
 *
 * Converts the six-layer JSON brain format back into the structured visual
 * model so existing brains (the three shipped with Milestone 1) can be loaded
 * into the editor as starting points or references.
 *
 * Condition parsing is deliberately conservative: only flat AND or flat OR
 * chains with simple atoms are parsed into the guided model. Anything more
 * complex falls back to raw mode (a plain text input), which is always safe.
 */

import {
  VisualBrain,
  VisualGoal,
  VisualState,
  VisualRule,
  VisualFunction,
  VisualCondition,
  ConditionAtom,
  ComparisonOp,
} from "./types";
import { BrainSource } from "@/lib/engine/simulation";

// ---------------------------------------------------------------------------
// Condition parsing
// ---------------------------------------------------------------------------

const COMPARISON_RE =
  /^(!?)(\w+)\s*([<>]=?|[!=]=)\s*(\d+(?:\.\d+)?|\w+)$/;
const BOOLEAN_FLAG_RE = /^(!?)(\w+)$/;

/** Parse one atom from a trimmed string token. Returns null on failure. */
function parseAtom(token: string): ConditionAtom | null {
  const t = token.trim();

  // Numeric comparison: "energy < 20" or "!energy < 20" (negation ignored for comparisons)
  const compMatch = t.match(COMPARISON_RE);
  if (compMatch) {
    return {
      flag: compMatch[2],
      negated: false,
      comparison: {
        op: compMatch[3] as ComparisonOp,
        value: /^\d+(?:\.\d+)?$/.test(compMatch[4])
          ? Number(compMatch[4])
          : compMatch[4],
      },
    };
  }

  // Boolean flag: "wallAhead" or "!wallAhead"
  const boolMatch = t.match(BOOLEAN_FLAG_RE);
  if (boolMatch) {
    return {
      flag: boolMatch[2],
      negated: boolMatch[1] === "!",
    };
  }

  return null; // unknown form → caller falls back to raw
}

/**
 * Parse a condition expression into a VisualCondition.
 *
 * Supports:
 *   - Empty / "always" / "never" → single-atom guided
 *   - Single atom            → guided (1 atom, operator defaults to &&)
 *   - Flat AND chain         → guided
 *   - Flat OR chain          → guided
 *   - Everything else        → raw
 */
export function decompileCondition(expr: string): VisualCondition {
  const trimmed = expr.trim();

  // Empty = always
  if (!trimmed || trimmed === "always") {
    return {
      mode: "guided",
      group: { operator: "&&", atoms: [{ flag: "always", negated: false }] },
    };
  }
  if (trimmed === "never") {
    return {
      mode: "guided",
      group: { operator: "&&", atoms: [{ flag: "never", negated: false }] },
    };
  }

  // Detect the dominant operator.
  // Mixed && and || require parentheses — too complex for guided mode.
  const hasAnd = trimmed.includes("&&");
  const hasOr = trimmed.includes("||");
  const operator = hasAnd && !hasOr ? "&&" : !hasAnd && hasOr ? "||" : null;

  if (operator === null && (hasAnd || hasOr)) {
    // Mixed operators — fall back to raw
    return { mode: "raw", expr: trimmed };
  }

  const sep = operator ?? "&&"; // single atom: fake && with one element
  const tokens = trimmed
    .split(sep === "&&" ? "&&" : "||")
    .map((s) => s.trim())
    .filter(Boolean);

  const atoms: ConditionAtom[] = [];
  for (const token of tokens) {
    const atom = parseAtom(token);
    if (!atom) return { mode: "raw", expr: trimmed };
    atoms.push(atom);
  }

  return { mode: "guided", group: { operator: sep, atoms } };
}

// ---------------------------------------------------------------------------
// Full brain decompilation
// ---------------------------------------------------------------------------

export function decompileBrain(src: BrainSource): VisualBrain {
  const goals: VisualGoal[] = (src.goals.goals ?? []).map((g) => ({
    id: g.id,
    priority: g.priority,
    description: (g as { description?: string }).description ?? "",
    activeWhen: (g as { activeWhen?: string }).activeWhen ?? "",
  }));

  const states: VisualState[] = (src.states.states ?? []).map((s) => ({
    id: s.id,
    description: (s as { description?: string }).description ?? "",
  }));

  const rawFunctions = (src.functions.functions ?? []) as {
    id: string;
    action?: string;
    steps?: string[];
    description?: string;
  }[];

  // Every single-action wrapper is a core or world-module primitive. User
  // functions are the multi-step definitions composed from those wrappers.
  const functions: VisualFunction[] = rawFunctions.map((f) => ({
    id: f.id,
    description: f.description ?? "",
    action: f.action,
    steps: f.steps,
    isBuiltIn: f.action !== undefined,
  }));

  const rawRules = (src.rules.rules ?? []) as {
    id: string;
    state?: string;
    when: string;
    do: string;
    setState?: string;
    priority?: number;
    description?: string;
  }[];

  // Preserve file order. It is the engine's `if / else-if / else` flow order.
  const rules: VisualRule[] = rawRules.map((r, index) => ({
    id: r.id,
    state: r.state ?? null,
    condition: decompileCondition(r.when),
    functionId: r.do,
    setState: r.setState ?? null,
    priority: r.priority ?? rawRules.length - index,
    description: r.description ?? "",
  }));

  const derived = (src.conditions?.conditions ?? []).map((c) => ({
    id: c.id,
    expr: c.expr,
    description: c.description ?? "",
  }));

  return {
    goals,
    initial: src.states.initial,
    states,
    rules,
    ruleFolders: [],
    functions,
    derived,
    memory: src.memory as Record<string, unknown>,
    controllerMode: "visual",
  };
}
